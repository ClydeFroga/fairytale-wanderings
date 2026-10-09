<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useTermsStore } from '@/stores/terms'
import {
  DOCUMENT_ACCEPT,
  documentProblem,
  documentUrl,
  formatDocumentDate,
  type DocumentKind,
  type TermsData,
} from '@/api/terms'
import { TERMS_DRAFTS } from '@/components/crm/termsDrafts'

// Есть ли несохранённые изменения — CRMView спрашивает подтверждение при уходе.
const dirty = defineModel<boolean>('dirty', { default: false })

const termsStore = useTermsStore()

type TextKey = keyof typeof TERMS_DRAFTS
// Что будет с документом при сохранении: новый файл, удаление или ничего.
type DocDraft = { file: File | null; remove: boolean }

const TEXT_FIELDS: { key: TextKey; label: string; placeholder: string }[] = [
  { key: 'payment', label: 'Оплата', placeholder: 'Как и чем можно оплатить заказ' },
  { key: 'delivery', label: 'Доставка', placeholder: 'Как и в какие сроки отправляете заказ' },
  { key: 'returns', label: 'Возврат и обмен', placeholder: 'Как вернуть или обменять вещь' },
]

const DOC_FIELDS: { kind: DocumentKind; label: string }[] = [
  { kind: 'offer', label: 'Публичная оферта' },
  { kind: 'privacy', label: 'Политика конфиденциальности' },
]

const texts = ref<Record<TextKey, string>>({ payment: '', delivery: '', returns: '' })
const docs = ref<Record<DocumentKind, DocDraft>>({ offer: emptyDoc(), privacy: emptyDoc() })
const fileErrors = ref<Record<DocumentKind, string>>({ offer: '', privacy: '' })
const baseline = ref('')
const saving = ref(false)
const saveError = ref('')
const savedNote = ref(false)

function emptyDoc(): DocDraft {
  return { file: null, remove: false }
}

// Снимок формы для сравнения: у файла важно, какой он, а не сам объект.
function snapshot(): string {
  const docState = (doc: DocDraft) => ({
    file: doc.file ? `${doc.file.name}:${doc.file.size}:${doc.file.lastModified}` : null,
    remove: doc.remove,
  })
  return JSON.stringify({
    texts: texts.value,
    offer: docState(docs.value.offer),
    privacy: docState(docs.value.privacy),
  })
}

function fillFrom(data: TermsData) {
  texts.value = { payment: data.payment, delivery: data.delivery, returns: data.returns }
  docs.value = { offer: emptyDoc(), privacy: emptyDoc() }
  fileErrors.value = { offer: '', privacy: '' }
  baseline.value = snapshot()
}

const isDirty = computed(() => baseline.value !== '' && snapshot() !== baseline.value)
const canSave = computed(() => isDirty.value && !saving.value)

watch(isDirty, (value) => {
  dirty.value = value
  if (value) savedNote.value = false
})

// Ошибка сохранения относится к прежнему содержимому формы: как только его правят — убираем.
watch(snapshot, () => {
  saveError.value = ''
})

onMounted(async () => {
  // Данные грузим при первом открытии раздела; дальше берём из стора.
  if (!termsStore.data) await termsStore.loadTerms()
  if (termsStore.data) fillFrom(termsStore.data)
})

async function retry() {
  await termsStore.loadTerms()
  if (termsStore.data) fillFrom(termsStore.data)
}

function insertDraft(key: TextKey) {
  texts.value[key] = TERMS_DRAFTS[key]
}

function onFileChange(kind: DocumentKind, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // Сбрасываем input, чтобы повторный выбор того же файла тоже сработал.
  input.value = ''
  if (!file) return

  const problem = documentProblem(file)
  fileErrors.value[kind] = problem ?? ''
  if (problem) return
  docs.value[kind] = { file, remove: false }
}

function markRemove(kind: DocumentKind) {
  docs.value[kind] = { file: null, remove: true }
  fileErrors.value[kind] = ''
}

