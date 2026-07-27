<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import type { ICategory } from '@/api/categories'

const categoriesStore = useCategoriesStore()

const emit = defineEmits<{ delete: [category: ICategory] }>()

const newCategory = ref('')
const saving = ref(false)
const actionError = ref('')

// Переименование — инлайн: строка превращается в поле ввода.
const editingId = ref<string | null>(null)
const editingName = ref('')
const editInput = ref<HTMLInputElement | null>(null)

// Поле ввода живёт внутри v-for, поэтому берём его функциональным ref:
// обычный ref в списке Vue заполняет массивом.
function bindEditInput(el: unknown) {
  editInput.value = el instanceof HTMLInputElement ? el : null
}

const canAdd = computed(() => !saving.value && categoriesStore.canAddCategory(newCategory.value))

async function add() {
  if (!canAdd.value) return
  saving.value = true
  actionError.value = ''
  try {
    await categoriesStore.addCategory(newCategory.value)
    newCategory.value = ''
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось создать категорию'
  } finally {
    saving.value = false
  }
}

async function startEdit(category: ICategory) {
  editingId.value = category.id
  editingName.value = category.name
  actionError.value = ''
  await nextTick()
  editInput.value?.focus()
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

async function saveEdit(category: ICategory) {
  const name = editingName.value.trim()
  if (!name || name === category.name) return cancelEdit()

  saving.value = true
  actionError.value = ''
  try {
    await categoriesStore.renameCategory(category.id, name)
    cancelEdit()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось переименовать категорию'
  } finally {
    saving.value = false
  }
}

function countLabel(category: ICategory): string {
  const count = categoriesStore.countInCategory(category.id)
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
      @keydown.enter.prevent="add"
    />
    <button type="button" class="crm-btn" :disabled="!canAdd" @click="add">+ Добавить</button>
  </div>

  <p v-if="actionError" class="action-error">{{ actionError }}</p>

  <div v-if="categoriesStore.loading" class="state">Загрузка категорий…</div>

  <div v-else-if="categoriesStore.error" class="crm-panel state state-error">
    <p>{{ categoriesStore.error }}</p>
    <button type="button" class="crm-btn crm-btn-sm" @click="categoriesStore.loadCategories()">
      Повторить
    </button>
  </div>

  <div v-else class="crm-panel list">
    <div v-if="categoriesStore.categories.length === 0" class="state">Категорий пока нет.</div>

    <div v-for="category in categoriesStore.categories" :key="category.id" class="cat-row">
      <div v-if="editingId === category.id" class="cat-edit">
        <input
          :ref="bindEditInput"
          v-model="editingName"
          type="text"
          class="crm-input"
          @keydown.enter.prevent="saveEdit(category)"
          @keydown.esc="cancelEdit"
        />
        <button
          type="button"
          class="crm-btn crm-btn-sm"
          :disabled="saving"
          @click="saveEdit(category)"
        >
          Сохранить
        </button>
        <button type="button" class="crm-btn-ghost crm-btn-sm" @click="cancelEdit">Отмена</button>
      </div>

      <template v-else>
        <div class="cat-name">
          <span class="dot"></span>
          <span class="cat-title">{{ category.name }}</span>
          <span class="cat-slug">/{{ category.slug }}</span>
        </div>
        <div class="cat-actions">
          <span class="cat-count">{{ countLabel(category) }}</span>
          <button
            type="button"
            class="crm-icon-btn"
            aria-label="Переименовать"
            title="Переименовать"
            @click="startEdit(category)"
          >
            ✎
          </button>
          <button
            type="button"
            class="crm-icon-btn danger"
            aria-label="Удалить"
            title="Удалить"
            @click="emit('delete', category)"
          >
            🗑
          </button>
        </div>
      </template>
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

/* Slug виден, чтобы владелица понимала, что ссылка на категорию не меняется. */
.cat-slug {
  font:
    400 12px/1 ui-monospace,
    Menlo,
    monospace;
  color: #b09a7a;
}

.cat-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.cat-edit .crm-input {
  flex: 1;
  min-width: 0;
}

.state {
  padding: 40px 20px;
  text-align: center;
  font-size: 14px;
  color: #8a7458;
}

.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #b0623f;
}

.action-error {
  margin: -10px 0 16px;
  max-width: 640px;
  font-size: 13px;
  color: #b0623f;
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
