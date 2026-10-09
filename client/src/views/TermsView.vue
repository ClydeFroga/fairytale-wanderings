<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from '@/components/global/Header.vue'
import DocumentLink from '@/components/global/DocumentLink.vue'
import SellerContacts from '@/components/global/SellerContacts.vue'
import { useTermsStore } from '@/stores/terms'
import { formatDocumentDate, type DocumentKind } from '@/api/terms'
import { hasSellerInfo, paragraphs } from '@/scripts/about'

const SHOP_NAME = 'Сказка странствий'
document.title = `Оплата, доставка и возврат — ${SHOP_NAME}`

const route = useRoute()
const termsStore = useTermsStore()
const loaded = ref(false)

onMounted(async () => {
  // Ошибку загрузки стор запоминает сам; страница тогда покажет заглушку.
  await termsStore.ensureLoaded()
  loaded.value = true
})

const sections = computed(() => {
  const data = termsStore.data
  return [
    { id: 'payment', title: 'Оплата', paragraphs: paragraphs(data?.payment ?? '') },
    { id: 'delivery', title: 'Доставка', paragraphs: paragraphs(data?.delivery ?? '') },
    { id: 'returns', title: 'Возврат и обмен', paragraphs: paragraphs(data?.returns ?? '') },
  ].filter((section) => section.paragraphs.length > 0)
})

const seller = computed(() => termsStore.data?.seller ?? null)
const hasSeller = computed(() => hasSellerInfo(seller.value))

const DOCUMENTS: { kind: DocumentKind; label: string }[] = [
  { kind: 'offer', label: 'Публичная оферта' },
  { kind: 'privacy', label: 'Политика конфиденциальности' },
]
const documents = computed(() =>
  DOCUMENTS.flatMap((doc) => {
    const info = termsStore.data?.[doc.kind]
    return info ? [{ ...doc, updatedAt: formatDocumentDate(info.updatedAt) }] : []
  }),
)

const isEmpty = computed(
  () => !sections.value.length && !hasSeller.value && !documents.value.length,
)

// Ссылки подвала ведут на разделы (/terms#delivery). Разделы появляются только
// после загрузки, поэтому прокручиваем сами — роутер к этому моменту элемента не видел.
watch(
  [() => route.hash, loaded],
  async ([hash, ready]) => {
    if (!hash || !ready) return
    await nextTick()
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  },
  { immediate: true },
)
</script>

<template>
  <article class="flex min-h-screen flex-col">
    <Header :BackLink="'/'" />

    <div v-if="loaded" class="flex flex-col gap-6 p-4">
      <h1 class="text-[28px] font-bold leading-tight tracking-[-0.015em]">Покупателям</h1>

      <p v-if="isEmpty" class="text-(--vt-c-text-light-2) text-base">
        Скоро здесь появятся условия покупки
      </p>

      <section
        v-for="section in sections"
        :id="section.id"
        :key="section.id"
        class="flex scroll-mt-4 flex-col gap-3"
      >
        <h2 class="text-xl font-bold">{{ section.title }}</h2>
        <!-- Только интерполяция: текст из CRM не может принести разметку или скрипт. -->
        <p
          v-for="(paragraph, i) in section.paragraphs"
          :key="i"
          class="paragraph text-base leading-relaxed"
        >
          {{ paragraph }}
        </p>
      </section>

      <section
        v-if="hasSeller && seller"
        id="contacts"
        class="flex scroll-mt-4 flex-col gap-1 text-base"
      >
        <h2 class="mb-2 text-xl font-bold">Контакты и реквизиты</h2>
        <SellerContacts :seller="seller" />
      </section>

      <section
        v-if="documents.length"
        id="documents"
        class="flex scroll-mt-4 flex-col gap-2 text-base"
      >
        <h2 class="mb-1 text-xl font-bold">Документы</h2>
        <p v-for="doc in documents" :key="doc.kind">
          <DocumentLink :kind="doc.kind" class="underline">{{ doc.label }}</DocumentLink>
          <span class="text-(--vt-c-text-light-2) text-sm"> · обновлено {{ doc.updatedAt }}</span>
        </p>
      </section>
    </div>
  </article>
</template>

<style scoped>
/* Одиночный перенос строки внутри абзаца сохраняем, как его ввела владелица. */
.paragraph {
  white-space: pre-line;
}
</style>
