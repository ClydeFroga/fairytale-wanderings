<script setup lang="ts">
// Имя из двух слов: «Footer» — одно слово, а eslint (vue/multi-word-component-names) такое не пропускает.
defineOptions({ name: 'SiteFooter' })

// Сюда же потом добавятся оферта и условия оплаты, доставки и возврата —
// Робокасса проверяет, что эти ссылки видны на сайте.
const links = [{ to: '/about', label: 'Обо мне' }]
</script>

<template>
  <footer class="footer">
    <nav aria-label="Информация о магазине">
      <ul class="footer-links">
        <li v-for="link in links" :key="link.to">
          <RouterLink :to="link.to" class="footer-link">{{ link.label }}</RouterLink>
        </li>
      </ul>
    </nav>
    <p class="footer-copy">© Сказка Странствий</p>
  </footer>
</template>

<style scoped>
.footer {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 16px 32px;
  border-top: 1px solid var(--vt-c-divider-light-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.875rem;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.footer-link {
  text-decoration: underline;
}
.footer-copy {
  margin: 0;
  color: var(--vt-c-text-light-2);
}
</style>
