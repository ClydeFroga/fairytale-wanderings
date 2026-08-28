<script setup lang="ts">
import { useProductsStore, swatch, coverUrl, type CrmProduct } from '@/stores/products'

const products = useProductsStore()

const emit = defineEmits<{
  new: []
  edit: [product: CrmProduct]
  delete: [product: CrmProduct]
}>()

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
      <p class="crm-subtitle">{{ products.productCountLabel }}</p>
    </div>
    <button type="button" class="crm-btn" @click="emit('new')">+ Добавить товар</button>
  </div>

  <div v-if="products.loading" class="state">Загрузка товаров…</div>

  <div v-else-if="products.error" class="crm-panel state state-error">
    <p>{{ products.error }}</p>
    <button type="button" class="crm-btn crm-btn-sm" @click="products.loadProducts()">
      Повторить
    </button>
  </div>

  <div v-else class="crm-panel">
    <div class="row row-head">
      <div>Товар</div>
      <div>Категория</div>
      <div>Цена</div>
      <div>Остаток</div>
      <div>Статус</div>
      <div></div>
    </div>
    <div v-if="products.catalog.length === 0" class="state">Товаров пока нет.</div>
    <div v-for="p in products.catalog" :key="p.id" class="row">
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
      <div class="cell-category">{{ p.category }}</div>
      <div class="cell-price">{{ p.price.toLocaleString('ru-RU') }} ₽</div>
      <div class="cell-stock" :style="{ color: stockColor(p.stock) }">{{ p.stock }} шт.</div>
      <div>
        <span class="badge" :class="p.isActive ? 'badge-active' : 'badge-hidden'">
          {{ p.isActive ? 'активен' : 'скрыт' }}
        </span>
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
  margin-bottom: 24px;
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
  font: 500 11px/1 ui-monospace, Menlo, monospace;
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
</style>
