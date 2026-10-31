import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMock = vi.hoisted(() => ({ userDataPath: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => electronMock.userDataPath },
  clipboard: { readText: () => '', writeText: vi.fn() }
}))

import { ClipboardHistoryService } from './clipboard-history'
import { SnippetService } from './snippet-service'

describe('clipboard history and snippets remain independent', () => {
  let userDataPath: string
  const historyServices: ClipboardHistoryService[] = []

  beforeEach(async () => {
    userDataPath = await mkdtemp(join(tmpdir(), 'clipflow-save-as-'))
    electronMock.userDataPath = userDataPath
  })

  afterEach(async () => {
    historyServices.forEach((service) => service.dispose())
    historyServices.length = 0
    await rm(userDataPath, { recursive: true, force: true })
  })

  it('retains a saved snippet after its source is deleted, history is limited, and normal history is cleared', async () => {
    const source = {
      id: 'source',
      content: 'Keep this\n  exact text',
      createdAt: '2026-07-03 10:00:00',
      updatedAt: '2026-07-03 10:00:00',
      pinned: false
    }
    await writeFile(join(userDataPath, 'clipboard-history.json'), JSON.stringify([source]))

    const history = new ClipboardHistoryService()
    historyServices.push(history)
    await history.initialize()
    const original = history.getSnapshot().items[0]

    const snippets = new SnippetService()
    await snippets.initialize()
    const [saved] = await snippets.createSnippet({ title: 'Saved', content: original.content })

    expect(saved.id).not.toBe(original.id)
    expect(original).toEqual(source)
    await history.deleteItem(source.id)
    expect(history.getSnapshot().items).toEqual([])
    expect(snippets.getItems()).toEqual([saved])

    const manyItems = Array.from({ length: 51 }, (_, index) => ({
      ...source,
      id: `history-${index}`,
      content: `History ${index}`,
      updatedAt: `2026-07-04 10:${String(index).padStart(2, '0')}:00`
    }))
    history.dispose()
    await writeFile(join(userDataPath, 'clipboard-history.json'), JSON.stringify(manyItems))

    const reloadedHistory = new ClipboardHistoryService()
    historyServices.push(reloadedHistory)
    await reloadedHistory.initialize()
    expect(reloadedHistory.getSnapshot().items).toHaveLength(50)
    await reloadedHistory.clearNormalItems()
    expect(reloadedHistory.getSnapshot().items).toEqual([])

    const reloadedSnippets = new SnippetService()
    await reloadedSnippets.initialize()
    expect(reloadedSnippets.getItems()).toEqual([saved])
  })
})
