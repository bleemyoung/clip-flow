export const APP_NAME = 'ClipFlow'

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
  { key: 'single-line', label: '多行转单行' },
  { key: 'split-lines', label: '按行拆分' },
  { key: 'split-comma', label: '按逗号拆分' },
  { key: 'upper-case', label: '转大写' },
  { key: 'lower-case', label: '转小写' },
  { key: 'json-format', label: 'JSON 格式化' },
  { key: 'json-minify', label: 'JSON 压缩' }
] as const
