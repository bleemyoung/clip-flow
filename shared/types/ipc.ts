import type { ClipboardHistorySnapshot, ClipboardItem } from './domain'

export interface AppMeta {
  name: string
  version: string
}

export type ClipboardHistoryListener = (snapshot: ClipboardHistorySnapshot) => void

export interface AppShellApi {
  getAppMeta: () => AppMeta
  getClipboardHistory: () => Promise<ClipboardHistorySnapshot>
  copyText: (text: string) => Promise<void>
  copyClipboardItem: (id: string) => Promise<void>
  togglePinClipboardItem: (id: string) => Promise<ClipboardItem[]>
  deleteClipboardItem: (id: string) => Promise<ClipboardItem[]>
  clearNormalClipboardItems: () => Promise<ClipboardItem[]>
  onClipboardHistoryChanged: (listener: ClipboardHistoryListener) => () => void
}
