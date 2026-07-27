import { app, clipboard } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { SnippetDraft, SnippetItem } from '@shared/types/domain'

const SNIPPETS_FILE_NAME = 'snippets.json'

function formatTimestamp(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

function parseTimestamp(timestamp: string): number {
  const parsed = new Date(timestamp.replace(' ', 'T')).getTime()

  return Number.isNaN(parsed) ? 0 : parsed
}

function sortItems(items: SnippetItem[]): SnippetItem[] {
  return [...items].sort((a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt))
}

function isSnippetItem(value: unknown): value is SnippetItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as SnippetItem

  return Boolean(
    typeof item.id === 'string' &&
      item.id &&
      typeof item.createdAt === 'string' &&
      item.createdAt &&
      typeof item.updatedAt === 'string' &&
      item.updatedAt &&
      parseTimestamp(item.createdAt) > 0 &&
      parseTimestamp(item.updatedAt) > 0 &&
      typeof item.title === 'string' &&
      item.title.trim() &&
      typeof item.content === 'string' &&
      item.content.trim()
  )
}

function validateDraft(draft: SnippetDraft): void {
  if (!draft.title.trim() || !draft.content.trim()) {
    throw new Error('Snippet title and content are required.')
  }
}

export class SnippetService {
  private readonly filePath = join(app.getPath('userData'), SNIPPETS_FILE_NAME)
  private items: SnippetItem[] = []
  private latestTimestamp = 0
  private mutationQueue: Promise<void> = Promise.resolve()

  async initialize(): Promise<void> {
    this.items = await this.loadItems()
    this.latestTimestamp = this.items.reduce(
      (latest, item) => Math.max(latest, parseTimestamp(item.updatedAt)),
      0
    )
  }

  getItems(): SnippetItem[] {
    return [...this.items]
  }

  async createSnippet(draft: SnippetDraft): Promise<SnippetItem[]> {
    validateDraft(draft)

    return this.queueMutation(() => {
      const now = this.nextTimestamp()

      return sortItems([
        ...this.items,
        {
          id: randomUUID(),
          title: draft.title,
          content: draft.content,
          createdAt: now,
          updatedAt: now
        }
      ])
    })
  }

  async updateSnippet(id: string, draft: SnippetDraft): Promise<SnippetItem[]> {
    validateDraft(draft)
    return this.queueMutation(() => {
      if (!this.items.some((item) => item.id === id)) {
        return null
      }

      const updatedAt = this.nextTimestamp()

      return sortItems(
        this.items.map((item) =>
          item.id === id
            ? {
                ...item,
                title: draft.title,
                content: draft.content,
                updatedAt
              }
            : item
        )
      )
    })
  }

  async deleteSnippet(id: string): Promise<SnippetItem[]> {
    return this.queueMutation(() => {
      const nextItems = this.items.filter((item) => item.id !== id)

      return nextItems.length === this.items.length ? null : nextItems
    })
  }

  async copySnippet(id: string): Promise<void> {
    const target = this.items.find((item) => item.id === id)

    if (!target) {
      throw new Error('Snippet not found.')
    }

    clipboard.writeText(target.content)
  }

  private async loadItems(): Promise<SnippetItem[]> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(content) as unknown

      if (!Array.isArray(parsed)) {
        throw new Error('Snippet data must be an array.')
      }

      if (!parsed.every(isSnippetItem)) {
        throw new Error('Snippet data contains an invalid record.')
      }

      return sortItems(parsed)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to load snippets.', error)
      }

      return []
    }
  }

  private async persistItems(items: SnippetItem[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporaryFilePath = `${this.filePath}.tmp`

    await writeFile(temporaryFilePath, JSON.stringify(items, null, 2), 'utf8')
    await rename(temporaryFilePath, this.filePath)
  }

  private nextTimestamp(): string {
    this.latestTimestamp = Math.max(Date.now(), this.latestTimestamp + 1)

    return formatTimestamp(new Date(this.latestTimestamp))
  }

  private async queueMutation(operation: () => SnippetItem[] | null): Promise<SnippetItem[]> {
    const mutation = this.mutationQueue.then(async () => {
      const nextItems = operation()

      if (!nextItems) {
        return
      }

      await this.persistItems(nextItems)
      this.items = nextItems
    })

    this.mutationQueue = mutation.then(
      () => undefined,
      () => undefined
    )
    await mutation

    return this.getItems()
  }
}
