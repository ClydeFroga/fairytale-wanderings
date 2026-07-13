<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import Button from '@/components/global/Button.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <article class="flex size-full min-h-screen flex-col justify-between overflow-x-hidden">
    <div>
      <Header :backButton="false" :BackLink="'/'" />

      <div class="flex flex-col items-center gap-4 px-4 pt-16 text-center">
        <div
          class="flex size-20 items-center justify-center rounded-full bg-[#e88630] text-4xl text-[#1b140e]"
        >
          ✓
        </div>
        <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">Заказ принят</h2>
        <p class="text-(--vt-c-text-light-2) text-base font-normal leading-normal max-w-[320px]">
          Спасибо за заказ! Мы свяжемся с вами для подтверждения деталей доставки и оплаты.
        </p>

        <div class="flex px-4 py-3">
          <Button text="Вернуться в магазин" @click="router.push('/')" />
        </div>
      </div>
    </div>
  </article>
</template>
