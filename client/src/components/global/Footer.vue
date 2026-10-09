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
.site-footer {
  background: var(--ink);
  color: #e9e1d6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.footer-inner {
  padding-top: 56px;
  padding-bottom: 40px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 40px;
}

.footer-brand {
  flex: 1 1 280px;
  min-width: 0;
}

.footer-title {
  font-family: var(--serif);
  font-size: 26px;
  margin-bottom: 10px;
}

.footer-brand p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #bfb3a5;
  max-width: 340px;
}

.footer-cols {
  display: flex;
  flex-wrap: wrap;
  gap: 56px;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 15px;
}

.footer-col-title {
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.footer-col a {
  color: #d8cdbf;
  text-decoration: none;
}

.footer-col a:hover {
  color: #fff;
}

.footer-bottom {
  padding-top: 20px;
  padding-bottom: 32px;
  border-top: 1px solid #4a3e36;
  font-size: 13px;
  color: #a99c8d;
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .footer-inner {
    padding-top: 40px;
    padding-bottom: 28px;
    flex-direction: column;
    gap: 28px;
  }

  .footer-title {
    font-size: 24px;
  }

  .footer-brand {
    flex: none;
  }

  .footer-cols {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }

  .footer-bottom {
    padding-top: 16px;
    padding-bottom: 28px;
  }
}
</style>
