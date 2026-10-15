<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProductsStore, swatch, coverUrl, type CrmProduct } from '@/stores/products'

const products = useProductsStore()

const emit = defineEmits<{
  new: []
  edit: [product: CrmProduct]
  delete: [product: CrmProduct]
}>()

type SortKey = 'name' | 'category' | 'price' | 'stock' | 'status'

const query = ref('')
const sortKey = ref<SortKey>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

const sortValue = computed({
  get: () => `${sortKey.value}:${sortDir.value}`,
  set: (value: string) => {
    const [key, dir] = value.split(':')
    if (
      key === 'name' ||
      key === 'category' ||
      key === 'price' ||
      key === 'stock' ||
      key === 'status'
    ) {
      sortKey.value = key
    }
    sortDir.value = dir === 'desc' ? 'desc' : 'asc'
  },
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = 'asc'
}

function sortMark(key: SortKey): string {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function compare(a: CrmProduct, b: CrmProduct): number {
  const dir = sortDir.value === 'asc' ? 1 : -1
  let result = 0
  if (sortKey.value === 'name') result = a.name.localeCompare(b.name, 'ru')
  else if (sortKey.value === 'category') result = a.category.localeCompare(b.category, 'ru')
  else if (sortKey.value === 'price') result = a.price - b.price
  else if (sortKey.value === 'stock') result = a.stock - b.stock
  else result = Number(a.isActive) - Number(b.isActive)
  if (result === 0) result = a.name.localeCompare(b.name, 'ru')
  return result * dir
}

const visible = computed(() => {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const list = words.length
    ? products.catalog.filter((product) => {
        const haystack = [product.name, product.slug, product.category, product.details]
          .join(' ')
          .toLowerCase()
        return words.every((word) => haystack.includes(word))
      })
    : products.catalog.slice()
  return list.sort(compare)
})

const listLabel = computed(() => {
  const total = products.productCountLabel
  if (!query.value.trim()) return total
  return `${total} · найдено ${visible.value.length}`
})

function stockColor(stock: number): string {
  if (stock === 0) return '#b0623f'
  if (stock <= 3) return '#b07d2f'
  return '#5f4d38'
}
</script>

<template>
  <div class="head">
    <div>
      <h1 class="crm-h1">Товары</h1>
      <p class="crm-subtitle">{{ listLabel }}</p>
    </div>
    <button type="button" class="crm-btn" @click="emit('new')">+ Добавить товар</button>
  </div>

  <div v-if="!products.loading && !products.error && products.catalog.length" class="toolbar">
    <input
      v-model="query"
      type="search"
      class="crm-input search"
      placeholder="Поиск по названию, категории или характеристикам"
      aria-label="Поиск товаров"
    />
    <select v-model="sortValue" class="crm-input sort" aria-label="Сортировка товаров">
      <option value="name:asc">По названию, А → Я</option>
      <option value="name:desc">По названию, Я → А</option>
      <option value="category:asc">По категории, А → Я</option>
      <option value="category:desc">По категории, Я → А</option>
      <option value="price:asc">Сначала дешевле</option>
      <option value="price:desc">Сначала дороже</option>
      <option value="stock:asc">Сначала меньше на складе</option>
      <option value="stock:desc">Сначала больше на складе</option>
      <option value="status:asc">Сначала скрытые</option>
      <option value="status:desc">Сначала активные</option>
    </select>
  </div>

  <div v-if="products.loading" class="state">Загрузка товаров…</div>

  <div v-else-if="products.error" class="crm-panel state state-error">
    <p>{{ products.error }}</p>
    <button type="button" class="crm-btn crm-btn-sm" @click="products.loadProducts()">
      Повторить
    </button>
  </div>

  <div v-else class="crm-panel products-table">
    <div class="row row-head">
      <button type="button" class="sort-btn" @click="toggleSort('name')">
        Товар <span v-if="sortMark('name')" class="sort-mark">{{ sortMark('name') }}</span>
      </button>
      <button type="button" class="sort-btn" @click="toggleSort('category')">
        Категория
        <span v-if="sortMark('category')" class="sort-mark">{{ sortMark('category') }}</span>
      </button>
      <button type="button" class="sort-btn" @click="toggleSort('price')">
        Цена <span v-if="sortMark('price')" class="sort-mark">{{ sortMark('price') }}</span>
      </button>
      <button type="button" class="sort-btn" @click="toggleSort('stock')">
        Остаток <span v-if="sortMark('stock')" class="sort-mark">{{ sortMark('stock') }}</span>
      </button>
      <button type="button" class="sort-btn" @click="toggleSort('status')">
        Статус <span v-if="sortMark('status')" class="sort-mark">{{ sortMark('status') }}</span>
      </button>
      <div></div>
    </div>
    <div v-if="products.catalog.length === 0" class="state">Товаров пока нет.</div>
    <div v-else-if="visible.length === 0" class="state">Ничего не найдено.</div>
    <div v-for="p in visible" :key="p.id" class="row">
      <div class="cell-product">
        <div
          class="swatch"
          :style="
            coverUrl(p)
              ? {
                  backgroundImage: `url(${coverUrl(p)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { backgroundImage: swatch(p.hue) }
          "
        >
          <span v-if="p.images.length > 1" class="swatch-count">{{ p.images.length }}</span>
        </div>
        <div class="product-meta">
          <div class="product-name">{{ p.name }}</div>
          <div class="product-slug">/product/{{ p.slug }}</div>
          <div class="product-details">{{ p.details }}</div>
        </div>
      </div>
      <div class="cell-meta">
        <div class="cell-category">
          <span class="cell-kicker">Категория</span>
          {{ p.category }}
        </div>
        <div class="cell-price">
          <span class="cell-kicker">Цена</span>
          {{ p.price.toLocaleString('ru-RU') }} ₽
        </div>
        <div class="cell-stock" :style="{ color: stockColor(p.stock) }">
          <span class="cell-kicker">Остаток</span>
          {{ p.stock }} шт.
        </div>
        <div class="cell-status">
          <span class="cell-kicker">Статус</span>
          <span class="badge" :class="p.isActive ? 'badge-active' : 'badge-hidden'">
            {{ p.isActive ? 'активен' : 'скрыт' }}
          </span>
        </div>
      </div>
      <div class="cell-actions">
        <button
          type="button"
          class="crm-icon-btn"
          aria-label="Изменить"
          title="Изменить"
          @click="emit('edit', p)"
        >
          ✎
        </button>
        <button
          type="button"
          class="crm-icon-btn danger"
          aria-label="Удалить"
          title="Удалить"
          @click="emit('delete', p)"
        >
          🗑
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.search {
  flex: 1 1 280px;
  max-width: 460px;
}
.sort {
  flex: 0 1 280px;
  width: auto;
  cursor: pointer;
  appearance: auto;
}
.sort-btn {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
}
.sort-btn:hover {
  color: #6b4a2e;
}
.sort-mark {
  letter-spacing: 0;
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
.row {
  display: grid;
  grid-template-columns: 2.4fr 1.1fr 0.9fr 0.9fr 0.9fr 96px;
  gap: 14px;
  padding: 14px 20px;
  align-items: center;
  border-bottom: 1px solid rgba(122, 92, 58, 0.1);
}
.row:not(.row-head):hover {
  background: #f7f0e2;
}
.row-head {
  padding: 13px 20px;
  background: #f1e8d8;
  border-bottom: 1px solid rgba(122, 92, 58, 0.16);
  font:
    500 11px/1 ui-monospace,
    Menlo,
    monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9a8464;
}
.cell-product {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}
.swatch {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex: none;
  border: 1px solid rgba(122, 92, 58, 0.16);
  position: relative;
}
/* Сколько всего картинок у товара — видно, что галерея не одна картинка. */
.swatch-count {
  position: absolute;
  right: -5px;
  bottom: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #3a2a19;
  color: #f7f1e6;
  font: 500 11px/18px 'Spline Sans';
  text-align: center;
}
.product-meta {
  min-width: 0;
}
.product-name {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 15px;
  color: var(--brand-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.product-slug {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: #a08a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.product-details {
  font-size: 12px;
  color: #a08a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-category {
  font-size: 13px;
  color: #5f4d38;
}
.cell-price {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 15px;
  color: var(--brand-ink);
}
.cell-stock {
  font-size: 14px;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font: 500 12px 'Spline Sans';
}
.badge-active {
  background: #e5eede;
  color: #5c7a3f;
  border: 1px solid rgba(92, 122, 63, 0.3);
}
.badge-hidden {
  background: #eadfce;
  color: #8a7458;
  border: 1px solid rgba(122, 92, 58, 0.22);
}
.cell-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.cell-kicker {
  display: none;
}
/* На широком экране поля остаются колонками общей таблицы. */
.cell-meta {
  display: contents;
}

/* Узкая панель: шесть колонок уже не помещаются и наезжают друг на друга. */
.products-table {
  container-type: inline-size;
  container-name: products;
}
@container products (max-width: 680px) {
  .row-head {
    display: none;
  }
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'product actions'
      'meta meta';
    gap: 12px;
    padding: 14px 14px 16px;
    align-items: start;
  }
  .cell-product {
    grid-area: product;
  }
  .cell-actions {
    grid-area: actions;
  }
  .cell-meta {
    display: grid;
    grid-area: meta;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 10px 16px;
  }
  .cell-category,
  .cell-price,
  .cell-stock,
  .cell-status {
    min-width: 0;
  }
  .cell-kicker {
    display: block;
    margin-bottom: 3px;
    font:
      500 10px/1.2 ui-monospace,
      Menlo,
      monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9a8464;
  }
}
</style>
