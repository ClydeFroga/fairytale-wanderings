<script setup lang="ts">
import { onMounted } from 'vue'
import DocumentLink from '@/components/global/DocumentLink.vue'
import { useTermsStore } from '@/stores/terms'

// Имя из двух слов: «Footer» — одно слово, а eslint (vue/multi-word-component-names) такое не пропускает.
defineOptions({ name: 'SiteFooter' })

// Робокасса проверяет, что условия, контакты и оферта видны на сайте — отсюда
// они доступны с любой публичной страницы.
const links = [
  { to: '/about', label: 'Обо мне' },
  { to: '/terms#payment', label: 'Оплата' },
  { to: '/terms#delivery', label: 'Доставка' },
  { to: '/terms#returns', label: 'Возврат' },
  { to: '/terms#contacts', label: 'Контакты' },
]

// Ссылки на файлы показываем, только если владелица их загрузила.
const termsStore = useTermsStore()
onMounted(() => termsStore.ensureLoaded())
</script>

<template>
  <footer class="footer">
    <nav aria-label="Информация о магазине">
      <ul class="footer-links">
        <li v-for="link in links" :key="link.to">
          <RouterLink :to="link.to" class="footer-link">{{ link.label }}</RouterLink>
        </li>
        <li v-if="termsStore.data?.offer">
          <DocumentLink kind="offer" class="footer-link">Публичная оферта</DocumentLink>
        </li>
        <li v-if="termsStore.data?.privacy">
          <DocumentLink kind="privacy" class="footer-link"
            >Политика конфиденциальности</DocumentLink
          >
        </li>
      </ul>
    </nav>
    <p class="footer-copy">© Сказка Странствий</p>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--ink);
  color: #e9e1d6;
  padding: 40px 24px 32px;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 1200px;
}

.footer-link {
  color: #d8cdbf;
  text-decoration: none;
  font-size: 15px;
}

.footer-link:hover {
  color: #fff;
}

.footer-copy {
  max-width: 1200px;
  margin: 20px auto 0;
  padding-top: 20px;
  border-top: 1px solid #4a3e36;
  font-size: 13px;
  color: #a99c8d;
}

@media (max-width: 720px) {
  .footer {
    padding: 28px 16px;
  }
}
</style>
