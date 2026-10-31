import type { SnippetDraft } from '@shared/types/domain'

const BACKEND_URL = 'http://127.0.0.1:8080'
const REQUEST_TIMEOUT_MS = 5000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BackendSnippet {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

function isBackendSnippet(value: unknown, draft: SnippetDraft, expectedId?: string): value is BackendSnippet {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Partial<BackendSnippet>
  return Boolean(
    typeof item.id === 'string' && UUID_PATTERN.test(item.id) &&
      (!expectedId || item.id === expectedId) &&
      item.title === draft.title && item.content === draft.content &&
      typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)) &&
      typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt))
  )
}

async function submit(path: string, draft: SnippetDraft, expectedStatus: number,
  requestKey?: string, expectedId?: string): Promise<BackendSnippet> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    let response: Response
    try {
      response = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestKey ? { 'Idempotency-Key': requestKey } : {})
        },
        body: JSON.stringify(draft),
        signal: controller.signal,
        redirect: 'error'
      })
    } catch {
      throw new Error(controller.signal.aborted
        ? '请求超时，结果未确认，请手动重试'
        : '无法连接后端，结果未确认，请手动重试')
    }

    if (response.status !== expectedStatus) {
      if (response.status === 400) {
        throw new Error('后端拒绝了标题或内容，请检查后重试')
      }
      if (response.status === 404) {
        throw new Error('后端记录不存在，本地片段已保留')
      }
      if (response.status === 409) {
        throw new Error('创建请求标识冲突，本地片段已保留')
      }
      throw new Error(`后端返回 ${response.status}，结果未确认，请手动重试`)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new Error(controller.signal.aborted
        ? '请求超时，结果未确认，请手动重试'
        : '后端响应无法读取，结果未确认，请手动重试')
    }

    if (!isBackendSnippet(payload, draft, expectedId)) {
      throw new Error('后端响应与提交内容不一致，结果未确认，请手动重试')
    }
    return payload
  } finally {
    clearTimeout(timeout)
  }
}

export function createBackendSnippet(draft: SnippetDraft, requestKey: string): Promise<BackendSnippet> {
  return submit('/api/snippets', draft, 201, requestKey)
}

export function updateBackendSnippet(id: string, draft: SnippetDraft): Promise<BackendSnippet> {
  return submit(`/api/snippets/${id}/update`, draft, 200, undefined, id)
}
