<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductsStore, type CrmProduct } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import CrmSidebar, { type CrmView } from '@/components/crm/CrmSidebar.vue'
import ProductsPanel from '@/components/crm/ProductsPanel.vue'
import CategoriesPanel from '@/components/crm/CategoriesPanel.vue'
import OrdersPanel from '@/components/crm/OrdersPanel.vue'
import ProductFormDrawer from '@/components/crm/ProductFormDrawer.vue'
import ConfirmModal from '@/components/crm/ConfirmModal.vue'
import '@/components/crm/crm-ui.css'

const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()

onMounted(() => {
  productsStore.loadProducts()
  categoriesStore.loadCategories()
})

const view = ref<CrmView>('products')

// --- форма товара ---
const formOpen = ref(false)
const editing = ref<CrmProduct | null>(null)

function openNew() {
  editing.value = null
  formOpen.value = true
}
function openEdit(product: CrmProduct) {
  editing.value = product
  formOpen.value = true
}

// --- удаление товара ---
const pendingDeleteProduct = ref<CrmProduct | null>(null)
const deleteProductMessage = computed(() =>
  pendingDeleteProduct.value
    ? `«${pendingDeleteProduct.value.name}» будет удалён без возможности восстановления.`
    : '',
)
async function confirmDeleteProduct() {
  const target = pendingDeleteProduct.value
  pendingDeleteProduct.value = null
  if (target) await productsStore.deleteProduct(target.id)
}

// --- удаление категории ---
const pendingDeleteCategory = ref<string | null>(null)
const deleteCategoryMessage = computed(() => {
  const name = pendingDeleteCategory.value
  if (!name) return ''
  const n = categoriesStore.countInCategory(name)
  const warn =
    n === 0
      ? 'В этой категории нет товаров.'
      : `${n} ${n === 1 ? 'товар получит' : 'товаров получат'} статус «без категории».`
  return `«${name}» будет удалена. ${warn}`
})
function confirmDeleteCategory() {
  if (pendingDeleteCategory.value) categoriesStore.deleteCategory(pendingDeleteCategory.value)
  pendingDeleteCategory.value = null
}
</script>

<template>
  <div class="crm">
    <CrmSidebar :view="view" @select="view = $event" />

    <main class="crm-main">
      <ProductsPanel
        v-if="view === 'products'"
        @new="openNew"
        @edit="openEdit"
        @delete="pendingDeleteProduct = $event"
      />
      <CategoriesPanel v-else-if="view === 'categories'" @delete="pendingDeleteCategory = $event" />
      <OrdersPanel v-else-if="view === 'orders'" />
    </main>

    <ProductFormDrawer
      :open="formOpen"
      :product="editing"
      @close="formOpen = false"
      @saved="formOpen = false"
    />

    <ConfirmModal
      :open="pendingDeleteProduct !== null"
      title="Удалить товар?"
      :message="deleteProductMessage"
      @confirm="confirmDeleteProduct"
      @cancel="pendingDeleteProduct = null"
    />

    <ConfirmModal
      :open="pendingDeleteCategory !== null"
      title="Удалить категорию?"
      :message="deleteCategoryMessage"
      @confirm="confirmDeleteCategory"
      @cancel="pendingDeleteCategory = null"
    />
  </div>
</template>

<style scoped>
.crm {
  min-height: 100vh;
  display: flex;
  font-family: 'Spline Sans', system-ui, sans-serif;
  color: var(--brand-ink);
}
.crm-main {
  flex: 1;
  min-width: 0;
  padding: 30px 36px 60px;
}
</style>
