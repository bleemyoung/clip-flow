import type { TransformActionKey } from '@shared/types/domain'

export function runTransform(action: TransformActionKey, input: string): string {
  switch (action) {
    case 'trim':
      return input.trim()
    case 'single-line':
      return input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ')
    case 'split-lines':
      return input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(',\n')
    case 'split-comma':
      return input
        .split(',')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n')
    case 'upper-case':
      return input.toUpperCase()
    case 'lower-case':
      return input.toLowerCase()
    case 'json-format':
      return JSON.stringify(JSON.parse(input), null, 2)
    case 'json-minify':
      return JSON.stringify(JSON.parse(input))
    default:
      return input
  }
}
