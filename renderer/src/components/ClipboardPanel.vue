<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CLIPBOARD_HISTORY_LIMIT } from '@shared/constants/app'
import type { ClipboardHistorySnapshot, ClipboardItem } from '@shared/types/domain'

const items = ref<ClipboardItem[]>([])
const isLoading = ref(true)
const isActionPending = ref(false)
const pollingInterval = ref(1000)

const pinnedItems = computed(() => items.value.filter((item) => item.pinned))
const normalItems = computed(() => items.value.filter((item) => !item.pinned))

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
