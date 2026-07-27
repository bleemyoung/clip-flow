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
    closeForm()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存片段失败，请重试'
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(item: SnippetItem): Promise<void> {
  if (!window.confirm(`确认删除“${item.title}”吗？此操作无法撤销。`)) {
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
        <p>保存、查找并复制可复用的文本片段。</p>
      </div>
      <button class="primary-button" :disabled="isSaving" type="button" @click="openCreateForm">
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
          <input v-model="title" class="text-input" type="text" :disabled="isSaving" />
        </label>
        <label class="form-field">
          <span>Content</span>
          <textarea v-model="content" class="editor editor--snippet" :disabled="isSaving" spellcheck="false" />
        </label>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="record-item__actions">
          <button class="primary-button" :disabled="isSaving" type="submit">
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
          <div class="record-item__actions">
            <button class="ghost-button" :disabled="isActionPending" type="button" @click="handleCopy(item)">
              Copy
            </button>
            <button class="ghost-button" :disabled="isActionPending" type="button" @click="openEditForm(item)">
              Edit
            </button>
            <button class="ghost-button" :disabled="isActionPending" type="button" @click="handleDelete(item)">
              Delete
            </button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">{{ keyword ? 'No matched snippets' : 'No saved snippets yet' }}</div>
    </section>
  </div>
</template>
