<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Header from '@/components/global/Header.vue'
import Gallery from '@/components/global/Gallery.vue'
import SellerContacts from '@/components/global/SellerContacts.vue'
import { getAbout, type AboutData } from '@/api/about'
import { imageUrls } from '@/scripts/images'
import { hasSellerInfo, paragraphs } from '@/scripts/about'

const SHOP_NAME = 'Сказка странствий'

const data = ref<AboutData | null>(null)
const loaded = ref(false)

onMounted(async () => {
  try {
    data.value = await getAbout()
  } catch (error) {
    // Страница видна и без данных — покажем заглушку.
    console.error(error)
  } finally {
    loaded.value = true
  }
})

const title = computed(() => data.value?.about.title || 'Обо мне')
const gallery = computed(() => imageUrls(data.value?.about.images))
const text = computed(() => paragraphs(data.value?.about.body ?? ''))
const seller = computed(() => data.value?.seller ?? null)
const hasSeller = computed(() => hasSellerInfo(seller.value))

watch(title, (value) => (document.title = `${value} — ${SHOP_NAME}`), { immediate: true })
</script>

<template>
  <article class="flex min-h-screen flex-col">
    <Header :BackLink="'/'" />

    <div v-if="loaded" class="flex flex-col gap-4 p-4">
      <Gallery v-if="gallery.length" :image="gallery" />

      <h1 class="text-[28px] font-bold leading-tight tracking-[-0.015em]">{{ title }}</h1>

      <div v-if="text.length" class="flex flex-col gap-3">
        <!-- Только интерполяция: текст из CRM не может принести разметку или скрипт. -->
        <p v-for="(paragraph, i) in text" :key="i" class="paragraph text-base leading-relaxed">
          {{ paragraph }}
        </p>
      </div>
      <p v-else class="text-(--vt-c-text-light-2) text-base">Скоро здесь будет рассказ</p>

      <section
        v-if="hasSeller && seller"
        class="mt-4 flex flex-col gap-1 border-t border-t-(--vt-c-divider-light-1) pt-4 text-sm"
      >
        <h2 class="mb-1 text-lg font-bold">Продавец</h2>
        <SellerContacts :seller="seller" />
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