function resetDoc(kind: DocumentKind) {
  docs.value[kind] = emptyDoc()
  fileErrors.value[kind] = ''
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    await termsStore.save({
      ...texts.value,
      offer: docs.value.offer.file,
      privacy: docs.value.privacy.file,
      removeOffer: docs.value.offer.remove,
      removePrivacy: docs.value.privacy.remove,
    })
    if (termsStore.data) fillFrom(termsStore.data)
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
    <h1 class="crm-h1">Покупателям</h1>
    <p class="crm-subtitle">
      Страница
      <a href="/terms" target="_blank" rel="noopener noreferrer" class="page-link">/terms</a> на
      сайте: оплата, доставка, возврат и документы. Пустые разделы на ней скрываются.
    </p>
  </div>

  <div v-if="termsStore.loading" class="state">Загрузка…</div>

  <div v-else-if="termsStore.error" class="crm-panel state state-error">
    <p>{{ termsStore.error }}</p>
    <button type="button" class="crm-btn crm-btn-sm" @click="retry">Повторить</button>
  </div>

  <form v-else class="sections" @submit.prevent="save">
    <!-- Во время сохранения поля заблокированы: набранное за это время затёрлось бы ответом сервера. -->
    <fieldset class="fields" :disabled="saving">
      <section class="crm-panel section">
        <h2 class="section-title">Условия</h2>

        <div v-for="field in TEXT_FIELDS" :key="field.key" class="field">
          <div class="label-row">
            <label class="crm-label" :for="`terms-${field.key}`">{{ field.label }}</label>
            <button
              v-if="!texts[field.key].trim()"
              type="button"
              class="link-btn"
              @click="insertDraft(field.key)"
            >
              Вставить черновик
            </button>
          </div>
          <textarea
            :id="`terms-${field.key}`"
            v-model="texts[field.key]"
            rows="8"
            maxlength="10000"
            class="crm-input"
            :placeholder="field.placeholder"
          ></textarea>
        </div>
        <p class="hint">
          Пустая строка — новый абзац. Черновик — заготовка: прочитайте и поправьте под себя.
        </p>
      </section>

      <section class="crm-panel section">
        <h2 class="section-title">Документы</h2>
        <p class="hint">PDF, DOC, DOCX, ODT или RTF, до 10 МБ. PDF откроется прямо в браузере.</p>

        <div v-for="doc in DOC_FIELDS" :key="doc.kind" class="doc-row">
          <div class="doc-info">
            <span class="crm-label">{{ doc.label }}</span>
            <span v-if="docs[doc.kind].file" class="doc-state">
              Будет загружен: {{ docs[doc.kind].file!.name }}
            </span>
            <span v-else-if="docs[doc.kind].remove" class="doc-state doc-removed">
              Будет удалён
            </span>
            <span v-else-if="termsStore.data?.[doc.kind]" class="doc-state">
              <a :href="documentUrl(doc.kind)" target="_blank" rel="noopener" class="page-link">{{
                termsStore.data[doc.kind]!.name
              }}</a>
              · {{ formatDocumentDate(termsStore.data[doc.kind]!.updatedAt) }}
            </span>
            <span v-else class="doc-state doc-missing">Не загружен</span>
            <span v-if="fileErrors[doc.kind]" class="save-error">{{ fileErrors[doc.kind] }}</span>
          </div>

          <div class="doc-actions">
            <button
              v-if="docs[doc.kind].file || docs[doc.kind].remove"
              type="button"
              class="crm-btn crm-btn-sm crm-btn-ghost"
              @click="resetDoc(doc.kind)"
            >
              Отменить
            </button>
            <template v-else>
              <label class="crm-btn crm-btn-sm crm-btn-ghost file-btn">
                {{ termsStore.data?.[doc.kind] ? 'Заменить' : 'Загрузить' }}
                <input
                  type="file"
                  class="file-input"
                  :accept="DOCUMENT_ACCEPT"
                  @change="onFileChange(doc.kind, $event)"
                />
              </label>
              <button
                v-if="termsStore.data?.[doc.kind]"
                type="button"
                class="crm-btn crm-btn-sm crm-btn-danger"
                @click="markRemove(doc.kind)"
              >
                Удалить
              </button>
            </template>
          </div>
        </div>
      </section>

      <p class="hint">Контакты и реквизиты на странице берутся из раздела «Обо мне».</p>
    </fieldset>

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
/* Fieldset нужен только ради :disabled, поэтому сбрасываем его стили и держим раскладку формы. */
.fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
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
.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.link-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--brand-accent);
  cursor: pointer;
  font: 500 13px 'Spline Sans';
  padding: 0;
}
.link-btn:hover {
  color: var(--brand-accent-strong);
}
.hint {
  margin: 0;
  font-size: 12px;
  color: #a08a6a;
}
.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.doc-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.doc-state {
  font-size: 13px;
  color: #6f5a3e;
  overflow-wrap: anywhere;
}
.doc-removed {
  color: #b0623f;
}
.doc-missing {
  color: #a08a6a;
}
.doc-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.file-btn {
  position: relative;
  cursor: pointer;
}
/* Сам input невидим, но кликабелен через label — так кнопка выглядит как остальные. */
.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
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
  .doc-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
