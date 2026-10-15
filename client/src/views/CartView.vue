<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Header from '@/components/global/Header.vue'
import { useCartStore } from '@/stores/cart'
import MakeOrderButton from '@/components/global/MakeOrderButton.vue'
import FormField from '@/components/global/FormField.vue'
import CdekDelivery from '@/components/global/CdekDelivery.vue'
import DocumentLink from '@/components/global/DocumentLink.vue'
import { isTelegram } from '@/scripts/telegram'
import { imageUrl } from '@/scripts/images'
import { getMe } from '@/api/users'
import { getCdekConfig, type CdekSettings } from '@/api/cdek'
import { getPaymentConfig } from '@/api/payments'
import { buildParcels } from '@/scripts/parcel'
import { useTermsStore } from '@/stores/terms'
import type { IProduct } from '@/types/product'

const cartStore = useCartStore()

// Строка согласия под кнопкой ссылается на файлы оферты и политики, если они загружены.
const termsStore = useTermsStore()
onMounted(() => termsStore.ensureLoaded())

// Настройки виджета СДЭК приходят с сервера. Доставка у магазина одна — СДЭК;
// поле адреса остаётся только как запасной выход, если интеграция не настроена
// или отвалилась: иначе заказ было бы просто не оформить.
const cdekSettings = ref<CdekSettings | null>(null)

// С онлайн-оплатой кнопка ведёт на оплату. Сумма живёт в блоке «Итого».
const paymentEnabled = ref(false)
const orderSending = ref(false)
const orderButton = ref<{ submit: () => Promise<void> } | null>(null)
const orderButtonText = computed(() => (paymentEnabled.value ? 'Оплатить' : 'Оформить заказ'))

const hasItems = computed(() => cartStore.items.length > 0)

const itemsLabel = computed(() => {
  const count = cartStore.totalQuantity
  return `Товары, ${count} шт.`
})

const deliveryRowLabel = computed(() =>
  cartStore.deliveryMode === 'cdek' ? 'Доставка СДЭК' : 'Доставка',
)

const deliveryPending = computed(
  () => cartStore.deliveryMode !== 'cdek' || !cartStore.cdekSelection,
)

const deliverySum = computed(() => {
  if (cartStore.deliveryMode !== 'cdek') return 'сообщим отдельно'
  if (!cartStore.cdekSelection) return 'после выбора пункта'
  return money(cartStore.deliveryPrice)
})

