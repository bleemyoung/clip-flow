import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SnippetDraft } from '@shared/types/domain'

const electronMock = vi.hoisted(() => ({ userDataPath: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronMock.userDataPath },
  clipboard: { writeText: vi.fn() }
}))

import { SnippetService } from './snippet-service'

const remoteId = '71d3b6ce-d6be-40d0-9d48-008f3abb9a2e'
const remoteTime = '2026-10-31T08:00:00Z'

function backendResponse(draft: SnippetDraft, status: number): Response {
  return new Response(JSON.stringify({
    id: remoteId,
    title: draft.title,
    content: draft.content,
    createdAt: remoteTime,
    updatedAt: remoteTime
  }), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('SnippetService manual upload', () => {
  let userDataPath: string
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), 'clipflow-upload-'))
    electronMock.userDataPath = userDataPath
    fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const draft = JSON.parse(options.body as string) as SnippetDraft
      return backendResponse(draft, options.headers && 'Idempotency-Key' in options.headers ? 201 : 200)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    await rm(userDataPath, { recursive: true, force: true })
  })

  it('loads an old JSON record, saves a keyed association, and keeps local business fields unchanged', async () => {
    const original = {
      id: 'local-1', title: '  Greeting  ', content: 'Hello\nWorld',
      createdAt: '2026-07-01 09:00:00', updatedAt: '2026-07-02 09:00:00'
    }
    await writeFile(join(userDataPath, 'snippets.json'), JSON.stringify([original]))
    const service = new SnippetService()
    await service.initialize()

    const [uploaded] = await service.uploadSnippet(original.id)
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8080/api/snippets')
    expect(options.headers).toMatchObject({ 'Idempotency-Key': expect.any(String) })
    expect(JSON.parse(options.body as string)).toEqual({ title: 'Greeting', content: 'Hello\nWorld' })
    expect(uploaded).toMatchObject({ ...original, cloud: {
      remoteId, uploadedTitle: 'Greeting', uploadedContent: 'Hello\nWorld'
    } })
    expect(uploaded.pendingCreate).toBeUndefined()

    const restarted = new SnippetService()
    await restarted.initialize()
    expect(restarted.getItems()).toEqual([uploaded])
    await restarted.uploadSnippet(original.id)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('retries an uncertain creation with the persisted key and original snapshot after local edits', async () => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'First', content: 'original body' })
    fetchMock.mockRejectedValueOnce(new Error('connection lost'))

    await expect(service.uploadSnippet(local.id)).rejects.toThrow('结果未确认')
    const [pending] = JSON.parse(await readFile(join(userDataPath, 'snippets.json'), 'utf8'))
    expect(pending.pendingCreate).toMatchObject({
      requestKey: expect.any(String), title: 'First', content: 'original body'
    })

    const restarted = new SnippetService()
    await restarted.initialize()
    await restarted.updateSnippet(local.id, { title: 'Changed', content: 'new body' })
    const [confirmed] = await restarted.uploadSnippet(local.id)
    const firstOptions = fetchMock.mock.calls[0][1] as RequestInit
    const retryOptions = fetchMock.mock.calls[1][1] as RequestInit
    expect(retryOptions.headers).toEqual(firstOptions.headers)
    expect(retryOptions.body).toBe(firstOptions.body)
    expect(confirmed).toMatchObject({
      title: 'Changed', content: 'new body',
      cloud: { remoteId, uploadedTitle: 'First', uploadedContent: 'original body' }
    })
    expect(confirmed.pendingCreate).toBeUndefined()

    const [updated] = await restarted.uploadSnippet(local.id)
    expect(fetchMock.mock.calls[2][0]).toBe(`http://127.0.0.1:8080/api/snippets/${remoteId}/update`)
    expect(updated.cloud).toMatchObject({ uploadedTitle: 'Changed', uploadedContent: 'new body' })
    expect(updated.updatedAt).toBe(confirmed.updatedAt)
    expect(updated.id).toBe(local.id)
  })

  it('reuses one remote creation when the first response is lost after the backend commits', async () => {
    const committed = new Map<string, SnippetDraft>()
    let loseResponse = true
    fetchMock.mockImplementation(async (_url: string, options: RequestInit) => {
      const key = (options.headers as Record<string, string>)['Idempotency-Key']
      const draft = JSON.parse(options.body as string) as SnippetDraft
      if (!committed.has(key)) {
        committed.set(key, draft)
      }
      if (loseResponse) {
        loseResponse = false
        throw new Error('response lost after commit')
      }
      return backendResponse(committed.get(key) as SnippetDraft, 201)
    })

    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'Only one', content: 'body' })
    await expect(service.uploadSnippet(local.id)).rejects.toThrow('结果未确认')

    const restarted = new SnippetService()
    await restarted.initialize()
    const [confirmed] = await restarted.uploadSnippet(local.id)
    expect(committed.size).toBe(1)
    expect(fetchMock.mock.calls[1][1].headers).toEqual(fetchMock.mock.calls[0][1].headers)
    expect(confirmed.cloud?.remoteId).toBe(remoteId)
  })

  it('deduplicates an in-flight request and blocks target edits or deletion', async () => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'Pending', content: 'body' })
    let resolveRequest: ((response: Response) => void) | undefined
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))

    const first = service.uploadSnippet(local.id)
    const second = service.uploadSnippet(local.id)
    expect(second).toBe(first)
    await expect(service.updateSnippet(local.id, { title: 'Changed', content: 'body' }))
      .rejects.toThrow('正在上云')
    await expect(service.deleteSnippet(local.id)).rejects.toThrow('正在上云')

    resolveRequest?.(backendResponse({ title: 'Pending', content: 'body' }, 201))
    await Promise.all([first, second])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps an associated snippet after a 404 and rejects overlong titles before HTTP', async () => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'First', content: 'body' })
    await service.uploadSnippet(local.id)
    await service.updateSnippet(local.id, { title: 'Changed', content: 'body' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))

    await expect(service.uploadSnippet(local.id)).rejects.toThrow('后端记录不存在')
    expect(service.getItems()[0].cloud).toMatchObject({ uploadedTitle: 'First' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [longTitle] = await service.createSnippet({ title: 'x'.repeat(256), content: 'body' })
    await expect(service.uploadSnippet(longTitle.id)).rejects.toThrow('255')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never calls the backend when a linked snippet is locally deleted', async () => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'Local', content: 'body' })
    await service.uploadSnippet(local.id)
    fetchMock.mockClear()

    expect(await service.deleteSnippet(local.id)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the last confirmed snapshot when an update result is uncertain', async () => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'Local', content: 'first' })
    await service.uploadSnippet(local.id)
    await service.updateSnippet(local.id, { title: 'Local', content: 'second' })
    fetchMock.mockRejectedValueOnce(new Error('connection lost'))

    await expect(service.uploadSnippet(local.id)).rejects.toThrow('结果未确认')
    expect(service.getItems()[0]).toMatchObject({
      content: 'second', cloud: { remoteId, uploadedContent: 'first' }
    })

    const restarted = new SnippetService()
    await restarted.initialize()
    const [updated] = await restarted.uploadSnippet(local.id)
    expect(fetchMock.mock.calls[1][0]).toBe(`http://127.0.0.1:8080/api/snippets/${remoteId}/update`)
    expect(fetchMock.mock.calls[2][0]).toBe(fetchMock.mock.calls[1][0])
    expect(updated.cloud?.uploadedContent).toBe('second')
  })

  it.each([
    [400, '拒绝'],
    [409, '冲突']
  ])('keeps a pending create after backend status %i', async (status, message) => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'Local', content: 'body' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status }))

    await expect(service.uploadSnippet(local.id)).rejects.toThrow(message)
    expect(service.getItems()[0].pendingCreate?.requestKey).toBeTruthy()
    expect(service.getItems()[0].cloud).toBeUndefined()
  })

  it('times out without discarding its persisted creation request', async () => {
    const service = new SnippetService()
    await service.initialize()
    const [local] = await service.createSnippet({ title: 'Timeout', content: 'body' })
    fetchMock.mockImplementationOnce((_url: string, options: RequestInit) =>
      new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })
    )
    const originalSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay, ...args) =>
      originalSetTimeout(callback, delay === 5000 ? 1 : delay, ...args)
    )

    const upload = service.uploadSnippet(local.id)
    await expect(upload).rejects.toThrow('请求超时')
    expect(service.getItems()[0].pendingCreate?.requestKey).toBeTruthy()
  })
})
