<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { SnippetItem } from '@shared/types/domain'

type FormMode = 'create' | 'edit'
type FeedbackStatus = 'success' | 'error' | 'idle'

const keyword = ref('')
const snippets = ref<SnippetItem[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const isActionPending = ref(false)
const uploadingId = ref<string | null>(null)
const uploadFeedback = ref<Record<string, { message: string; error: boolean }>>({})
const isFormOpen = ref(false)
const formMode = ref<FormMode>('create')
const editingId = ref<string | null>(null)
const title = ref('')
const content = ref('')
const formError = ref('')
const feedbackMessage = ref('')
const feedbackStatus = ref<FeedbackStatus>('idle')

let feedbackTimer: ReturnType<typeof setTimeout> | undefined

const filteredSnippets = computed(() => {
  const search = keyword.value.trim().toLowerCase()

  if (!search) {
    return snippets.value
  }

  return snippets.value.filter((item) => {
    return item.title.toLowerCase().includes(search) || item.content.toLowerCase().includes(search)
  })
})

function cloudStatus(item: SnippetItem): string {
  if (!item.cloud) {
    return '未上云'
  }
  return item.title.trim() === item.cloud.uploadedTitle && item.content === item.cloud.uploadedContent
    ? '已上云'
    : '有未上传修改'
}

function uploadLabel(item: SnippetItem): string {
  if (uploadingId.value === item.id) {
    return item.cloud ? '更新中…' : '上云中…'
  }
  return item.cloud ? '更新到云端' : '上云'
}

function resetForm(): void {
  formMode.value = 'create'
  editingId.value = null
  title.value = ''
  content.value = ''
  formError.value = ''
}

function showFeedback(message: string, status: Exclude<FeedbackStatus, 'idle'>): void {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }

  feedbackMessage.value = message
  feedbackStatus.value = status
  feedbackTimer = setTimeout(() => {
    feedbackMessage.value = ''
    feedbackStatus.value = 'idle'
    feedbackTimer = undefined
  }, 2400)
}

