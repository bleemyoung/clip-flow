import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMock = vi.hoisted(() => ({
  userDataPath: '',
  writeText: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => electronMock.userDataPath)
  },
  clipboard: {
    writeText: electronMock.writeText
  }
}))

import { SnippetService } from './snippet-service'

describe('SnippetService', () => {
  let userDataPath: string

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), 'clipflow-snippets-'))
    electronMock.userDataPath = userDataPath
    electronMock.writeText.mockReset()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await rm(userDataPath, { force: true, recursive: true })
  })

  it('loads persisted snippets ordered by most recent update', async () => {
    await writeFile(
      join(userDataPath, 'snippets.json'),
      JSON.stringify([
        {
          id: 'older',
          title: 'Older snippet',
          content: 'Older content',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-01 09:00:00'
        },
        {
          id: 'newer',
          title: 'Newer snippet',
          content: 'Newer content',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-02 09:00:00'
        }
      ])
    )
    const service = new SnippetService()

    await service.initialize()

    expect(service.getItems().map((item) => item.id)).toEqual(['newer', 'older'])
  })

  it('starts with an empty list when persisted snippet data is invalid', async () => {
    await writeFile(join(userDataPath, 'snippets.json'), '{not json')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const service = new SnippetService()

    await service.initialize()

    expect(service.getItems()).toEqual([])
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('creates a valid snippet and restores it after a new service starts', async () => {
    const service = new SnippetService()
    await service.initialize()

    const items = await service.createSnippet({
      title: 'Daily update',
      content: 'Progress:\nRisks:'
    })
    const restoredService = new SnippetService()

    await restoredService.initialize()

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: 'Daily update',
      content: 'Progress:\nRisks:'
    })
    expect(JSON.parse(await readFile(join(userDataPath, 'snippets.json'), 'utf8'))).toEqual(items)
    expect(restoredService.getItems()).toEqual(items)
  })

  it('places a rapidly created snippet above an older snippet', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T09:00:00.000Z'))
    const service = new SnippetService()
    await service.initialize()

    await service.createSnippet({ title: 'Older', content: 'Older content' })
    await service.createSnippet({ title: 'Newer', content: 'Newer content' })

    expect(service.getItems().map((item) => item.title)).toEqual(['Newer', 'Older'])
  })

  it.each([
    { title: '   ', content: 'Valid content' },
    { title: 'Valid title', content: '\n  ' }
  ])('rejects a snippet with blank required fields', async (draft) => {
    const service = new SnippetService()
    await service.initialize()

    await expect(service.createSnippet(draft)).rejects.toThrow('Snippet title and content are required.')
    expect(service.getItems()).toEqual([])
  })

  it('updates a snippet and moves it to the top of the list', async () => {
    await writeFile(
      join(userDataPath, 'snippets.json'),
      JSON.stringify([
        {
          id: 'first',
          title: 'First',
          content: 'First content',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-02 09:00:00'
        },
        {
          id: 'second',
          title: 'Second',
          content: 'Second content',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-01 09:00:00'
        }
      ])
    )
    const service = new SnippetService()
    await service.initialize()

    const items = await service.updateSnippet('second', {
      title: 'Updated second',
      content: 'Updated content'
    })

    expect(items.map((item) => item.id)).toEqual(['second', 'first'])
    expect(items[0]).toMatchObject({
      title: 'Updated second',
      content: 'Updated content'
    })
  })

  it('deletes an existing snippet and leaves other snippets intact', async () => {
    await writeFile(
      join(userDataPath, 'snippets.json'),
      JSON.stringify([
        {
          id: 'remove-me',
          title: 'Remove me',
          content: 'Remove me',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-01 09:00:00'
        },
        {
          id: 'keep-me',
          title: 'Keep me',
          content: 'Keep me',
          createdAt: '2026-07-02 09:00:00',
          updatedAt: '2026-07-02 09:00:00'
        }
      ])
    )
    const service = new SnippetService()
    await service.initialize()

    const items = await service.deleteSnippet('remove-me')

    expect(items.map((item) => item.id)).toEqual(['keep-me'])
  })

  it('copies snippet content without changing its update time', async () => {
    await writeFile(
      join(userDataPath, 'snippets.json'),
      JSON.stringify([
        {
          id: 'copy-me',
          title: 'Copy me',
          content: 'Copy this content',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-02 09:00:00'
        }
      ])
    )
    const service = new SnippetService()
    await service.initialize()
    const updatedAt = service.getItems()[0].updatedAt

    await service.copySnippet('copy-me')

    expect(electronMock.writeText).toHaveBeenCalledWith('Copy this content')
    expect(service.getItems()[0].updatedAt).toBe(updatedAt)
  })

  it('keeps local data unchanged when copying fails', async () => {
    await writeFile(
      join(userDataPath, 'snippets.json'),
      JSON.stringify([
        {
          id: 'copy-fails',
          title: 'Copy fails',
          content: 'Copy this content',
          createdAt: '2026-07-01 09:00:00',
          updatedAt: '2026-07-02 09:00:00'
        }
      ])
    )
    electronMock.writeText.mockImplementationOnce(() => {
      throw new Error('Clipboard unavailable')
    })
    const service = new SnippetService()
    await service.initialize()
    const itemsBeforeCopy = service.getItems()

    await expect(service.copySnippet('copy-fails')).rejects.toThrow('Clipboard unavailable')

    expect(service.getItems()).toEqual(itemsBeforeCopy)
  })
})
