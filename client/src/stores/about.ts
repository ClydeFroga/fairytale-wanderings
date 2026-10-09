import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getAbout, saveAbout, type AboutData, type AboutInput } from '@/api/about'

// Страница «Обо мне» в CRM. Витрина читает getAbout напрямую — ей стор не нужен.
export const useAboutStore = defineStore('about', () => {
  const data = ref<AboutData | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function loadAbout() {
    loading.value = true
    error.value = ''
    try {
      data.value = await getAbout()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить страницу «Обо мне»'
    } finally {
      loading.value = false
    }
  }

  // Ошибку не глотаем: форма показывает её в баннере у кнопки «Сохранить».
  async function save(input: AboutInput) {
    data.value = await saveAbout(input)
  }

  return { data, loading, error, loadAbout, save }
})
