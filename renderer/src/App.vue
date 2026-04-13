<script setup lang="ts">
import { computed, ref } from 'vue'
import ClipboardPanel from './components/ClipboardPanel.vue'
import ShellHeader from './components/ShellHeader.vue'
import SnippetsPanel from './components/SnippetsPanel.vue'
import TransformPanel from './components/TransformPanel.vue'
import { MODULE_TABS } from '@shared/constants/app'

type ModuleKey = (typeof MODULE_TABS)[number]['key']

const activeModule = ref<ModuleKey>('clipboard')
const appMeta = window.clipflow.getAppMeta()

const activeComponent = computed(() => {
  if (activeModule.value === 'clipboard') {
    return ClipboardPanel
  }

  if (activeModule.value === 'transform') {
    return TransformPanel
  }

  return SnippetsPanel
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <p class="brand__eyebrow">Desktop Toolkit</p>
        <h1>ClipFlow</h1>
        <p class="brand__meta">{{ appMeta.version }}</p>
      </div>

      <nav class="nav">
        <button
          v-for="item in MODULE_TABS"
          :key="item.key"
          :class="['nav__item', { 'nav__item--active': item.key === activeModule }]"
          type="button"
          @click="activeModule = item.key"
        >
          <span class="nav__label">{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar__footer">
        <p>阶段 3 已进入真实数据联调。</p>
        <small>当前重点：剪贴板历史与本地持久化。</small>
      </div>
    </aside>

    <main class="workspace">
      <ShellHeader :active-module="activeModule" />
      <section class="workspace__body">
        <component :is="activeComponent" />
      </section>
    </main>
  </div>
</template>
