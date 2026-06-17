<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import { useCartStore } from '@/stores/cart'
import { ROOT_URL } from '@/config'
import { onMounted, ref } from 'vue'
import MakeOrderButton from '@/components/global/MakeOrderButton.vue'

const deliveryCost = ref(20)

// console.log(window.Telegram.WebApp.initDataUnsafe)

const cartStore = useCartStore()
</script>

<template>
  <article>
    <div
      class="relative flex size-full flex-col justify-between lg:justify-start overflow-x-hidden"
    >
      <Header :BackLink="'/store'" />

      <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Корзина
      </h2>
      <div
        v-for="[product, quantity] of cartStore.products.entries()"
        :key="product._id"
        class="flex gap-4 justify-between"
      >
        <div class="flex gap-4 px-4 py-3">
          <div
            class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-[70px]"
            :style="{
              backgroundImage: `url(${product.image[0]})`,
            }"
          ></div>
          <div class="flex flex-1 flex-col justify-center">
            <p class="text-base font-medium leading-normal">{{ product.name }}</p>
            <p class="text-[#97704e] text-sm font-normal leading-normal">
              {{ product.category }}
            </p>
            <p class="text-[#97704e] text-sm font-normal leading-normal">Кол-во: {{ quantity }}</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button
            @click="cartStore.removeProduct(product)"
            class="text-xl cursor-pointer bg-[var(--color-background-mute)] font-bold leading-normal tracking-[0.015em] rounded-lg size-10"
          >
            -
          </button>
          <button
            @click="cartStore.addProduct(product)"
            class="text-xl cursor-pointer bg-[var(--color-background-mute)] font-bold leading-normal tracking-[0.015em] rounded-lg size-10"
          >
            +
          </button>
        </div>
      </div>
      <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Детали заказа
      </h2>
      <div class="p-4">
        <div class="flex justify-between gap-x-6 py-2">
          <p class="text-[var(--vt-c-text-light-2)] text-sm font-normal leading-normal">Сумма</p>
          <p class="text-sm font-normal leading-normal text-right">{{ cartStore.totalPrice }}</p>
        </div>
        <div class="flex justify-between gap-x-6 py-2">
          <p class="text-[var(--vt-c-text-light-2)] text-sm font-normal leading-normal">Доставка</p>
          <p class="text-sm font-normal leading-normal text-right">{{ deliveryCost }}</p>
        </div>
        <div class="flex justify-between gap-x-6 py-2">
          <p class="text-[var(--vt-c-text-light-2)] text-sm font-normal leading-normal">Итог</p>
          <p class="text-sm font-normal leading-normal text-right">
            {{ cartStore.totalPrice + deliveryCost }}
          </p>
        </div>
      </div>
      <div class="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
        <label class="flex flex-col min-w-40 flex-1">
          <p class="text-base font-medium leading-normal pb-2">Адрес доставки</p>
          <input
            placeholder=""
            class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl focus:outline-0 focus:ring-0 border border-[#e7dbd0] bg-[#fcfaf8] focus:border-[#e7dbd0] h-14 placeholder:text-[#97704e] p-[15px] text-base font-normal leading-normal"
            value=""
          />
        </label>
      </div>
    </div>
    <div>
      <div class="flex px-4 py-3">
        <MakeOrderButton
          class="truncate"
          text="Оформить заказ (без оплаты)"
          :products="cartStore.products"
        />
      </div>
    </div>
  </article>
</template>
