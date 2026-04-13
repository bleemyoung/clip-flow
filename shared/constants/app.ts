export const APP_NAME = 'ClipFlow'
export const CLIPBOARD_HISTORY_LIMIT = 50
export const CLIPBOARD_POLLING_INTERVAL = 1000

export const WINDOW_CONFIG = {
  width: 1280,
  height: 820,
  minWidth: 1040,
  minHeight: 720
} as const

export const MODULE_TABS = [
  { key: 'clipboard', label: 'Clipboard' },
  { key: 'transform', label: 'Transform' },
  { key: 'snippets', label: 'Snippets' }
] as const

export const TRANSFORM_ACTIONS = [
  { key: 'trim', label: 'Trim' },
  { key: 'single-line', label: 'To Single Line' },
  { key: 'split-lines', label: 'Split By Line' },
  { key: 'split-comma', label: 'Split By Comma' },
  { key: 'upper-case', label: 'Uppercase' },
  { key: 'lower-case', label: 'Lowercase' },
  { key: 'json-format', label: 'Format JSON' },
  { key: 'json-minify', label: 'Minify JSON' }
] as const
