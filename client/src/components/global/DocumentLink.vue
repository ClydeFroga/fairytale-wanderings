<script setup lang="ts">
import { computed } from 'vue'
import { documentUrl, type DocumentKind } from '@/api/terms'
import { getTelegramWebApp, isTelegram } from '@/scripts/telegram'

const props = defineProps<{ kind: DocumentKind }>()

const href = computed(() => documentUrl(props.kind))

// Во WebView Телеграма скачивание файлов часто не работает, а PDF не открывается —
// там отдаём ссылку внешнему браузеру. В обычном браузере работает сам <a>.
function onClick(e: MouseEvent) {
  const webApp = getTelegramWebApp()
  if (!isTelegram() || !webApp?.openLink) return
  e.preventDefault()
  webApp.openLink(href.value)
}
</script>

<template>
  <a :href="href" target="_blank" rel="noopener" @click="onClick"><slot /></a>
</template>
