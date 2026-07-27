import { describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { AppShellApi } from '@shared/types/ipc'

const electronMock = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld
  },
  ipcRenderer: {
    invoke: electronMock.invoke,
    on: electronMock.on,
    removeListener: electronMock.removeListener
  }
}))

import './index'

describe('preload Snippet bridge', () => {
  it('exposes each Snippet intent through its IPC channel', async () => {
    const api = electronMock.exposeInMainWorld.mock.calls[0][1] as AppShellApi
    const draft = { title: 'Daily update', content: 'Progress' }

    await api.getSnippets()
    await api.createSnippet(draft)
    await api.updateSnippet('snippet-1', draft)
    await api.deleteSnippet('snippet-1')
    await api.copySnippet('snippet-1')

    expect(electronMock.invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.snippetGetAll)
    expect(electronMock.invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.snippetCreate, draft)
    expect(electronMock.invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.snippetUpdate, 'snippet-1', draft)
    expect(electronMock.invoke).toHaveBeenNthCalledWith(4, IPC_CHANNELS.snippetDelete, 'snippet-1')
    expect(electronMock.invoke).toHaveBeenNthCalledWith(5, IPC_CHANNELS.snippetCopy, 'snippet-1')
  })
})
