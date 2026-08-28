<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  useProductsStore,
  type CrmProduct,
  type ProductDraft,
  type DetailRow,
} from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { imageUrl } from '@/scripts/images'
import { MAX_PRODUCT_IMAGES } from '@/api/products'

const props = defineProps<{
  open: boolean
  product: CrmProduct | null // null — создание нового товара
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()

const form = ref<ProductDraft>(emptyDraft())
const saving = ref(false)
const saveError = ref('')

// Галерея товара: уже сохранённые картинки (path) и только что выбранные файлы
// (file + object URL для превью) в одном списке — порядок в нём и уходит на сервер.
type ImageSlot = { key: string; url: string; path?: string; file?: File }

const slots = ref<ImageSlot[]>([])
const imagesHint = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

let slotSeq = 0

function emptyDraft(): ProductDraft {
  return {
    name: '',
    description: '',
    price: '',
    stock: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    categoryId: categoriesStore.categories[0]?.id ?? '',
    details: [{ key: '', value: '' }],
    isActive: true,
    imageFiles: [],
    existingImages: [],
  }
}

function detailsFromMap(map: Record<string, string>): DetailRow[] {
  const rows = Object.entries(map).map(([key, value]) => ({ key, value }))
  return rows.length ? rows : [{ key: '', value: '' }]
}

// Object URL живёт, пока слот в списке; освобождаем при удалении и закрытии формы.
function releaseSlots() {
  for (const slot of slots.value) {
    if (slot.file) URL.revokeObjectURL(slot.url)
  }
  slots.value = []
  imagesHint.value = ''
}

// При открытии наполняем форму: из товара (редактирование) или пустую (создание).
watch(
  () => [props.open, props.product] as const,
  ([open]) => {
    if (!open) return
    releaseSlots()
    saveError.value = ''
    const p = props.product
    form.value = p
      ? {
          name: p.name,
          description: p.description,
          price: String(p.price),
          stock: String(p.stock),
          // Незаполненные параметры посылки показываем пустыми, а не нулями.
          weight: p.weight === null ? '' : String(p.weight),
          length: p.length === null ? '' : String(p.length),
          width: p.width === null ? '' : String(p.width),
          height: p.height === null ? '' : String(p.height),
          categoryId: p.categoryId ?? '',
          details: detailsFromMap(p.detailsMap),
          isActive: p.isActive,
          // Картинки живут в slots — в черновик они попадают только при сохранении.
          imageFiles: [],
          existingImages: [],
        }
      : emptyDraft()
    slots.value = (p?.images ?? []).map((path) => ({
      key: `saved-${slotSeq++}`,
      url: imageUrl(path) ?? '',
      path,
    }))
  },
  { immediate: true },
)

onBeforeUnmount(releaseSlots)

const isEditing = computed(() => props.product !== null)
const title = computed(() => (isEditing.value ? 'Редактировать товар' : 'Новый товар'))
const saveLabel = computed(() => (isEditing.value ? 'Сохранить' : 'Создать товар'))
const activeHint = computed(() =>
  form.value.isActive ? 'Виден покупателям в каталоге' : 'Скрыт из каталога',
)
const canSave = computed(() => !!form.value.name.trim() && !saving.value)

const maxImages = MAX_PRODUCT_IMAGES
const canAddImages = computed(() => slots.value.length < maxImages)
const imagesCount = computed(() => `${slots.value.length} из ${maxImages}`)

function pickImages() {
  fileInput.value?.click()
}

function onFilesChange(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  const free = maxImages - slots.value.length

  for (const file of picked.slice(0, free)) {
    slots.value.push({ key: `new-${slotSeq++}`, url: URL.createObjectURL(file), file })
  }

  imagesHint.value =
    picked.length > free ? `Можно не больше ${maxImages} изображений — лишние не добавлены.` : ''

  // Сбрасываем input, иначе повторный выбор того же файла не вызовет change.
  input.value = ''
}

function removeImage(index: number) {
  const [removed] = slots.value.splice(index, 1)
  if (removed?.file) URL.revokeObjectURL(removed.url)
  imagesHint.value = ''
}

function addDetail() {
  form.value.details.push({ key: '', value: '' })
}
function removeDetail(i: number) {
  form.value.details.splice(i, 1)
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    // Галерея: что осталось от старых картинок и что добавили — в порядке слотов.
    const draft: ProductDraft = {
      ...form.value,
      existingImages: slots.value.flatMap((s) => (s.path ? [s.path] : [])),
      imageFiles: slots.value.flatMap((s) => (s.file ? [s.file] : [])),
    }
    await productsStore.saveProduct(draft, props.product?.id ?? null)
    emit('saved')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Не удалось сохранить товар'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <template v-if="open">
    <div class="scrim" @click="emit('close')"></div>
    <div class="drawer">
      <div class="drawer-head">
        <h2 class="drawer-title">{{ title }}</h2>
        <button type="button" class="crm-icon-btn" aria-label="Закрыть" @click="emit('close')">
          ✕
        </button>
      </div>

      <div class="drawer-body">
        <div class="field">
          <label class="crm-label">
            Изображения
            <span class="images-count">{{ imagesCount }}</span>
          </label>
          <div class="images">
            <div
              v-for="(slot, i) in slots"
              :key="slot.key"
              class="image"
              :style="{ backgroundImage: `url(${slot.url})` }"
            >
              <span v-if="i === 0" class="image-cover">обложка</span>
              <button
                type="button"
                class="image-remove"
                aria-label="Убрать изображение"
                title="Убрать"
                @click="removeImage(i)"
              >
                ✕
              </button>
            </div>
            <button
              v-if="canAddImages"
              type="button"
              class="image-add"
              title="Добавить изображения"
              @click="pickImages"
            >
              +
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              multiple
              class="file-hidden"
              @change="onFilesChange"
            />
          </div>
          <p class="images-hint" :class="{ warn: imagesHint }">
            {{ imagesHint || 'Первая картинка — обложка в каталоге. Порядок задаётся списком.' }}
          </p>
        </div>

        <div class="field">
          <label class="crm-label">Название</label>
          <input
            v-model="form.name"
            type="text"
            class="crm-input"
            placeholder="Например, Вязаный плед «Облако»"
          />
        </div>

        <div class="field">
          <label class="crm-label">Описание</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="crm-input"
            placeholder="Материалы, размеры, уход…"
          ></textarea>
        </div>

        <div class="grid-2">
          <div class="field">
            <label class="crm-label">Цена, ₽</label>
            <input v-model="form.price" type="number" class="crm-input" placeholder="0" />
          </div>
          <div class="field">
            <label class="crm-label">Остаток (stock)</label>
            <input v-model="form.stock" type="number" class="crm-input" placeholder="0" />
          </div>
        </div>

        <!-- Посылка для расчёта доставки СДЭК. Не заполнено — считается по
             коробке по умолчанию с сервера (CDEK_PARCEL_*). -->
        <div class="field">
          <label class="crm-label">Посылка (для расчёта доставки)</label>
          <div class="grid-4">
            <input
              v-model="form.weight"
              type="number"
              class="crm-input"
              placeholder="вес, г"
              aria-label="Вес в граммах"
            />
            <input
              v-model="form.length"
              type="number"
              class="crm-input"
              placeholder="длина, см"
              aria-label="Длина в сантиметрах"
            />
            <input
              v-model="form.width"
              type="number"
              class="crm-input"
              placeholder="ширина, см"
              aria-label="Ширина в сантиметрах"
            />
            <input
              v-model="form.height"
              type="number"
              class="crm-input"
              placeholder="высота, см"
              aria-label="Высота в сантиметрах"
            />
          </div>
          <p class="images-hint">
            Габариты — в упакованном виде. Можно не заполнять: тогда доставка считается по
            стандартной коробке, но для крупных вещей цена будет неточной.
          </p>
        </div>

        <div class="field">
          <label class="crm-label">Категория</label>
          <select v-model="form.categoryId" class="crm-input">
            <option value="">Без категории</option>
            <option v-for="c in categoriesStore.categories" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label class="crm-label">Детали (характеристики)</label>
          <div class="details">
            <div v-for="(row, i) in form.details" :key="i" class="detail-row">
              <input v-model="row.key" type="text" class="crm-input" placeholder="Материал" />
              <input v-model="row.value" type="text" class="crm-input" placeholder="100% хлопок" />
              <button
                type="button"
                class="crm-icon-btn danger"
                aria-label="Убрать"
                title="Убрать"
                @click="removeDetail(i)"
              >
                🗑
              </button>
            </div>
            <button type="button" class="add-detail" @click="addDetail">
              + добавить характеристику
            </button>
          </div>
        </div>

        <label class="active-toggle">
          <button
            type="button"
            role="switch"
            :aria-checked="form.isActive"
            class="switch-track"
            :class="{ on: form.isActive }"
            @click="form.isActive = !form.isActive"
          >
            <span class="switch-knob" :class="{ on: form.isActive }"></span>
          </button>
          <span class="active-text">
            <span class="active-title">Активен (isActive)</span>
            <span class="active-hint">{{ activeHint }}</span>
          </span>
        </label>
      </div>

      <div class="drawer-foot">
        <p v-if="saveError" class="save-error">{{ saveError }}</p>
        <button type="button" class="crm-btn-ghost" :disabled="saving" @click="emit('close')">
          Отмена
        </button>
        <button type="button" class="crm-btn" :disabled="!canSave" @click="save">
          {{ saving ? 'Сохранение…' : saveLabel }}
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(46, 33, 19, 0.42);
  backdrop-filter: blur(2px);
  z-index: 40;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(520px, 94vw);
  background: #f7f1e6;
  z-index: 41;
  box-shadow: -24px 0 60px -30px rgba(46, 33, 19, 0.6);
  display: flex;
  flex-direction: column;
}
.drawer-head {
  padding: 22px 28px;
  border-bottom: 1px solid rgba(122, 92, 58, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.drawer-title {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 22px;
  color: #2e2113;
}
.drawer-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.images {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.image {
  width: 74px;
  height: 74px;
  border-radius: 10px;
  border: 1px solid rgba(122, 92, 58, 0.2);
  position: relative;
  background-size: cover;
  background-position: center;
}
.images-count {
  margin-left: 6px;
  font-size: 11px;
  color: #a08a6a;
}
.images-hint {
  margin: 0;
  font-size: 12px;
  color: #a08a6a;
}
.images-hint.warn {
  color: #b0623f;
}
.image-cover {
  position: absolute;
  left: 4px;
  bottom: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(46, 33, 19, 0.72);
  color: #f7f1e6;
  font-size: 10px;
  line-height: 16px;
}
.image-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #3a2a19;
  color: #f7f1e6;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}
.image-add {
  width: 74px;
  height: 74px;
  border-radius: 10px;
  border: 1.5px dashed rgba(122, 92, 58, 0.4);
  background: #efe7d8;
  color: #9a8464;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-add:hover {
  border-color: rgba(168, 73, 43, 0.55);
  color: var(--brand-accent-strong);
}
.file-hidden {
  display: none;
}
.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr 34px;
  gap: 8px;
  align-items: center;
}
.add-detail {
  align-self: flex-start;
  appearance: none;
  border: none;
  background: transparent;
  color: var(--brand-accent);
  cursor: pointer;
  font: 500 13px 'Spline Sans';
  padding: 2px 0;
}
.add-detail:hover {
  color: var(--brand-accent-strong);
}
.active-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px 14px;
  background: #efe7d8;
  border: 1px solid rgba(122, 92, 58, 0.18);
  border-radius: 11px;
}
.switch-track {
  position: relative;
  width: 42px;
  height: 24px;
  flex: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  background: #cdbda0;
  transition: background 0.18s ease;
}
.switch-track.on {
  background: var(--brand-accent);
}
.switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.18s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.switch-knob.on {
  left: 21px;
}
.active-text {
  display: flex;
  flex-direction: column;
}
.active-title {
  font-weight: 500;
  font-size: 14px;
  color: #33271a;
}
.active-hint {
  font-size: 12px;
  color: #8a7458;
}
.drawer-foot {
  padding: 18px 28px;
  border-top: 1px solid rgba(122, 92, 58, 0.16);
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  background: #f1e8d8;
}
.save-error {
  margin: 0;
  margin-right: auto;
  font-size: 13px;
  color: #b0623f;
}
</style>
