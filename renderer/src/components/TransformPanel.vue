<script setup lang="ts">
import { computed, ref } from 'vue'
import { TRANSFORM_ACTIONS } from '@shared/constants/app'
import type { TransformActionKey } from '@shared/types/domain'
import { runTransform } from '../utils/transform'

type CopyStatus = 'idle' | 'success' | 'error'

const inputValue = ref('  {\"name\":\"ClipFlow\",\"stack\":[\"Electron\",\"Vue3\",\"TypeScript\"]}  ')
const outputValue = ref('')
const errorMessage = ref('')
const copyStatus = ref<CopyStatus>('idle')
const copyMessage = ref('')

const canCopy = computed(() => Boolean(outputValue.value))

function handleTransform(action: TransformActionKey): void {
  copyStatus.value = 'idle'
  copyMessage.value = ''

  try {
    outputValue.value = runTransform(action, inputValue.value)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '转换失败'
    outputValue.value = ''
  }
}

async function handleCopyResult(): Promise<void> {
  if (!canCopy.value) {
    return
  }

  try {
    if (typeof window.clipflow.copyText === 'function') {
      await window.clipflow.copyText(outputValue.value)//preload / Electron
    } else {
      await navigator.clipboard.writeText(outputValue.value)//navigator.clipboard：页面直接调用浏览器剪贴板能力
    }
    copyMessage.value = '已复制结果'
    copyStatus.value = 'success'
    
  } catch {
    try {
      await navigator.clipboard.writeText(outputValue.value)
      copyStatus.value = 'success'
      copyMessage.value = '已复制结果'
    } catch {
      copyStatus.value = 'error'
      copyMessage.value = '复制失败，请重试'
    }
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
      <div class="transform-header-actions">
        <p
          v-if="copyMessage"
          :class="['transform-feedback', { 'transform-feedback--error': copyStatus === 'error' }]"
        >
          {{ copyMessage }}
        </p>
        <button class="ghost-button" :disabled="!canCopy" type="button" @click="handleCopyResult">
          Copy Result
        </button>
      </div>
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