function money(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function lineSum(product: IProduct, quantity: number) {
  return money(product.price * quantity)
}

function submitCheckout() {
  void orderButton.value?.submit()
}

function removeLine(product: IProduct) {
  cartStore.removeItem(product)
}

// Посылка для расчёта доставки: вес и габариты берутся из товаров в корзине,
// у кого не заполнены — из коробки по умолчанию с сервера.
const cdekGoods = computed(() =>
  cdekSettings.value ? buildParcels(cartStore.items, cdekSettings.value.defaultParcel) : [],
)

onMounted(() => {
  document.title = 'Корзина — Сказка странствий'
  document.body.classList.add('cart-page')
})

onUnmounted(() => {
  document.body.classList.remove('cart-page', 'cart-paybar')
})

watch(hasItems, (filled) => document.body.classList.toggle('cart-paybar', filled), {
  immediate: true,
})

onMounted(async () => {
  getPaymentConfig()
    .then((config) => (paymentEnabled.value = config.enabled))
    .catch(() => {
      // не критично — кнопка останется «Оформить заказ»
    })

  try {
    const config = await getCdekConfig()
    if (!config.enabled) return

    cdekSettings.value = config
    cartStore.enableCdekDelivery()
  } catch {
    // не критично — покупатель введёт адрес вручную
  }
})

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
  <div class="cart-page">
    <Header BackLink="/" />

    <div class="container checkout">
      <nav class="breadcrumbs" aria-label="Хлебные крошки">
        <RouterLink to="/#catalog">Каталог</RouterLink>
        <span aria-hidden="true">/</span>
        <span class="crumb-current">Корзина</span>
      </nav>
      <h1>Корзина</h1>

      <div v-if="!hasItems" class="cart-empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#A2412E"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
        <h2>В корзине пока пусто</h2>
        <p>Загляните в каталог — там броши, кружки и фигурки ручной работы.</p>
        <RouterLink to="/#catalog" class="btn-pill">Перейти в каталог</RouterLink>
      </div>

      <form
        v-else
        id="checkout"
        class="checkout-layout"
        novalidate
        @submit.prevent="submitCheckout"
      >
        <div class="checkout-steps">
          <section class="co-card" aria-labelledby="s-items">
            <h2 id="s-items"><span class="co-num">01</span> Товары</h2>
            <ul class="cart-list">
              <li
                v-for="{ product, quantity } in cartStore.items"
                :key="product._id"
                class="cart-item"
                :class="{ 'is-short': cartStore.isInsufficient(product) }"
              >
                <img
                  v-if="imageUrl(product.image?.[0])"
                  :src="imageUrl(product.image?.[0])"
                  :alt="product.name"
                />
                <div v-else class="ci-photo" aria-hidden="true"></div>
                <div class="ci-info">
                  <div v-if="product.category" class="ci-cat">{{ product.category }}</div>
                  <RouterLink class="ci-name" :to="`/product/${product.slug}`">{{
                    product.name
                  }}</RouterLink>
                  <p v-if="cartStore.isInsufficient(product)" class="ci-stock">
                    В наличии только {{ product.stock }} шт.
                  </p>
                  <button type="button" class="ci-remove" @click="removeLine(product)">
                    Удалить
                  </button>
                </div>
                <div class="ci-controls">
                  <div class="qty">
                    <button
                      type="button"
                      aria-label="Уменьшить количество"
                      :disabled="quantity <= 1"
                      @click="cartStore.removeProduct(product)"
                    >
                      −
                    </button>
                    <span class="qty-val">{{ quantity }}</span>
                    <button
                      type="button"
                      aria-label="Увеличить количество"
                      :disabled="quantity >= product.stock"
                      @click="cartStore.addProduct(product)"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    class="ci-remove-icon"
                    aria-label="Удалить"
                    @click="removeLine(product)"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M4 7h16" />
                      <path d="M9 7V5h6v2" />
                      <path d="M7 7l1 13h8l1-13" />
                    </svg>
                  </button>
                </div>
                <div class="ci-sum">{{ lineSum(product, quantity) }}</div>
              </li>
            </ul>
          </section>

          <section class="co-card" aria-labelledby="s-delivery">
            <h2 id="s-delivery">
              <span class="co-num">02</span>
              {{ cdekSettings ? 'Доставка СДЭК' : 'Доставка' }}
            </h2>
            <CdekDelivery
              v-if="cdekSettings"
              v-model="cartStore.cdekSelection"
              v-model:flat="cartStore.deliveryFlat"
              :settings="cdekSettings"
              :goods="cdekGoods"
              :stale="cartStore.deliveryStale"
              :has-error="cartStore.showValidationErrors && !cartStore.isDeliveryValid"
            />
            <div v-else class="fields">
              <FormField
                v-model="cartStore.address"
                wide
                label="Адрес доставки"
                placeholder="Город, улица, дом, квартира"
                autocomplete="street-address"
                error="Укажите адрес доставки"
                :has-error="cartStore.showValidationErrors && !cartStore.isAddressValid"
              />
            </div>
          </section>

          <section class="co-card" aria-labelledby="s-contacts">
            <h2 id="s-contacts"><span class="co-num">03</span> Получатель</h2>
            <div class="fields">
              <FormField
                v-model="cartStore.name"
                wide
                label="Имя и фамилия"
                placeholder="Как в паспорте — для получения в СДЭК"
                autocomplete="name"
                error="Укажите имя и фамилию"
                :has-error="cartStore.showValidationErrors && !cartStore.isNameValid"
              />
              <FormField
                v-model="cartStore.phone"
                label="Телефон"
                placeholder="+7 (999) 999-99-99"
                mask="+7 (###) ###-##-##"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                hint="Сюда придёт код получения от СДЭК"
                error="Проверьте номер телефона"
                :has-error="cartStore.showValidationErrors && !cartStore.isPhoneValid"
              />
              <FormField
                v-model="cartStore.email"
                label="Почта"
                placeholder="you@example.com"
                type="email"
                inputmode="email"
                autocomplete="email"
                hint="Для уведомлений на почту"
                error="Укажите корректный адрес почты"
                :has-error="cartStore.showValidationErrors && !cartStore.isEmailValid"
              />
            </div>
          </section>
        </div>

        <aside class="co-summary" aria-label="Итог заказа">
          <h2>Ваш заказ</h2>
          <dl class="sum-rows">
            <dt>{{ itemsLabel }}</dt>
            <dd>{{ money(cartStore.totalPrice) }}</dd>
            <dt>{{ deliveryRowLabel }}</dt>
            <dd :class="{ 'muted-dd': deliveryPending }">{{ deliverySum }}</dd>
          </dl>
          <div class="sum-total">
            <span>Итого</span>
            <span>{{ money(cartStore.totalWithDelivery) }}</span>
          </div>
          <MakeOrderButton
            ref="orderButton"
            v-model:sending="orderSending"
            :text="orderButtonText"
          />
          <div v-if="paymentEnabled" class="pay-note">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Картой или СБП через Робокассу
          </div>
          <div
            class="consent-block"
            :class="{ 'has-error': cartStore.showValidationErrors && !cartStore.acceptedTerms }"
          >
            <label class="consent">
              <input v-model="cartStore.acceptedTerms" type="checkbox" />
              <span>
                Я принимаю условия
                <DocumentLink v-if="termsStore.data?.offer" kind="offer" @click.stop
                  >публичной оферты</DocumentLink
                ><template v-else>публичной оферты</template>, соглашаюсь с
                <RouterLink to="/terms" @click.stop
                  >условиями оплаты, доставки и возврата</RouterLink
                >
                и даю согласие на
                <DocumentLink v-if="termsStore.data?.privacy" kind="privacy" @click.stop
                  >обработку персональных данных</DocumentLink
                ><template v-else>обработку персональных данных</template>.
              </span>
            </label>
            <p
              v-if="cartStore.showValidationErrors && !cartStore.acceptedTerms"
              class="consent-error"
            >
              Поставьте галочку, чтобы продолжить
            </p>
          </div>
          <p v-if="paymentEnabled" class="reserve-note">
            Изделия резервируются на 60 минут после оформления.
          </p>
          <p v-if="cartStore.orderError" class="form-status" role="status">
            {{ cartStore.orderError }}
          </p>
        </aside>
      </form>
    </div>

    <div v-if="hasItems" class="mobile-paybar">
      <p v-if="cartStore.orderError" class="form-status" role="status">
        {{ cartStore.orderError }}
      </p>
      <button type="submit" form="checkout" class="btn-pay" :disabled="orderSending">
        {{ orderButtonText }}
      </button>
      <div v-if="paymentEnabled" class="pay-note">Картой или СБП через Робокассу</div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  background: var(--bg);
  color: var(--ink);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.checkout {
  padding-top: 40px;
  padding-bottom: 96px;
}

.checkout h1 {
  margin: 16px 0 36px;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 48px;
  line-height: 1.1;
}

.breadcrumbs {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: var(--muted);
}

.breadcrumbs a {
  color: var(--muted);
  text-decoration: none;
}

.breadcrumbs a:hover {
  color: var(--accent);
}

.crumb-current {
  color: var(--ink);
}

.btn-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 24px;
  border: 0;
  border-radius: 24px;
  background: var(--accent);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.btn-pill:hover {
  background: var(--accent-dark);
  color: #fff;
}

.btn-pay {
  width: 100%;
  height: 56px;
  border: 0;
  border-radius: 28px;
  background: var(--accent);
  color: #fff;
  font-family: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}

.btn-pay:hover:not(:disabled) {
  background: var(--accent-dark);
}

.btn-pay:disabled {
  opacity: 0.6;
  cursor: progress;
}

.cart-empty {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 64px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.cart-empty h2 {
  margin: 0;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 28px;
}

.cart-empty p {
  margin: 0;
  font-size: 16px;
  color: var(--muted);
}

.cart-empty .btn-pill {
  margin-top: 8px;
  height: 52px;
  padding: 0 28px;
}

.checkout-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 40px;
}

.checkout-steps {
  flex: 999 1 560px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.co-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 28px 32px;
}

.co-card h2,
.co-summary h2 {
  margin: 0 0 20px;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 24px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.co-summary h2 {
  margin-bottom: 0;
}

.co-num {
  font-size: 15px;
  color: var(--accent);
  font-weight: 600;
}

.cart-list {
  list-style: none;
  margin: -12px 0 0;
  padding: 0;
}

.cart-item {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto auto;
  gap: 20px;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #efe7dc;
}

.cart-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.cart-item.is-short {
  background: #fdf6f5;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 12px;
}

.cart-item img,
.ci-photo {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 12px;
  background: var(--sand);
}

.ci-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ci-cat {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a6a5d;
}

.ci-name {
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 500;
  text-decoration: none;
  color: var(--ink);
}

.ci-name:hover {
  color: var(--accent);
}

.ci-stock {
  margin: 0;
  font-size: 13px;
  color: #b3261e;
}

.ci-remove {
  align-self: flex-start;
  min-height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  color: var(--muted);
  text-decoration: underline;
}

.ci-remove:hover {
  color: var(--accent);
}

.ci-controls {
  display: contents;
}

.ci-remove-icon {
  display: none;
}

.qty {
  display: flex;
  align-items: center;
  height: 44px;
  border: 1px solid var(--line-strong);
  border-radius: 22px;
}

.qty button {
  width: 44px;
  height: 42px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  color: var(--ink);
}

.qty button:first-child {
  border-radius: 22px 0 0 22px;
}

.qty button:last-child {
  border-radius: 0 22px 22px 0;
}

.qty button:hover:not(:disabled) {
  background: var(--sand);
}

.qty button:disabled {
  color: #c9bcae;
  cursor: not-allowed;
}

.qty-val {
  min-width: 28px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}

.ci-sum {
  min-width: 96px;
  text-align: right;
  font-size: 18px;
  font-weight: 700;
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.co-summary {
  flex: 1 1 340px;
  min-width: 0;
  position: sticky;
  top: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sum-rows {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  row-gap: 12px;
  font-size: 16px;
}

.sum-rows dt {
  color: var(--muted);
  white-space: nowrap;
  padding-right: 16px;
}

.sum-rows dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
}

.muted-dd {
  color: var(--muted);
  font-weight: 400;
}

.sum-total {
  border-top: 1px solid #e8dfd3;
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.sum-total span:first-child {
  font-size: 18px;
  font-weight: 700;
}

.sum-total span:last-child {
  font-size: 28px;
  font-weight: 700;
}

.pay-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.consent-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #7a6a5d;
  cursor: pointer;
}

.consent input {
  width: 18px;
  height: 18px;
  margin: 1px 0 0;
  flex: none;
  accent-color: var(--accent);
  cursor: pointer;
}

.consent-block.has-error input {
  outline: 2px solid #b3261e;
  outline-offset: 2px;
}

.consent a {
  color: var(--muted-2);
}

.consent-error {
  margin: 0;
  font-size: 13px;
  color: #b3261e;
}

.reserve-note {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--sand);
  font-size: 13px;
  line-height: 1.5;
  color: #4a3e36;
}

.form-status {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #b3261e;
}

.mobile-paybar {
  display: none;
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .checkout {
    padding-top: 24px;
    padding-bottom: 32px;
  }

  .checkout .breadcrumbs {
    display: none;
  }

  .checkout h1 {
    font-size: 34px;
    margin: 0 0 20px;
  }

  .checkout-layout {
    flex-direction: column;
    gap: 16px;
  }

  .checkout-steps {
    flex: none;
    width: 100%;
    gap: 16px;
  }

  .co-card {
    padding: 20px 16px;
    border-radius: 16px;
  }

  .co-card h2 {
    font-size: 22px;
    margin-bottom: 14px;
  }

  .co-num {
    display: none;
  }

  .cart-list {
    margin-top: -6px;
  }

  .cart-item {
    grid-template-columns: 76px minmax(0, 1fr);
    grid-template-areas: 'img info' 'img ctrl';
    gap: 6px 14px;
    padding: 14px 0;
    align-items: start;
  }

  .cart-item img,
  .ci-photo {
    grid-area: img;
    width: 76px;
    height: 76px;
    border-radius: 10px;
  }

  .ci-info {
    grid-area: info;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    padding-right: 92px;
  }

  .ci-cat,
  .ci-remove {
    display: none;
  }

  .ci-name {
    font-size: 16px;
    line-height: 1.25;
  }

  .ci-stock {
    flex-basis: 100%;
  }

  .ci-sum {
    grid-area: info;
    justify-self: end;
    align-self: start;
    min-width: 0;
    font-size: 16px;
  }

  .ci-controls {
    grid-area: ctrl;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ci-remove-icon {
    display: flex;
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    color: var(--muted);
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .co-summary {
    position: static;
    flex: none;
    width: 100%;
    padding: 20px 16px;
    border-radius: 16px;
    gap: 12px;
  }

  .co-summary h2,
  .co-summary :deep(.btn-pay),
  .co-summary .pay-note,
  .co-summary .reserve-note {
    display: none;
  }

  .sum-total span:last-child {
    font-size: 24px;
  }

  .mobile-paybar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 16px 16px;
    background: var(--surface);
    border-top: 1px solid #e8dfd3;
    box-shadow: 0 -8px 20px -14px rgba(60, 40, 25, 0.4);
  }

  .mobile-paybar .btn-pay {
    height: 54px;
  }
}
</style>

<style>
@media (max-width: 720px) {
  body.cart-paybar .footer-bottom {
    padding-bottom: 120px;
  }
}
</style>
