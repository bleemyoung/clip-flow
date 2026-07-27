import type { ClipboardHistorySnapshot, ClipboardItem, SnippetDraft, SnippetItem } from './domain'

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
  getSnippets: () => Promise<SnippetItem[]>
  createSnippet: (draft: SnippetDraft) => Promise<SnippetItem[]>
  updateSnippet: (id: string, draft: SnippetDraft) => Promise<SnippetItem[]>
  deleteSnippet: (id: string) => Promise<SnippetItem[]>
  copySnippet: (id: string) => Promise<void>
}
