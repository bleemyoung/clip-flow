<script setup lang="ts">
import { computed, ref } from 'vue'
import { mockSnippets } from '../data/mock'

const keyword = ref('')
const snippets = ref(mockSnippets)

const filteredSnippets = computed(() => {
  const search = keyword.value.trim().toLowerCase()

  if (!search) {
    return snippets.value
  }

  return snippets.value.filter((item) => {
    return item.title.toLowerCase().includes(search) || item.content.toLowerCase().includes(search)
  })
})
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <div>
        <h3>Snippets</h3>
        <p>Title + content structure first, then form submission and local storage.</p>
      </div>
      <button class="primary-button" type="button">New Snippet</button>
    </div>

    <section class="section-card">
      <div class="section-card__title">
        <span>Search</span>
      </div>
      <input
        v-model="keyword"
        class="text-input"
        type="text"
        placeholder="Search by title or content"
      />
    </section>

    <section class="section-card">
      <div class="section-card__title">
        <span>Snippet List</span>
        <small>{{ filteredSnippets.length }} items</small>
      </div>
      <div v-if="filteredSnippets.length" class="snippet-list">
        <article v-for="item in filteredSnippets" :key="item.id" class="snippet-item">
          <div class="snippet-item__header">
            <strong>{{ item.title }}</strong>
            <span>{{ item.updatedAt }}</span>
          </div>
          <pre class="snippet-item__content">{{ item.content }}</pre>
          <div class="record-item__actions">
            <button class="ghost-button" type="button">Copy</button>
            <button class="ghost-button" type="button">Edit</button>
            <button class="ghost-button" type="button">Delete</button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">No matched snippets</div>
    </section>
  </div>
</template>
