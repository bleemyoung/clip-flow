// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClipboardHistorySnapshot } from '@shared/types/domain'
import ClipboardPanel from './ClipboardPanel.vue'

const initialSnapshot: ClipboardHistorySnapshot = {
  items: [
    {
      id: 'pinned-1',
      content: 'Pinned\n  second line',
      createdAt: '2026-07-01 09:00:00',
      updatedAt: '2026-07-02 09:00:00',
      pinned: true
    },
    {
      id: 'normal-1',
      content: 'Normal\n\nthird line',
      createdAt: '2026-07-01 10:00:00',
      updatedAt: '2026-07-02 10:00:00',
      pinned: false
    }
  ],
  limit: 50,
  pollingInterval: 1000
}

const clipflowMock = {
  getClipboardHistory: vi.fn(),
  onClipboardHistoryChanged: vi.fn(),
  copyClipboardItem: vi.fn(),
  togglePinClipboardItem: vi.fn(),
  deleteClipboardItem: vi.fn(),
  clearNormalClipboardItems: vi.fn(),
  createSnippet: vi.fn()
}

let historyChanged: ((snapshot: ClipboardHistorySnapshot) => void) | undefined
let wrapper: ReturnType<typeof mount> | undefined

function saveAsButton(index: number) {
  const buttons = wrapper?.findAll('button').filter((button) => button.text() === '另存为 Snippet')
  const button = buttons?.[index]

  if (!button) {
    throw new Error(`Save as Snippet button not found: ${index}`)
  }

  return button
}

describe('ClipboardPanel save as Snippet', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'clipflow', { configurable: true, value: clipflowMock })
    clipflowMock.getClipboardHistory.mockResolvedValue(initialSnapshot)
    clipflowMock.onClipboardHistoryChanged.mockImplementation((listener) => {
      historyChanged = listener
      return vi.fn()
    })
    clipflowMock.createSnippet.mockResolvedValue([])
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    historyChanged = undefined
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens from pinned and normal records with an editable multiline snapshot', async () => {
    wrapper = mount(ClipboardPanel)
    await flushPromises()

    await saveAsButton(0).trigger('click')
    expect(wrapper.get('input[type="text"]').element.value).toBe('')
    expect(wrapper.get('textarea').element.value).toBe('Pinned\n  second line')

    await saveAsButton(1).trigger('click')
    expect(wrapper.get('input[type="text"]').element.value).toBe('')
    expect(wrapper.get('textarea').element.value).toBe('Normal\n\nthird line')

    historyChanged?.({ ...initialSnapshot, items: [] })
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('Normal\n\nthird line')

    await wrapper.get('textarea').setValue('My edited content')
    historyChanged?.({ ...initialSnapshot, items: [] })
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('My edited content')
  })

  it('saves through the local snippet bridge without changing clipboard history or calling HTTP', async () => {
    wrapper = mount(ClipboardPanel)
    await flushPromises()

    await saveAsButton(1).trigger('click')
    await wrapper.get('input[type="text"]').setValue('Saved title')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(clipflowMock.createSnippet).toHaveBeenCalledExactlyOnceWith({
      title: 'Saved title',
      content: 'Normal\n\nthird line'
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('已保存到 Snippets')
    expect(wrapper.text()).toContain('Normal\n\nthird line')
    expect(clipflowMock.copyClipboardItem).not.toHaveBeenCalled()
    expect(clipflowMock.togglePinClipboardItem).not.toHaveBeenCalled()
    expect(clipflowMock.deleteClipboardItem).not.toHaveBeenCalled()
    expect(window.fetch).not.toHaveBeenCalled()
  })

  it('rejects blank fields and cancels without creating a snippet', async () => {
    wrapper = mount(ClipboardPanel)
    await flushPromises()

    await saveAsButton(0).trigger('click')
    await wrapper.get('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('标题和内容不能为空')
    expect(clipflowMock.createSnippet).not.toHaveBeenCalled()

    await wrapper.get('input[type="text"]').setValue('A title')
    await wrapper.get('textarea').setValue('  \n  ')
    await wrapper.get('form').trigger('submit.prevent')
    expect(clipflowMock.createSnippet).not.toHaveBeenCalled()

    await wrapper.findAll('button').find((button) => button.text() === 'Cancel')?.trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(clipflowMock.createSnippet).not.toHaveBeenCalled()
  })

  it('drops an unsubmitted form when the panel is left and permits another intentional save', async () => {
    wrapper = mount(ClipboardPanel)
    await flushPromises()
    await saveAsButton(0).trigger('click')
    await wrapper.get('input[type="text"]').setValue('Unsubmitted')
    wrapper.unmount()

    expect(clipflowMock.createSnippet).not.toHaveBeenCalled()

    wrapper = mount(ClipboardPanel)
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)

    for (let index = 0; index < 2; index += 1) {
      await saveAsButton(0).trigger('click')
      await wrapper.get('input[type="text"]').setValue('Repeated')
      await wrapper.get('form').trigger('submit.prevent')
      await flushPromises()
    }

    expect(clipflowMock.createSnippet).toHaveBeenCalledTimes(2)
  })

  it('blocks duplicate submissions and editing while a save is pending', async () => {
    let resolveSave: ((value: []) => void) | undefined
    clipflowMock.createSnippet.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
    wrapper = mount(ClipboardPanel)
    await flushPromises()

    await saveAsButton(0).trigger('click')
    await wrapper.get('input[type="text"]').setValue('Pending')
    await wrapper.get('form').trigger('submit.prevent')
    await wrapper.get('form').trigger('submit.prevent')

    expect(clipflowMock.createSnippet).toHaveBeenCalledTimes(1)
    expect(wrapper.get('input[type="text"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
    expect(saveAsButton(0).attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button').find((button) => button.text() === 'Cancel')?.attributes('disabled')).toBeDefined()

    resolveSave?.([])
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('keeps input after failure and permits a manual retry', async () => {
    clipflowMock.createSnippet.mockRejectedValueOnce(new Error('Disk write failed'))
    wrapper = mount(ClipboardPanel)
    await flushPromises()

    await saveAsButton(1).trigger('click')
    await wrapper.get('input[type="text"]').setValue('Retry title')
    await wrapper.get('textarea').setValue('Edited text')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Disk write failed')
    expect(wrapper.get('input[type="text"]').element.value).toBe('Retry title')
    expect(wrapper.get('textarea').element.value).toBe('Edited text')
    expect(wrapper.get('input[type="text"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(clipflowMock.createSnippet).toHaveBeenCalledTimes(2)
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
