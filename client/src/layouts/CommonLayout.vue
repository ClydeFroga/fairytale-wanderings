<script setup lang="ts">
import Footer from '@/components/global/Footer.vue'

// В Chrome переход рисует сам браузер. Здесь — запасной вариант, если API нет.
const fadeFallback =
  typeof document === 'undefined' || typeof document.startViewTransition !== 'function'
</script>

<template>
  <main class="page-stage">
    <router-view v-slot="{ Component, route }">
      <Transition v-if="fadeFallback" name="page">
        <component :is="Component" :key="route.path" />
      </Transition>
      <component v-else :is="Component" />
    </router-view>
  </main>
  <Footer />
</template>

<style scoped>
.page-stage {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  font-weight: normal;
}

/* Классы перехода висят на корне страницы, не на этой обёртке. */
.page-stage :deep(.page-enter-active),
.page-stage :deep(.page-leave-active) {
  transition: opacity 0.28s ease;
}

.page-stage :deep(.page-leave-active) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.page-stage :deep(.page-enter-from),
.page-stage :deep(.page-leave-to) {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-stage :deep(.page-enter-active),
  .page-stage :deep(.page-leave-active) {
    transition: none;
  }
}
</style>
