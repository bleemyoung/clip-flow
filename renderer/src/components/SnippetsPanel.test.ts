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

const clipflowMock = {
  getSnippets: vi.fn(),
  createSnippet: vi.fn(),
  updateSnippet: vi.fn(),
  deleteSnippet: vi.fn(),
  copySnippet: vi.fn()
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
})
