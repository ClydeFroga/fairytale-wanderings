<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAboutStore } from '@/stores/about'
import { MAX_ABOUT_IMAGES, MAX_SELLER_LINKS, type AboutData } from '@/api/about'
import ImageSlotsField from '@/components/crm/ImageSlotsField.vue'
import {
  releaseSlots,
  savedSlots,
  slotFiles,
  slotPaths,
  type ImageSlot,
} from '@/scripts/imageSlots'

// Есть ли несохранённые изменения — CRMView спрашивает подтверждение при уходе.
const dirty = defineModel<boolean>('dirty', { default: false })

const aboutStore = useAboutStore()

type LinkRow = { key: number; label: string; url: string }
type AboutDraft = {
  title: string
  body: string
  fullName: string
  inn: string
  phone: string
  email: string
  links: LinkRow[]
}

let linkSeq = 0

const draft = ref<AboutDraft>(emptyDraft())
const slots = ref<ImageSlot[]>([])
const baseline = ref('')
const saving = ref(false)
const saveError = ref('')
const savedNote = ref(false)
// Ключ галереи: смена ключа пересоздаёт поле и сбрасывает его устаревшее предупреждение
// о лишних фото — оно локальное и иначе пережило бы загрузку и сохранение.
const galleryKey = ref(0)

function emptyDraft(): AboutDraft {
  return { title: '', body: '', fullName: '', inn: '', phone: '', email: '', links: [] }
}

// Снимок формы для сравнения: ключи строк ссылок не важны, у фото важен состав и порядок.
function snapshot(): string {
  const { links, ...rest } = draft.value
  return JSON.stringify({
    ...rest,
    links: links.map(({ label, url }) => ({ label, url })),
    images: slots.value.map((slot) => slot.path ?? slot.key),
  })
}

function fillFrom(data: AboutData) {
  releaseSlots(slots.value)
  galleryKey.value++
  draft.value = {
    title: data.about.title,
    body: data.about.body,
    fullName: data.seller.fullName,
    inn: data.seller.inn,
    phone: data.seller.phone,
    email: data.seller.email,
    links: data.seller.links.map((link) => ({ key: linkSeq++, ...link })),
  }
  slots.value = savedSlots(data.about.images)
  baseline.value = snapshot()
}

const isDirty = computed(() => baseline.value !== '' && snapshot() !== baseline.value)
const canSave = computed(() => isDirty.value && !saving.value)
const canAddLink = computed(() => draft.value.links.length < MAX_SELLER_LINKS)

watch(isDirty, (value) => {
  dirty.value = value
  if (value) savedNote.value = false
})

onMounted(async () => {
  // Данные грузим при первом открытии раздела; дальше берём из стора.
  if (!aboutStore.data) await aboutStore.loadAbout()
  if (aboutStore.data) fillFrom(aboutStore.data)
})

async function retry() {
  await aboutStore.loadAbout()
  if (aboutStore.data) fillFrom(aboutStore.data)
}

onBeforeUnmount(() => releaseSlots(slots.value))

function addLink() {
  draft.value.links.push({ key: linkSeq++, label: '', url: '' })
}

