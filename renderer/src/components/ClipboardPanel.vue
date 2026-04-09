<script setup lang="ts">
import { computed, ref } from 'vue'
import { mockClipboardItems } from '../data/mock'

const items = ref(mockClipboardItems)

const pinnedItems = computed(() => items.value.filter((item) => item.pinned))
const normalItems = computed(() => items.value.filter((item) => !item.pinned))
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <div>
        <h3>Clipboard History</h3>
        <p>Static records for now. Replace with clipboard polling data next.</p>
      </div>
      <button class="ghost-button" type="button">Clear Normal</button>
    </div>

    <div class="section-card">
      <div class="section-card__title">
        <span>Pinned</span>
        <small>{{ pinnedItems.length }} items</small>
      </div>
      <div v-if="pinnedItems.length" class="record-list">
        <article v-for="item in pinnedItems" :key="item.id" class="record-item">
          <div class="record-item__content">{{ item.content }}</div>
          <div class="record-item__meta">
            <span>{{ item.updatedAt }}</span>
            <div class="record-item__actions">
              <button class="ghost-button" type="button">Copy</button>
              <button class="ghost-button" type="button">Unpin</button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">No pinned records</div>
    </div>

    <div class="section-card">
      <div class="section-card__title">
        <span>Normal</span>
        <small>{{ normalItems.length }} / 50</small>
      </div>
      <div v-if="normalItems.length" class="record-list">
        <article v-for="item in normalItems" :key="item.id" class="record-item">
          <div class="record-item__content">{{ item.content }}</div>
          <div class="record-item__meta">
            <span>{{ item.updatedAt }}</span>
            <div class="record-item__actions">
              <button class="ghost-button" type="button">Copy</button>
              <button class="ghost-button" type="button">Pin</button>
              <button class="ghost-button" type="button">Delete</button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">No normal records</div>
    </div>
  </div>
</template>