async function loadSnippets(): Promise<void> {
  isLoading.value = true

  try {
    snippets.value = await window.clipflow.getSnippets()
  } catch {
    showFeedback('加载片段失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

function openCreateForm(): void {
  resetForm()
  isFormOpen.value = true
}

function openEditForm(item: SnippetItem): void {
  formMode.value = 'edit'
  editingId.value = item.id
  title.value = item.title
  content.value = item.content
  formError.value = ''
  isFormOpen.value = true
}

function closeForm(): void {
  isFormOpen.value = false
  resetForm()
}

async function handleSave(): Promise<void> {
  if (isSaving.value || (formMode.value === 'edit' && uploadingId.value === editingId.value)) {
    return
  }
  if (!title.value.trim() || !content.value.trim()) {
    formError.value = '标题和内容不能为空'
    return
  }

  isSaving.value = true
  formError.value = ''

  try {
    const draft = { title: title.value, content: content.value }
    snippets.value =
      formMode.value === 'create'
        ? await window.clipflow.createSnippet(draft)
        : await window.clipflow.updateSnippet(editingId.value as string, draft)
    if (editingId.value) {
      delete uploadFeedback.value[editingId.value]
    }
    closeForm()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存片段失败，请重试'
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(item: SnippetItem): Promise<void> {
  if (uploadingId.value === item.id) {
    return
  }

  const warning = item.pendingCreate
    ? '后端可能已保存；删除本地片段不会撤回该请求。'
    : item.cloud ? '后端记录会保留。' : ''
  if (!window.confirm(`确认删除“${item.title}”吗？此操作无法撤销。${warning}`)) {
    return
  }

  isActionPending.value = true

  try {
    snippets.value = await window.clipflow.deleteSnippet(item.id)
  } catch {
    showFeedback('删除片段失败，请重试', 'error')
  } finally {
    isActionPending.value = false
  }
}

async function handleUpload(item: SnippetItem): Promise<void> {
  if (uploadingId.value || cloudStatus(item) === '已上云') {
    return
  }

  uploadingId.value = item.id
  delete uploadFeedback.value[item.id]

  try {
    const result = await window.clipflow.uploadSnippet(item.id)
    snippets.value = result.items
    uploadFeedback.value[item.id] = result.ok
      ? { message: '已保存到后端', error: false }
      : { message: result.message, error: true }
  } catch {
    uploadFeedback.value[item.id] = {
      message: '上云请求未完成，请手动重试',
      error: true
    }
    try {
      snippets.value = await window.clipflow.getSnippets()
    } catch {
      // Keep the upload error visible if refreshing the local state also fails.
    }
  } finally {
    uploadingId.value = null
  }
}

async function handleCopy(item: SnippetItem): Promise<void> {
  isActionPending.value = true

  try {
    await window.clipflow.copySnippet(item.id)
    showFeedback('已复制片段', 'success')
  } catch {
    showFeedback('复制失败，请重试', 'error')
  } finally {
    isActionPending.value = false
  }
}

onMounted(() => {
  void loadSnippets()
})

onUnmounted(() => {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }
})
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <div>
        <h3>Snippets</h3>
        <p>保存、查找并复制可复用的文本片段。上云会保存到当前连接的后端服务。</p>
      </div>
      <button class="primary-button" :disabled="isSaving || isActionPending" type="button" @click="openCreateForm">
        New Snippet
      </button>
    </div>

    <section v-if="isFormOpen" class="section-card">
      <div class="section-card__title">
        <span>{{ formMode === 'create' ? 'New Snippet' : 'Edit Snippet' }}</span>
      </div>
      <form class="snippet-form" @submit.prevent="handleSave">
        <label class="form-field">
          <span>Title</span>
          <input v-model="title" class="text-input" type="text" :disabled="isSaving || (formMode === 'edit' && uploadingId === editingId)" />
        </label>
        <label class="form-field">
          <span>Content</span>
          <textarea v-model="content" class="editor editor--snippet" :disabled="isSaving || (formMode === 'edit' && uploadingId === editingId)" spellcheck="false" />
        </label>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="record-item__actions">
          <button class="primary-button" :disabled="isSaving || (formMode === 'edit' && uploadingId === editingId)" type="submit">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button class="ghost-button" :disabled="isSaving" type="button" @click="closeForm">Cancel</button>
        </div>
      </form>
    </section>

    <section class="section-card">
      <div class="section-card__title">
        <span>Search</span>
        <small>{{ filteredSnippets.length }} items</small>
      </div>
      <input
        v-model="keyword"
        class="text-input"
        type="search"
        placeholder="Search by title or content"
      />
    </section>

    <section class="section-card">
      <div class="section-card__title">
        <span>Snippet List</span>
        <p
          v-if="feedbackMessage"
          :class="['transform-feedback', { 'transform-feedback--error': feedbackStatus === 'error' }]"
        >
          {{ feedbackMessage }}
        </p>
      </div>
      <div v-if="isLoading" class="empty-state">Loading snippets...</div>
      <div v-else-if="filteredSnippets.length" class="snippet-list">
        <article v-for="item in filteredSnippets" :key="item.id" class="snippet-item">
          <div class="snippet-item__header">
            <strong>{{ item.title }}</strong>
            <span>{{ item.updatedAt }}</span>
          </div>
          <pre class="snippet-item__content">{{ item.content }}</pre>
          <span class="snippet-item__cloud-status">{{ cloudStatus(item) }}</span>
          <div class="record-item__actions">
            <button
              class="ghost-button"
              :disabled="isActionPending || isSaving || !!uploadingId || cloudStatus(item) === '已上云'"
              type="button"
              @click="handleUpload(item)"
            >
              {{ uploadLabel(item) }}
            </button>
            <button class="ghost-button" :disabled="isActionPending || isSaving" type="button" @click="handleCopy(item)">
              Copy
            </button>
            <button class="ghost-button" :disabled="isActionPending || isSaving || uploadingId === item.id" type="button" @click="openEditForm(item)">
              Edit
            </button>
            <button class="ghost-button" :disabled="isActionPending || isSaving || uploadingId === item.id" type="button" @click="handleDelete(item)">
              Delete
            </button>
          </div>
          <p
            v-if="uploadFeedback[item.id] || item.pendingCreate"
            :class="['snippet-item__upload-feedback', { 'snippet-item__upload-feedback--error': uploadFeedback[item.id]?.error || !uploadFeedback[item.id] }]"
            :role="uploadFeedback[item.id]?.error ? 'alert' : 'status'"
          >
            {{ uploadFeedback[item.id]?.message || '上次创建结果未确认，请手动重试' }}
          </p>
        </article>
      </div>
      <div v-else class="empty-state">{{ keyword ? 'No matched snippets' : 'No saved snippets yet' }}</div>
    </section>
  </div>
</template>
