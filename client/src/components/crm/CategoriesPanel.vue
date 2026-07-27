<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoriesStore } from '@/stores/categories'

const categoriesStore = useCategoriesStore()

const emit = defineEmits<{ delete: [name: string] }>()

const newCategory = ref('')
const canAdd = computed(() => categoriesStore.canAddCategory(newCategory.value))

function add() {
  if (!canAdd.value) return
  categoriesStore.addCategory(newCategory.value)
  newCategory.value = ''
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    add()
  }
}

function countLabel(name: string): string {
  const count = categoriesStore.countInCategory(name)
  if (count === 0) return 'нет товаров'
  if (count === 1) return count + ' товар'
  if (count < 5) return count + ' товара'
  return count + ' товаров'
}
</script>

<template>
  <div class="head">
    <h1 class="crm-h1">Категории</h1>
    <p class="crm-subtitle">{{ categoriesStore.categoryCountLabel }}</p>
  </div>

  <div class="add-row">
    <input
      v-model="newCategory"
      type="text"
      class="crm-input"
      placeholder="Название новой категории"
      @keydown="onKey"
    />
    <button type="button" class="crm-btn" :disabled="!canAdd" @click="add">+ Добавить</button>
  </div>

  <div class="crm-panel list">
    <div v-for="name in categoriesStore.categories" :key="name" class="cat-row">
      <div class="cat-name">
        <span class="dot"></span>
        <span class="cat-title">{{ name }}</span>
      </div>
      <div class="cat-actions">
        <span class="cat-count">{{ countLabel(name) }}</span>
        <button
          type="button"
          class="crm-icon-btn danger"
          aria-label="Удалить"
          title="Удалить"
          @click="emit('delete', name)"
        >
          🗑
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  margin-bottom: 24px;
}

.add-row {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
  max-width: 520px;
}

.list {
  max-width: 640px;
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(122, 92, 58, 0.1);
}

.cat-row:hover {
  background: #f7f0e2;
}

.cat-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--brand-accent);
  flex: none;
}

.cat-title {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  color: #33271a;
}

.cat-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cat-count {
  font-size: 13px;
  color: #a08a6a;
}
</style>
