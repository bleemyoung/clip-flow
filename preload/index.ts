import { contextBridge } from 'electron'
import type { AppShellApi } from '@shared/types/ipc'

const api: AppShellApi = {
  getAppMeta() {
    return {
      name: 'ClipFlow',
      version: '0.1.0'
    }
  }
}

contextBridge.exposeInMainWorld('clipflow', api)
