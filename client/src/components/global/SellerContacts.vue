<script setup lang="ts">
import type { SellerInfo } from '@/api/about'
import { hasDialableDigits, telHref } from '@/scripts/about'

// Реквизиты и контакты продавца: на «Обо мне» и на «Покупателям». Пустые строки не выводятся.
defineProps<{ seller: SellerInfo }>()
</script>

<template>
  <p v-if="seller.fullName">{{ seller.fullName }}</p>
  <p v-if="seller.inn">Самозанятая, ИНН {{ seller.inn }}</p>
  <p v-if="seller.phone">
    <!-- Без цифр звонить некуда — показываем номер обычным текстом, без ссылки. -->
    <a v-if="hasDialableDigits(seller.phone)" :href="telHref(seller.phone)" class="underline">{{
      seller.phone
    }}</a>
    <template v-else>{{ seller.phone }}</template>
  </p>
  <p v-if="seller.email">
    <a :href="`mailto:${seller.email}`" class="underline">{{ seller.email }}</a>
  </p>
  <ul v-if="seller.links.length" class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
    <!-- Список статичный, а адреса у двух ссылок могут совпасть — ключ по индексу. -->
    <li v-for="(link, i) in seller.links" :key="i">
      <a :href="link.url" target="_blank" rel="noopener noreferrer" class="underline">
        {{ link.label }}
      </a>
    </li>
  </ul>
</template>