function removeLink(index: number) {
  draft.value.links.splice(index, 1)
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    const d = draft.value
    await aboutStore.save({
      title: d.title,
      body: d.body,
      existingImages: slotPaths(slots.value),
      images: slotFiles(slots.value),
      seller: {
        fullName: d.fullName,
        inn: d.inn,
        phone: d.phone,
        email: d.email,
        // Совсем пустые строки ссылок не отправляем — их просто не стали заполнять.
        links: d.links
          .filter((link) => link.label.trim() || link.url.trim())
          .map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
      },
    })
    if (aboutStore.data) fillFrom(aboutStore.data)
    savedNote.value = true
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="head">
    <h1 class="crm-h1">Обо мне</h1>
    <p class="crm-subtitle">
      Страница
      <a href="/about" target="_blank" rel="noopener noreferrer" class="page-link">/about</a> на
      сайте. Пустые блоки на ней скрываются.
    </p>
  </div>

  <div v-if="aboutStore.loading" class="state">Загрузка…</div>

  <div v-else-if="aboutStore.error" class="crm-panel state state-error">
    <p>{{ aboutStore.error }}</p>
    <button type="button" class="crm-btn crm-btn-sm" @click="retry">Повторить</button>
  </div>

  <form v-else class="sections" @submit.prevent="save">
    <section class="crm-panel section">
      <h2 class="section-title">Рассказ</h2>

      <div class="field">
        <label class="crm-label" for="about-title">Заголовок</label>
        <input
          id="about-title"
          v-model="draft.title"
          type="text"
          maxlength="120"
          class="crm-input"
          placeholder="Например, Как я начала вязать"
        />
      </div>

      <div class="field">
        <label class="crm-label" for="about-body">Текст</label>
        <textarea
          id="about-body"
          v-model="draft.body"
          rows="12"
          maxlength="10000"
          class="crm-input"
          placeholder="Расскажите о себе и своих игрушках"
        ></textarea>
        <p class="hint">Пустая строка — новый абзац.</p>
      </div>

      <ImageSlotsField
        :key="galleryKey"
        v-model="slots"
        label="Фото"
        :max="MAX_ABOUT_IMAGES"
        hint="Первое фото — обложка: оно же в превью ссылки в мессенджерах."
      />
    </section>

    <section class="crm-panel section">
      <h2 class="section-title">Продавец</h2>
      <p class="hint">Эти данные нужны для проверки магазина в Робокассе.</p>

      <div class="grid-2">
        <div class="field">
          <label class="crm-label" for="seller-name">ФИО</label>
          <input
            id="seller-name"
            v-model="draft.fullName"
            type="text"
            maxlength="120"
            class="crm-input"
          />
        </div>
        <div class="field">
          <label class="crm-label" for="seller-inn">ИНН</label>
          <input
            id="seller-inn"
            v-model="draft.inn"
            type="text"
            inputmode="numeric"
            maxlength="12"
            class="crm-input"
            placeholder="12 цифр"
          />
        </div>
        <div class="field">
          <label class="crm-label" for="seller-phone">Телефон</label>
          <input
            id="seller-phone"
            v-model="draft.phone"
            type="tel"
            maxlength="30"
            class="crm-input"
            placeholder="+7 900 000-00-00"
          />
        </div>
        <div class="field">
          <label class="crm-label" for="seller-email">Почта</label>
          <input id="seller-email" v-model="draft.email" type="email" class="crm-input" />
        </div>
      </div>

      <div class="field">
        <label class="crm-label">Ссылки</label>
        <div v-for="(link, i) in draft.links" :key="link.key" class="link-row">
          <input
            v-model="link.label"
            type="text"
            maxlength="40"
            class="crm-input"
            placeholder="Telegram"
            aria-label="Название ссылки"
          />
          <input
            v-model="link.url"
            type="url"
            class="crm-input"
            placeholder="https://t.me/…"
            aria-label="Адрес ссылки"
          />
          <button
            type="button"
            class="crm-icon-btn danger"
            aria-label="Убрать ссылку"
            title="Убрать"
            @click="removeLink(i)"
          >
            ✕
          </button>
        </div>
        <button v-if="canAddLink" type="button" class="add-link" @click="addLink">
          + добавить ссылку
        </button>
      </div>
    </section>

    <div class="foot">
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
      <p v-else-if="savedNote" class="saved-note">Сохранено</p>
      <button type="submit" class="crm-btn" :disabled="!canSave">
        {{ saving ? 'Сохранение…' : 'Сохранить' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.head {
  margin-bottom: 22px;
}
.page-link {
  color: var(--brand-accent);
}
.state {
  padding: 28px;
  color: #8a7458;
}
.state-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #b0623f;
}
.sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 760px;
}
.section {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-title {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 20px;
  color: #2e2113;
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
.hint {
  margin: 0;
  font-size: 12px;
  color: #a08a6a;
}
.link-row {
  display: grid;
  grid-template-columns: 1fr 1.8fr 34px;
  gap: 8px;
  align-items: center;
}
.add-link {
  align-self: flex-start;
  appearance: none;
  border: none;
  background: transparent;
  color: var(--brand-accent);
  cursor: pointer;
  font: 500 13px 'Spline Sans';
  padding: 2px 0;
}
.add-link:hover {
  color: var(--brand-accent-strong);
}
.foot {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
}
.save-error {
  margin: 0;
  margin-right: auto;
  font-size: 13px;
  color: #b0623f;
}
.saved-note {
  margin: 0;
  margin-right: auto;
  font-size: 13px;
  color: #5f7a45;
}
@media (max-width: 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
