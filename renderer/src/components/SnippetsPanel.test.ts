// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SnippetsPanel from './SnippetsPanel.vue'

const initialSnippet = {
  id: 'snippet-1',
  title: 'Daily update',
  content: 'Progress',
  createdAt: '2026-07-01 09:00:00',
  updatedAt: '2026-07-02 09:00:00'
}

const linkedSnippet = {
  ...initialSnippet,
  cloud: {
    remoteId: 'remote-1',
    uploadedTitle: initialSnippet.title,
    uploadedContent: initialSnippet.content
  }
}

const clipflowMock = {
  getSnippets: vi.fn(),
  createSnippet: vi.fn(),
  updateSnippet: vi.fn(),
  deleteSnippet: vi.fn(),
  copySnippet: vi.fn(),
  uploadSnippet: vi.fn()
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === label)

  if (!button) {
    throw new Error(`Button not found: ${label}`)
  }

  return button
}

describe('SnippetsPanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'clipflow', {
      configurable: true,
      value: clipflowMock
    })
    clipflowMock.getSnippets.mockResolvedValue([initialSnippet])
    clipflowMock.createSnippet.mockResolvedValue([
      {
        ...initialSnippet,
        id: 'snippet-2',
        title: 'New snippet',
        content: 'New content',
        updatedAt: '2026-07-03 09:00:00'
      },
      initialSnippet
    ])
    clipflowMock.updateSnippet.mockResolvedValue([
      {
        ...initialSnippet,
        title: 'Updated snippet',
        content: 'Updated content',
        updatedAt: '2026-07-03 09:00:00'
      }
    ])
    clipflowMock.deleteSnippet.mockResolvedValue([])
    clipflowMock.copySnippet.mockResolvedValue(undefined)
    clipflowMock.uploadSnippet.mockResolvedValue({ ok: true, items: [linkedSnippet] })
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads saved snippets and creates a new snippet through the shared bridge', async () => {
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('Daily update')
    await findButton(wrapper, 'New Snippet').trigger('click')
    await wrapper.get('input[type="text"]').setValue('New snippet')
    await wrapper.get('textarea').setValue('New content')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(clipflowMock.createSnippet).toHaveBeenCalledWith({
      title: 'New snippet',
      content: 'New content'
    })
    expect(wrapper.text()).toContain('New snippet')
  })

  it('edits, confirms deletion, and copies a saved snippet through the shared bridge', async () => {
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    await findButton(wrapper, 'Edit').trigger('click')
    await wrapper.get('input[type="text"]').setValue('Updated snippet')
    await wrapper.get('textarea').setValue('Updated content')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(clipflowMock.updateSnippet).toHaveBeenCalledWith('snippet-1', {
      title: 'Updated snippet',
      content: 'Updated content'
    })

    await findButton(wrapper, 'Copy').trigger('click')
    await flushPromises()
    expect(clipflowMock.copySnippet).toHaveBeenCalledWith('snippet-1')
    expect(wrapper.text()).toContain('已复制片段')

    await findButton(wrapper, 'Delete').trigger('click')
    await flushPromises()
    expect(window.confirm).toHaveBeenCalled()
    expect(clipflowMock.deleteSnippet).toHaveBeenCalledWith('snippet-1')
  })

  it('disables conflicting actions while a form save is in progress', async () => {
    let resolveSave: ((value: typeof initialSnippet[]) => void) | undefined
    clipflowMock.createSnippet.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve
      })
    )
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    await findButton(wrapper, 'New Snippet').trigger('click')
    await wrapper.get('input[type="text"]').setValue('Pending snippet')
    await wrapper.get('textarea').setValue('Pending content')
    await wrapper.get('form').trigger('submit.prevent')

    expect(findButton(wrapper, 'New Snippet').attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, 'Copy').attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, 'Edit').attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, 'Delete').attributes('disabled')).toBeDefined()

    resolveSave?.([initialSnippet])
    await flushPromises()
  })

  it('uploads only a saved snippet, then manually updates the same association after editing', async () => {
    const dirty = { ...linkedSnippet, title: 'Changed title', content: 'Changed body' }
    clipflowMock.updateSnippet.mockResolvedValueOnce([dirty])
    clipflowMock.uploadSnippet.mockResolvedValueOnce({ ok: true, items: [linkedSnippet] })
      .mockResolvedValueOnce({ ok: true, items: [
        { ...dirty, cloud: {
          ...linkedSnippet.cloud,
          uploadedTitle: dirty.title,
          uploadedContent: dirty.content
        } }
      ] })
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('未上云')
    await findButton(wrapper, '上云').trigger('click')
    await flushPromises()
    expect(clipflowMock.uploadSnippet).toHaveBeenCalledExactlyOnceWith('snippet-1')
    expect(wrapper.text()).toContain('已上云')
    expect(findButton(wrapper, '更新到云端').attributes('disabled')).toBeDefined()

    await findButton(wrapper, 'Edit').trigger('click')
    await wrapper.get('input[type="text"]').setValue(dirty.title)
    await wrapper.get('textarea').setValue(dirty.content)
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('有未上传修改')
    expect(wrapper.text()).not.toContain('已保存到后端')
    expect(clipflowMock.uploadSnippet).toHaveBeenCalledTimes(1)

    await findButton(wrapper, '更新到云端').trigger('click')
    await flushPromises()
    expect(clipflowMock.uploadSnippet).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('已保存到后端')
    expect(wrapper.text()).toContain('已上云')
  })

  it('shows a persisted uncertain creation and keeps its error after a failed retry', async () => {
    const pending = { ...initialSnippet, pendingCreate: {
      requestKey: 'request-1', title: initialSnippet.title, content: initialSnippet.content
    } }
    clipflowMock.getSnippets.mockResolvedValue([pending])
    clipflowMock.uploadSnippet.mockResolvedValueOnce({
      ok: false, items: [pending], message: '请求超时，结果未确认，请手动重试'
    })
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('上次创建结果未确认')
    await findButton(wrapper, '上云').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('请求超时，结果未确认')
    expect(wrapper.text()).toContain('Daily update')
  })

  it('locks the target edit form and deletion during an upload', async () => {
    let resolveUpload: ((value: { ok: true; items: typeof linkedSnippet[] }) => void) | undefined
    clipflowMock.uploadSnippet.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    await findButton(wrapper, 'Edit').trigger('click')
    await wrapper.get('input[type="text"]').setValue('Unsaved draft')
    await findButton(wrapper, '上云').trigger('click')
    expect(wrapper.get('input[type="text"]').attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, 'Delete').attributes('disabled')).toBeDefined()
    expect(findButton(wrapper, '上云中…').attributes('disabled')).toBeDefined()
    expect(clipflowMock.uploadSnippet).toHaveBeenCalledExactlyOnceWith('snippet-1')

    resolveUpload?.({ ok: true, items: [linkedSnippet] })
    await flushPromises()
    expect(wrapper.get('input[type="text"]').element.value).toBe('Unsaved draft')
    expect(wrapper.text()).toContain('已上云')
  })

  it('restores uploaded status when local content returns to the last uploaded snapshot', async () => {
    clipflowMock.getSnippets.mockResolvedValue([{
      ...linkedSnippet, content: 'Temporary change'
    }])
    clipflowMock.updateSnippet.mockResolvedValueOnce([linkedSnippet])
    const wrapper = mount(SnippetsPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('有未上传修改')
    await findButton(wrapper, 'Edit').trigger('click')
    await wrapper.get('textarea').setValue(linkedSnippet.content)
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('已上云')
    expect(findButton(wrapper, '更新到云端').attributes('disabled')).toBeDefined()
    expect(clipflowMock.uploadSnippet).not.toHaveBeenCalled()
  })
})
