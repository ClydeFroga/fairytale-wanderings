<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { Order } from '@/scripts/Order'
import { ApiError } from '@/api/client'
import type { StockShortage } from '@/api/orders'

defineProps<{ text: string }>()

const cartStore = useCartStore()
const router = useRouter()

// Пока запрос в пути, второй клик создал бы второй заказ — и второй резерв остатка.
const sending = defineModel<boolean>('sending', { default: false })
const disabled = computed(() => cartStore.totalQuantity === 0 || sending.value)

const DELIVERY_ERRORS = new Set(['CDEK_API_ERROR', 'CDEK_INVALID_TARIFF', 'CDEK_POINT_NOT_FOUND'])

const makeOrder = async () => {
  const order = new Order({
    items: cartStore.items,
    delivery: cartStore.deliveryPayload,
    name: cartStore.name,
    phone: cartStore.phone,
    email: cartStore.email,
  })

  sending.value = true
  try {
    const created = await order.send()
    cartStore.clear()

    // С онлайн-оплатой — сразу на страницу Робокассы (и в Mini App тоже);
    // вернётся покупатель на /order/:id через Success/Fail URL. Корзину в истории
    // заменяем страницей заказа: «Назад» с Робокассы приведёт к ней, а там
    // статус и «Оплатить» ещё раз.
    if (created.paymentUrl) {
      await router.replace(`/order/${created.id}`)
      window.location.href = created.paymentUrl
      return
    }
    router.push(`/order/${created.id}`)
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK') {
      const shortages = (error.details as { shortages?: StockShortage[] } | undefined)?.shortages
      await cartStore.handleStockShortage(shortages ?? [])
      return
    }

    if (error instanceof ApiError && error.code === 'DELIVERY_PRICE_CHANGED') {
      const price = (error.details as { price?: number } | undefined)?.price ?? 0
      await cartStore.handleDeliveryPriceChanged(price)
      return
    }

    if (error instanceof ApiError && error.code && DELIVERY_ERRORS.has(error.code)) {
      cartStore.orderError = 'Не удалось рассчитать доставку. Выберите пункт выдачи ещё раз.'
      cartStore.cdekSelection = null
      return
    }

    console.error(error)
    cartStore.orderError = 'Не удалось оформить заказ. Попробуйте позже.'
  } finally {
    sending.value = false
    if (cartStore.orderError) {
      await nextTick()
      document
        .querySelector('.form-status')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}

async function submit() {
  if (sending.value) return
  if (!cartStore.validateOrderForm()) {
    await nextTick()
    document
      .querySelector('.checkout .has-error')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  await makeOrder()
}

defineExpose({ submit })
</script>

<template>
  <button type="submit" class="btn-pay" :disabled="disabled">{{ text }}</button>
</template>
