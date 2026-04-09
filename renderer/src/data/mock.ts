import type { ClipboardItem, SnippetItem } from '@shared/types/domain'

export const mockClipboardItems: ClipboardItem[] = [
  {
    id: 'clip-1',
    content: 'https://example.com/dashboard?id=10086',
    createdAt: '2026-04-09 20:15',
    updatedAt: '2026-04-09 20:15',
    pinned: true
  },
  {
    id: 'clip-2',
    content: 'SELECT * FROM clip_records WHERE pinned = 1;',
    createdAt: '2026-04-09 19:48',
    updatedAt: '2026-04-09 19:48',
    pinned: false
  },
  {
    id: 'clip-3',
    content: '前端联调时先确认字段命名、空态和异常提示。',
    createdAt: '2026-04-09 18:26',
    updatedAt: '2026-04-09 18:26',
    pinned: false
  }
]

export const mockSnippets: SnippetItem[] = [
  {
    id: 'snippet-1',
    title: '日报模板',
    content: '今日进展：\\n1. \\n2. \\n风险：\\n下一步：',
    createdAt: '2026-04-08 10:00',
    updatedAt: '2026-04-09 09:30'
  },
  {
    id: 'snippet-2',
    title: '接口联调说明',
    content: '请以后端实际返回字段、错误码和分页结构为准。',
    createdAt: '2026-04-08 11:10',
    updatedAt: '2026-04-08 11:10'
  }
]
