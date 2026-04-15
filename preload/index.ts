import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { AppShellApi } from '@shared/types/ipc'

const api: AppShellApi = {
  getAppMeta() {
    return {
      name: 'ClipFlow',
      version: '0.1.0'
    }
  },
  getClipboardHistory() {
    return ipcRenderer.invoke(IPC_CHANNELS.clipboardGetHistory)
  },
  copyText(text) {
    return ipcRenderer.invoke(IPC_CHANNELS.textCopy, text)
  },
  copyClipboardItem(id) {
    return ipcRenderer.invoke(IPC_CHANNELS.clipboardCopyItem, id)
  },
  togglePinClipboardItem(id) {
    return ipcRenderer.invoke(IPC_CHANNELS.clipboardTogglePin, id)
  },
  deleteClipboardItem(id) {
    return ipcRenderer.invoke(IPC_CHANNELS.clipboardDeleteItem, id)
  },
  clearNormalClipboardItems() {
    return ipcRenderer.invoke(IPC_CHANNELS.clipboardClearNormal)
  },
  onClipboardHistoryChanged(listener) {
    const wrappedListener = (_event: unknown, snapshot: Parameters<typeof listener>[0]) => {
      listener(snapshot)
    }

    ipcRenderer.on(IPC_CHANNELS.clipboardHistoryChanged, wrappedListener)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.clipboardHistoryChanged, wrappedListener)
    }
  }
}

contextBridge.exposeInMainWorld('clipflow', api)
