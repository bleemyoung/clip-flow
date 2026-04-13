import { app, clipboard } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { CLIPBOARD_HISTORY_LIMIT, CLIPBOARD_POLLING_INTERVAL } from '@shared/constants/app'
import type { ClipboardHistorySnapshot, ClipboardItem } from '@shared/types/domain'

const HISTORY_FILE_NAME = 'clipboard-history.json'

function formatTimestamp(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function parseTimestamp(timestamp: string): number {
  return new Date(timestamp.replace(' ', 'T')).getTime()
}

function sortItems(items: ClipboardItem[]): ClipboardItem[] {
  const pinnedItems = items
    .filter((item) => item.pinned)
    .sort((a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt))
  const normalItems = items
    .filter((item) => !item.pinned)
    .sort((a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt))

  return [...pinnedItems, ...normalItems]
}

function sanitizeItems(items: ClipboardItem[]): ClipboardItem[] {
  const deduplicated: ClipboardItem[] = []
  const seenContent = new Set<string>()

  for (const item of sortItems(items)) {
    if (typeof item.content !== 'string' || !item.content.trim()) {
      continue
    }

    if (seenContent.has(item.content)) {
      continue
    }

    seenContent.add(item.content)
    deduplicated.push({
      id: item.id || randomUUID(),
      content: item.content,
      createdAt: item.createdAt || item.updatedAt || formatTimestamp(),
      updatedAt: item.updatedAt || item.createdAt || formatTimestamp(),
      pinned: Boolean(item.pinned)
    })
  }

  const pinnedItems = deduplicated.filter((item) => item.pinned)
  const normalItems = deduplicated
    .filter((item) => !item.pinned)
    .slice(0, CLIPBOARD_HISTORY_LIMIT)

  return [...pinnedItems, ...normalItems]
}

export class ClipboardHistoryService {
  private readonly filePath = join(app.getPath('userData'), HISTORY_FILE_NAME)
  private items: ClipboardItem[] = []
  private pollTimer: NodeJS.Timeout | null = null
  private lastClipboardText = ''
  private ignoredClipboardText: string | null = null
  private changeListener: ((snapshot: ClipboardHistorySnapshot) => void) | null = null

  async initialize(): Promise<void> {
    this.items = await this.loadItems()
    this.lastClipboardText = clipboard.readText()
    this.startPolling()
  }

  dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  setOnChange(listener: (snapshot: ClipboardHistorySnapshot) => void): void {
    this.changeListener = listener
  }

  getSnapshot(): ClipboardHistorySnapshot {
    return {
      items: [...this.items],
      limit: CLIPBOARD_HISTORY_LIMIT,
      pollingInterval: CLIPBOARD_POLLING_INTERVAL
    }
  }

  async copyItem(id: string): Promise<void> {
    const target = this.items.find((item) => item.id === id)

    if (!target) {
      return
    }

    clipboard.writeText(target.content)
    this.ignoredClipboardText = target.content
    this.lastClipboardText = target.content
  }

  async togglePin(id: string): Promise<ClipboardItem[]> {
    const target = this.items.find((item) => item.id === id)

    if (!target) {
      return [...this.items]
    }

    target.pinned = !target.pinned
    target.updatedAt = formatTimestamp()
    await this.commit()
    return [...this.items]
  }

  async deleteItem(id: string): Promise<ClipboardItem[]> {
    const nextItems = this.items.filter((item) => item.id !== id)

    if (nextItems.length === this.items.length) {
      return [...this.items]
    }

    this.items = sortItems(nextItems)
    await this.commit()
    return [...this.items]
  }

  async clearNormalItems(): Promise<ClipboardItem[]> {
    this.items = this.items.filter((item) => item.pinned)
    await this.commit()
    return [...this.items]
  }

  private startPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
    }

    this.pollTimer = setInterval(() => {
      void this.captureClipboard()
    }, CLIPBOARD_POLLING_INTERVAL)
  }

  private async captureClipboard(): Promise<void> {
    const currentText = clipboard.readText()

    if (!currentText.trim() || currentText === this.lastClipboardText) {
      return
    }

    this.lastClipboardText = currentText

    if (this.ignoredClipboardText === currentText) {
      this.ignoredClipboardText = null
      return
    }

    const now = formatTimestamp()
    const existing = this.items.find((item) => item.content === currentText)

    if (existing) {
      existing.updatedAt = now
    } else {
      this.items.push({
        id: randomUUID(),
        content: currentText,
        createdAt: now,
        updatedAt: now,
        pinned: false
      })
    }

    await this.commit()
  }

  private async commit(): Promise<void> {
    this.items = sanitizeItems(this.items)
    await this.persistItems()
    this.changeListener?.(this.getSnapshot())
  }

  private async loadItems(): Promise<ClipboardItem[]> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(content) as ClipboardItem[]
      return sanitizeItems(Array.isArray(parsed) ? parsed : [])
    } catch {
      return []
    }
  }

  private async persistItems(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(this.items, null, 2), 'utf8')
  }
}
