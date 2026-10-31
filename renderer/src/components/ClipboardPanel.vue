<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CLIPBOARD_HISTORY_LIMIT } from '@shared/constants/app'
import type { ClipboardHistorySnapshot, ClipboardItem } from '@shared/types/domain'

const items = ref<ClipboardItem[]>([])
const isLoading = ref(true)
const isActionPending = ref(false)
const isSaving = ref(false)
const isSaveFormOpen = ref(false)
const saveTitle = ref('')
const saveContent = ref('')
const saveError = ref('')
const saveFeedback = ref('')
const pollingInterval = ref(1000)

const pinnedItems = computed(() => items.value.filter((item) => item.pinned))
const normalItems = computed(() => items.value.filter((item) => !item.pinned))

let feedbackTimer: ReturnType<typeof setTimeout> | undefined

function openSaveForm(item: ClipboardItem): void {
  if (isSaving.value) {
    return
  }

  saveTitle.value = ''
  saveContent.value = item.content
  saveError.value = ''
  saveFeedback.value = ''
  isSaveFormOpen.value = true
}

function closeSaveForm(): void {
  if (isSaving.value) {
    return
  }

  isSaveFormOpen.value = false
  saveTitle.value = ''
  saveContent.value = ''
  saveError.value = ''
}

async function handleSaveAsSnippet(): Promise<void> {
  if (isSaving.value || !isSaveFormOpen.value) {
    return
  }

  if (!saveTitle.value.trim() || !saveContent.value.trim()) {
    saveError.value = '标题和内容不能为空'
    return
  }

  isSaving.value = true
  saveError.value = ''

  try {
    await window.clipflow.createSnippet({ title: saveTitle.value, content: saveContent.value })
    isSaving.value = false
    closeSaveForm()
    saveFeedback.value = '已保存到 Snippets'
    if (feedbackTimer) {
      clearTimeout(feedbackTimer)
    }
    feedbackTimer = setTimeout(() => {
      saveFeedback.value = ''
      feedbackTimer = undefined
    }, 2400)
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存片段失败，请重试'
  } finally {
    isSaving.value = false
  }
}

function applySnapshot(snapshot: ClipboardHistorySnapshot): void {
  items.value = snapshot.items
  pollingInterval.value = snapshot.pollingInterval
}

async function loadClipboardHistory(): Promise<void> {
  isLoading.value = true

  try {
    const snapshot = await window.clipflow.getClipboardHistory()
    applySnapshot(snapshot)
  } finally {
    isLoading.value = false
  }
}

async function handleCopy(id: string): Promise<void> {
  isActionPending.value = true

  try {
    await window.clipflow.copyClipboardItem(id)
  } finally {
    isActionPending.value = false
  }
}

async function handleTogglePin(id: string): Promise<void> {
  isActionPending.value = true

  try {
    items.value = await window.clipflow.togglePinClipboardItem(id)
  } finally {
    isActionPending.value = false
  }
}

async function handleDelete(id: string): Promise<void> {
  isActionPending.value = true

  try {
    items.value = await window.clipflow.deleteClipboardItem(id)
  } finally {
    isActionPending.value = false
  }
}

async function handleClearNormal(): Promise<void> {
  if (!normalItems.value.length) {
    return
  }

  if (!window.confirm('确认清空所有未置顶剪贴板记录吗？')) {
    return
  }

  isActionPending.value = true

  try {
    items.value = await window.clipflow.clearNormalClipboardItems()
  } finally {
    isActionPending.value = false
  }
}

let unsubscribe: (() => void) | undefined

onMounted(async () => {
  unsubscribe = window.clipflow.onClipboardHistoryChanged((snapshot) => {
    applySnapshot(snapshot)
  })

  await loadClipboardHistory()
})

onUnmounted(() => {
  unsubscribe?.()
  unsubscribe = undefined
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }
})
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <div>
        <h3>Clipboard History</h3>
        <p>仅记录文本内容，轮询间隔 {{ pollingInterval }}ms。</p>
      </div>
      <button
        class="ghost-button"
        :disabled="isActionPending || !normalItems.length"
        type="button"
        @click="handleClearNormal"
      >
        Clear Normal
      </button>
    </div>

    <section v-if="isSaveFormOpen" class="section-card">
      <div class="section-card__title">
        <span>另存为 Snippet</span>
      </div>
      <form class="snippet-form" @submit.prevent="handleSaveAsSnippet">
        <label class="form-field">
          <span>Title</span>
          <input v-model="saveTitle" class="text-input" type="text" :disabled="isSaving" />
        </label>
        <label class="form-field">
          <span>Content</span>
          <textarea v-model="saveContent" class="editor editor--snippet" :disabled="isSaving" spellcheck="false" />
        </label>
        <p v-if="saveError" class="error-text" role="alert">{{ saveError }}</p>
        <div class="record-item__actions">
          <button class="primary-button" :disabled="isSaving" type="submit">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button class="ghost-button" :disabled="isSaving" type="button" @click="closeSaveForm">Cancel</button>
        </div>
      </form>
    </section>

    <p v-if="saveFeedback" class="transform-feedback" role="status">{{ saveFeedback }}</p>

    <div class="section-card">
      <div class="section-card__title">
        <span>Pinned</span>
        <small>{{ pinnedItems.length }} items</small>
      </div>
      <div v-if="isLoading" class="empty-state">Loading clipboard history...</div>
      <div v-else-if="pinnedItems.length" class="record-list">
        <article v-for="item in pinnedItems" :key="item.id" class="record-item">
          <div class="record-item__content">{{ item.content }}</div>
          <div class="record-item__meta">
            <span>{{ item.updatedAt }}</span>
            <div class="record-item__actions">
              <button class="ghost-button" :disabled="isActionPending" type="button" @click="handleCopy(item.id)">
                Copy
              </button>
              <button class="ghost-button" :disabled="isActionPending || isSaving" type="button" @click="openSaveForm(item)">
                另存为 Snippet
              </button>
              <button
                class="ghost-button"
                :disabled="isActionPending"
                type="button"
                @click="handleTogglePin(item.id)"
              >
                Unpin
              </button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">No pinned records</div>
    </div>

    <div class="section-card">
      <div class="section-card__title">
        <span>Normal</span>
        <small>{{ normalItems.length }} / {{ CLIPBOARD_HISTORY_LIMIT }}</small>
      </div>
      <div v-if="isLoading" class="empty-state">Waiting for clipboard data...</div>
      <div v-else-if="normalItems.length" class="record-list">
        <article v-for="item in normalItems" :key="item.id" class="record-item">
          <div class="record-item__content">{{ item.content }}</div>
          <div class="record-item__meta">
            <span>{{ item.updatedAt }}</span>
            <div class="record-item__actions">
              <button class="ghost-button" :disabled="isActionPending" type="button" @click="handleCopy(item.id)">
                Copy
              </button>
              <button class="ghost-button" :disabled="isActionPending || isSaving" type="button" @click="openSaveForm(item)">
                另存为 Snippet
              </button>
              <button
                class="ghost-button"
                :disabled="isActionPending"
                type="button"
                @click="handleTogglePin(item.id)"
              >
                Pin
              </button>
              <button class="ghost-button" :disabled="isActionPending" type="button" @click="handleDelete(item.id)">
                Delete
              </button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">No normal records</div>
    </div>
  </div>
</template>
