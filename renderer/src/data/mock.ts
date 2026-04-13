import type { SnippetItem } from '@shared/types/domain'

export const mockSnippets: SnippetItem[] = [
  {
    id: 'snippet-1',
    title: '日报模板',
    content: '今日进展：\n1. \n2. \n风险：\n下一步：',
    createdAt: '2026-04-08 10:00:00',
    updatedAt: '2026-04-09 09:30:00'
  },
  {
    id: 'snippet-2',
    title: '接口联调说明',
    content: '请以后端实际返回字段、错误码和分页结构为准。',
    createdAt: '2026-04-08 11:10:00',
    updatedAt: '2026-04-08 11:10:00'
  }
]
