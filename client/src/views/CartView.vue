<script setup lang="ts">
import { onMounted } from 'vue'
import Header from '@/components/global/Header.vue'
import { useCartStore } from '@/stores/cart'
import MakeOrderButton from '@/components/global/MakeOrderButton.vue'
import FormField from '@/components/global/FormField.vue'
import { isTelegram } from '@/scripts/telegram'
import { imageUrl } from '@/scripts/images'
import { getMe } from '@/api/users'

const cartStore = useCartStore()

// Для заказа из Телеграма — предзаполняем телефон из профиля (если он там есть
// и поле ещё пустое). Ошибку глушим: предзаполнение необязательно.
onMounted(async () => {
  if (!isTelegram()) return
  try {
    const me = await getMe()
    if (me?.phone && !cartStore.phone) {
      cartStore.phone = me.phone
    }
  } catch {
    // не критично — пользователь введёт телефон вручную
  }
})
</script>

<template>
  <article>
    <div
      class="relative flex size-full flex-col justify-between lg:justify-start overflow-x-hidden"
    >
      <Header :BackLink="'/'" />

      <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Корзина
      </h2>
      <div
        v-for="{ product, quantity } in cartStore.items"
        :key="product._id"
        class="flex gap-4 justify-between"
        :class="{ 'bg-red-50 rounded-lg': cartStore.isInsufficient(product) }"
      >
        <div class="flex gap-4 px-4 py-3">
          <div
            class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-[70px]"
            :style="{
              backgroundImage: `url(${imageUrl(product.image?.[0])})`,
            }"
          ></div>
          <div class="flex flex-1 flex-col justify-center">
            <p class="text-base font-medium leading-normal">{{ product.name }}</p>
            <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">
              {{ product.category }}
            </p>
            <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">Кол-во: {{ quantity }}</p>
            <p
              v-if="cartStore.isInsufficient(product)"
              class="text-red-600 text-sm font-medium leading-normal"
            >
              В наличии только {{ product.stock }} шт.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4 pr-4">
          <button
            @click="cartStore.removeProduct(product)"
            class="text-xl cursor-pointer bg-(--color-background-mute) font-bold leading-normal tracking-[0.015em] rounded-lg size-10"
          >
            -
          </button>
          <button
            @click="cartStore.addProduct(product)"
            class="text-xl cursor-pointer bg-(--color-background-mute) font-bold leading-normal tracking-[0.015em] rounded-lg size-10"
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
          <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">Сумма</p>
          <p class="text-sm font-normal leading-normal text-right">{{ cartStore.totalPrice }}</p>
        </div>
        <!-- <div class="flex justify-between gap-x-6 py-2">
          <p class="text-[var(--vt-c-text-light-2)] text-sm font-normal leading-normal">Доставка</p>
          <p class="text-sm font-normal leading-normal text-right">{{ deliveryCost }}</p>
        </div> -->
        <div class="flex justify-between gap-x-6 py-2">
          <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">
            Итог (без учета доставки)
          </p>
          <p class="text-sm font-normal leading-normal text-right">
            {{ cartStore.totalPrice }}
          </p>
        </div>
      </div>
      <div class="flex max-w-[480px] flex-col gap-4 px-4 py-3">
        <FormField
          v-model="cartStore.address"
          label="Адрес доставки"
          placeholder="Введите адрес доставки"
          :has-error="cartStore.showValidationErrors && !cartStore.isAddressValid"
        />
        <FormField
          v-model="cartStore.name"
          label="Имя и фамилия"
          placeholder="Введите имя и фамилию"
          :has-error="cartStore.showValidationErrors && !cartStore.isNameValid"
        />
        <FormField
          v-model="cartStore.phone"
          label="Номер телефона"
          placeholder="+7 (999) 999-99-99"
          mask="+7 (###) ###-##-##"
          type="tel"
          inputmode="tel"
          :has-error="cartStore.showValidationErrors && !cartStore.isPhoneValid"
        />
        <FormField
          v-model="cartStore.email"
          label="Почта (необязательно)"
          placeholder="you@example.com"
          type="email"
          inputmode="email"
          :has-error="cartStore.showValidationErrors && !cartStore.isEmailValid"
        />
      </div>
    </div>
    <div>
      <p
        v-if="cartStore.orderError"
        class="px-4 pb-1 text-red-600 text-sm font-medium leading-normal text-center"
      >
        {{ cartStore.orderError }}
      </p>
      <div class="flex px-4 py-3">
        <MakeOrderButton class="truncate" text="Оформить заказ (без оплаты)" />
      </div>
    </div>
  </article>
</template>
