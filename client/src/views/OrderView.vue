<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import Button from '@/components/global/Button.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { createPaymentLink, getPublicOrder, type PublicOrder } from '@/api/orders'

// Сюда покупатель возвращается с Робокассы (Success/Fail URL) и попадает после
// оформления без онлайн-оплаты. Статус «оплачен» ставит сервер по уведомлению
// Робокассы — оно может прийти чуть позже возврата, поэтому недолго опрашиваем.
const POLL_INTERVAL_MS = 3000
const POLL_LIMIT_MS = 30_000

const route = useRoute()
const router = useRouter()
const orderId = String(route.params.id)

const order = ref<PublicOrder | null>(null)
const notFound = ref(false)
const loadError = ref('')
const payError = ref('')
const paying = ref(false)
const polling = ref(false)
const now = ref(Date.now())

let timer: ReturnType<typeof setInterval> | null = null

type ViewState = 'loading' | 'paid' | 'awaiting' | 'expired' | 'cancelled' | 'accepted'

const state = computed<ViewState>(() => {
  const current = order.value
  if (!current) return 'loading'
  if (current.status === 'cancelled') return 'cancelled'
  if (current.status !== 'created') return 'paid'
  // Без срока — заказ оформлен без онлайн-оплаты, владелица свяжется сама.
  if (!current.paymentExpiresAt) return 'accepted'
  return new Date(current.paymentExpiresAt).getTime() > now.value ? 'awaiting' : 'expired'
})

async function load() {
  try {
    order.value = await getPublicOrder(orderId)
    loadError.value = ''
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound.value = true
    } else {
      loadError.value = 'Не удалось загрузить заказ. Обновите страницу.'
    }
  }
}

function stopPolling() {
  if (timer) clearInterval(timer)
  timer = null
  polling.value = false
}

function startPolling() {
  const startedAt = Date.now()
  polling.value = true
  timer = setInterval(async () => {
    now.value = Date.now()
    await load()
    if (state.value !== 'awaiting' || Date.now() - startedAt >= POLL_LIMIT_MS) stopPolling()
  }, POLL_INTERVAL_MS)
}

async function pay() {
  paying.value = true
  payError.value = ''
  try {
    const { paymentUrl } = await createPaymentLink(orderId)
    window.location.href = paymentUrl
  } catch (error) {
    if (error instanceof ApiError && error.code === 'PAYMENT_EXPIRED') {
      await load()
    } else {
      payError.value = 'Не удалось перейти к оплате. Попробуйте позже.'
    }
    paying.value = false
  }
}

onMounted(async () => {
  await load()
  if (state.value === 'awaiting') startPolling()
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <article class="flex size-full min-h-screen flex-col justify-between overflow-x-hidden">
    <div>
      <Header :backButton="false" :BackLink="'/'" />

      <div class="flex flex-col items-center gap-4 px-4 pt-16 text-center">
        <template v-if="notFound">
          <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">Заказ не найден</h2>
        </template>

        <p v-else-if="loadError" class="text-red-600 text-sm font-medium">{{ loadError }}</p>

        <template v-else-if="state === 'paid'">
          <div
            class="flex size-20 items-center justify-center rounded-full bg-[#e88630] text-4xl text-(--vt-c-black)"
          >
            ✓
          </div>
          <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Заказ №{{ order!.number }} оплачен
          </h2>
          <p class="text-(--vt-c-text-light-2) text-base font-normal leading-normal max-w-[320px]">
            Спасибо! Мы начинаем собирать заказ и напишем, когда отправим его.
          </p>
        </template>

        <template v-else-if="state === 'awaiting'">
          <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Заказ №{{ order!.number }}
          </h2>
          <p class="text-(--vt-c-text-light-2) text-base font-normal leading-normal max-w-[320px]">
            {{
              polling
                ? 'Ждём подтверждения оплаты…'
                : 'Оплата пока не поступила. Если вы не завершили оплату, её можно продолжить.'
            }}
          </p>
          <div v-if="!polling" class="flex px-4 py-3">
            <Button
              :text="paying ? 'Переходим к оплате…' : `Оплатить ${order!.totalPrice.toLocaleString('ru-RU')} ₽`"
              :disabled="paying"
              @click="pay"
            />
          </div>
          <p v-if="payError" class="text-red-600 text-sm font-medium">{{ payError }}</p>
        </template>

        <template v-else-if="state === 'expired' || state === 'cancelled'">
          <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Заказ №{{ order!.number }} отменён
          </h2>
          <p class="text-(--vt-c-text-light-2) text-base font-normal leading-normal max-w-[320px]">
            {{
              state === 'expired'
                ? 'Время на оплату истекло. Соберите корзину заново — товары вернулись в продажу.'
                : 'Если это недоразумение — напишите нам, всё поправим.'
            }}
          </p>
        </template>

        <template v-else-if="state === 'accepted'">
          <div
            class="flex size-20 items-center justify-center rounded-full bg-[#e88630] text-4xl text-(--vt-c-black)"
          >
            ✓
          </div>
          <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Заказ №{{ order!.number }} принят
          </h2>
          <p class="text-(--vt-c-text-light-2) text-base font-normal leading-normal max-w-[320px]">
            Спасибо за заказ! Мы свяжемся с вами для подтверждения деталей доставки и оплаты.
          </p>
        </template>

        <div v-if="state !== 'awaiting' && state !== 'loading'" class="flex px-4 py-3">
          <Button text="Вернуться в магазин" @click="router.push('/')" />
        </div>
      </div>
    </div>
  </article>
</template>
