<script setup lang="ts">
const props = defineProps<{
  activeModule: 'clipboard' | 'transform' | 'snippets'
}>()

const descriptions: Record<typeof props.activeModule, string> = {
  clipboard: 'Clipboard history shell with room for watcher, pinning and cleanup rules.',
  transform: 'Built-in text transform actions with result and error feedback areas.',
  snippets: 'Snippet CRUD shell prepared for search and local storage integration.'
}
</script>

<template>
  <header class="shell-header">
    <div>
      <p class="shell-header__eyebrow">Project Skeleton</p>
      <h2>{{ activeModule }}</h2>
      <p class="shell-header__desc">{{ descriptions[activeModule] }}</p>
    </div>
  </header>
</template>
