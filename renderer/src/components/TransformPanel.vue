<script setup lang="ts">
import { ref } from 'vue'
import { TRANSFORM_ACTIONS } from '@shared/constants/app'
import type { TransformActionKey } from '@shared/types/domain'
import { runTransform } from '../utils/transform'

const inputValue = ref('  {\"name\":\"ClipFlow\",\"stack\":[\"Electron\",\"Vue3\",\"TypeScript\"]}  ')
const outputValue = ref('')
const errorMessage = ref('')

function handleTransform(action: TransformActionKey): void {
  try {
    outputValue.value = runTransform(action, inputValue.value)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '转换失败'
    outputValue.value = ''
  }
}
</script>

<template>
  <div class="panel panel--transform">
    <div class="panel__header">
      <div>
        <h3>Text Transform</h3>
        <p>All planned actions are reserved here with renderer-side text logic.</p>
      </div>
      <button class="ghost-button" type="button">Copy Result</button>
    </div>

    <div class="transform-layout">
      <section class="section-card">
        <div class="section-card__title">
          <span>Input</span>
        </div>
        <textarea v-model="inputValue" class="editor" spellcheck="false" />
      </section>

      <section class="section-card">
        <div class="section-card__title">
          <span>Actions</span>
        </div>
        <div class="action-grid">
          <button
            v-for="action in TRANSFORM_ACTIONS"
            :key="action.key"
            class="action-button"
            type="button"
            @click="handleTransform(action.key)"
          >
            {{ action.label }}
          </button>
        </div>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      </section>

      <section class="section-card">
        <div class="section-card__title">
          <span>Output</span>
        </div>
        <textarea :value="outputValue" class="editor" readonly spellcheck="false" />
      </section>
    </div>
  </div>
</template>
