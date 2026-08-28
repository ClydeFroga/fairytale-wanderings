import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { IProduct } from '@/types/product'
import type { OrderDelivery, StockShortage } from '@/api/orders'
import { getProduct } from '@/api/products'

export interface CartItem {
  product: IProduct
  quantity: number
}

/** Что покупатель выбрал в виджете СДЭК: точка, тариф, цена и срок. */
export interface CdekSelection {
  method: 'cdek_office' | 'cdek_door'
  pointCode: string | null // код ПВЗ; у курьерской доставки его нет
  address: string
  tariffName: string
  tariffCode: number | null
  price: number
  periodMin: number | null
  periodMax: number | null
}

/** Способ доставки: карта ПВЗ СДЭК или адрес, введённый руками. */
export type DeliveryMode = 'cdek' | 'manual'

export const useCartStore = defineStore('cart', () => {
  // Ключуем по _id, а не по объекту: в разных местах приходят разные экземпляры
  // товара (из списка, со страницы товара, после перезагрузки остатков).
  const entriesById = ref<Map<string, CartItem>>(new Map())
  const address = ref('')
  // Доставка: по умолчанию ручной адрес — виджет СДЭК включается,
  // только если интеграция настроена (GET /cdek/config).
  // Способ доставки покупатель не выбирает: магазин отправляет только СДЭК.
  // 'manual' остаётся запасным режимом на случай, когда виджет недоступен.
  const deliveryMode = ref<DeliveryMode>('manual')
  const cdekSelection = ref<CdekSelection | null>(null)
  // Квартира или офис — обязательна для курьера: виджет спрашивает адрес только
  // до дома, а курьеру нужен точный.
  const deliveryFlat = ref('')
  // Выбор доставки сброшен, потому что изменился состав корзины (см. watch ниже).
  const deliveryStale = ref(false)
  const name = ref('')
  const phone = ref('')
  const email = ref('')
  const showValidationErrors = ref(false)
  const orderError = ref('')
  const insufficientProductIds = ref<Set<string>>(new Set())

  const items = computed(() => Array.from(entriesById.value.values()))

  const isAddressValid = computed(() => address.value.trim().length > 0)
  // В режиме СДЭК адрес не вводят руками — вместо него нужна выбранная точка,
  // а для курьера ещё и номер квартиры.
  const isDeliveryValid = computed(() => {
    if (deliveryMode.value !== 'cdek') return isAddressValid.value

    const cdek = cdekSelection.value
    if (!cdek) return false

    return cdek.method !== 'cdek_door' || deliveryFlat.value.trim().length > 0
  })
  const isNameValid = computed(() => name.value.trim().length > 0)
  const isPhoneValid = computed(() => /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone.value))
  // Почта необязательна (телефон уже есть), но заполненную проверяем на формат.
  const isEmailValid = computed(
    () => email.value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),
  )
  const isOrderFormValid = computed(
    () => isDeliveryValid.value && isNameValid.value && isPhoneValid.value && isEmailValid.value,
  )

  const totalQuantity = computed(() => items.value.reduce((acc, { quantity }) => acc + quantity, 0))

  const totalPrice = computed(() =>
    items.value.reduce((acc, { product, quantity }) => acc + product.price * quantity, 0),
  )

  // Стоимость доставки известна только для выбранной точки СДЭК; при ручном
  // адресе владелица считает её сама и сообщает покупателю.
  const deliveryPrice = computed(() =>
    deliveryMode.value === 'cdek' ? (cdekSelection.value?.price ?? 0) : 0,
  )

  const totalWithDelivery = computed(() => totalPrice.value + deliveryPrice.value)

  /** Часть заказа про доставку — уходит в POST /orders/create как есть. */
  const deliveryPayload = computed<OrderDelivery>(() => {
    const cdek = cdekSelection.value
    if (deliveryMode.value !== 'cdek' || !cdek) {
      return { deliveryMethod: 'manual', deliveryAddress: address.value.trim() }
    }

    const flat = deliveryFlat.value.trim()

    return {
      deliveryMethod: cdek.method,
      // Квартиру дописываем в адрес — отдельного поля в заказе нет, а курьеру
      // и владелице нужен полный адрес одной строкой.
      deliveryAddress:
        cdek.method === 'cdek_door' && flat ? `${cdek.address}, кв. ${flat}` : cdek.address,
      deliveryPointCode: cdek.pointCode ?? undefined,
      deliveryTariffCode: cdek.tariffCode ?? undefined,
      deliveryPrice: cdek.price,
    }
  })

  // Цена доставки считается по весу и объёму посылки, поэтому при изменении
  // состава корзины она устаревает. Сбрасываем выбранную точку — покупатель
  // выберет её заново и увидит актуальную стоимость.
  watch(
    () => items.value.map(({ product, quantity }) => `${product._id}:${quantity}`).join(','),
    () => {
      if (!cdekSelection.value) return
      cdekSelection.value = null
      deliveryStale.value = true
    },
  )

  watch(cdekSelection, (chosen) => {
    if (chosen) deliveryStale.value = false
  })

  /** Включается, когда виджет СДЭК доступен (см. GET /cdek/config). */
  function enableCdekDelivery() {
    deliveryMode.value = 'cdek'
    orderError.value = ''
  }

  function isInsufficient(product: IProduct) {
    return insufficientProductIds.value.has(product._id)
  }

  function quantityOf(product: IProduct): number {
    return entriesById.value.get(product._id)?.quantity ?? 0
  }

  function clearError(productId?: string) {
    orderError.value = ''
    if (productId) {
      insufficientProductIds.value.delete(productId)
    } else {
      insufficientProductIds.value = new Set()
    }
  }

  function addProduct(product: IProduct) {
    const existing = entriesById.value.get(product._id)
    if (existing) {
      existing.quantity += 1
    } else {
      entriesById.value.set(product._id, { product, quantity: 1 })
    }
    clearError(product._id)
  }

  function removeProduct(product: IProduct) {
    const existing = entriesById.value.get(product._id)
    if (!existing) return
    existing.quantity -= 1
    if (existing.quantity <= 0) {
      entriesById.value.delete(product._id)
    }
    clearError(product._id)
  }

  // Перезагружаем товары корзины (остаток мог измениться) и подсвечиваем нехватки.
  async function handleStockShortage(shortages: StockShortage[]) {
    const fresh = await Promise.all(
      Array.from(entriesById.value.keys()).map((id) => getProduct(id)),
    )
    for (const product of fresh) {
      const existing = entriesById.value.get(product._id)
      if (existing) existing.product = product
    }

    insufficientProductIds.value = new Set(shortages.map((s) => s.productId))
    orderError.value =
      'Некоторых товаров не хватает на складе. Уменьшите количество и попробуйте снова.'
  }

  function validateOrderForm() {
    showValidationErrors.value = true
    return isOrderFormValid.value
  }

  function clear() {
    entriesById.value = new Map()
    address.value = ''
    deliveryMode.value = 'manual'
    cdekSelection.value = null
    deliveryFlat.value = ''
    deliveryStale.value = false
    name.value = ''
    phone.value = ''
    email.value = ''
    showValidationErrors.value = false
    orderError.value = ''
    insufficientProductIds.value = new Set()
  }

  return {
    items,
    addProduct,
    removeProduct,
    totalQuantity,
    totalPrice,
    deliveryPrice,
    totalWithDelivery,
    deliveryPayload,
    address,
    deliveryMode,
    enableCdekDelivery,
    cdekSelection,
    deliveryFlat,
    deliveryStale,
    name,
    phone,
    email,
    showValidationErrors,
    isAddressValid,
    isDeliveryValid,
    isNameValid,
    isPhoneValid,
    isEmailValid,
    isOrderFormValid,
    validateOrderForm,
    orderError,
    insufficientProductIds,
    isInsufficient,
    quantityOf,
    clearError,
    handleStockShortage,
    clear,
  }
})
