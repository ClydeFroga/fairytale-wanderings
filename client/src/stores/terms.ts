import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getTerms, saveTerms, type TermsData, type TermsInput } from '@/api/terms'

// Условия читают и витрина (подвал, корзина, страница), и CRM.
export const useTermsStore = defineStore('terms', () => {
  const data = ref<TermsData | null>(null)
  const loading = ref(false)
  const error = ref('')
  let pending: Promise<void> | null = null

  async function loadTerms() {
    loading.value = true
    error.value = ''
    try {
      data.value = await getTerms()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить условия'
    } finally {
      loading.value = false
    }
  }

  /**
   * Витрина грузит условия один раз за сессию: подвал, корзина и страница
   * зовут это одновременно, а запрос уходит один. После ошибки — повторит.
   */
  function ensureLoaded(): Promise<void> {
    if (data.value) return Promise.resolve()
    pending ??= loadTerms().finally(() => (pending = null))
    return pending
  }

  // Ошибку не глотаем: форма показывает её в баннере у кнопки «Сохранить».
  async function save(input: TermsInput) {
    data.value = await saveTerms(input)
  }

  return { data, loading, error, loadTerms, ensureLoaded, save }
})
