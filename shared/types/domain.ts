export interface ClipboardItem {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  pinned: boolean
}

export interface ClipboardHistorySnapshot {
  items: ClipboardItem[]
  limit: number
  pollingInterval: number
}

export interface SnippetItem {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type TransformActionKey =
  | 'trim'
  | 'single-line'
  | 'split-lines'
  | 'split-comma'
  | 'upper-case'
  | 'lower-case'
  | 'json-format'
  | 'json-minify'

export interface TransformAction {
  key: TransformActionKey
  label: string
}
