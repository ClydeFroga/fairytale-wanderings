<template>
  <div class="chips" role="group" aria-label="Категории">
    <button
      v-for="category in categories"
      :key="category.param || 'all'"
      type="button"
      class="chip"
      :aria-pressed="isActive(category.param)"
      @click="onClick(category.param)"
    >
      {{ category.text }} <span class="count">{{ category.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

defineProps<{ categories: { param: string; text: string; count: number }[] }>()

const route = useRoute()
const router = useRouter()

const isActive = (param: string) => {
  return (route.query.category ?? '') === param
}

const onClick = (param: string) => {
  const query: Record<string, string> = {}
  if (param) query.category = param
  if (typeof route.query.q === 'string' && route.query.q) query.q = route.query.q
  router.push({ query })
}
</script>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  height: 44px;
  padding: 0 18px;
  border-radius: 22px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--line-strong);
}

.chip:hover {
  border-color: var(--accent);
}

.chip[aria-pressed='true'] {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}

.count {
  opacity: 0.6;
  font-weight: 500;
}

@media (max-width: 720px) {
  .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    margin: 16px -16px 20px;
    padding: 0 16px 4px;
  }

  .chips::-webkit-scrollbar {
    display: none;
  }

  .chip {
    flex: none;
    white-space: nowrap;
    padding: 0 16px;
  }
}
</style>
