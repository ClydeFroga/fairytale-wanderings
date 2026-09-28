<script setup lang="ts">
import { useOrdersStore, STAGES, type CrmOrder } from '@/stores/orders'

const ordersStore = useOrdersStore()

const emit = defineEmits<{ cancel: [order: CrmOrder] }>()

function isDone(o: CrmOrder): boolean {
  return o.stage >= STAGES.length - 1
}

// Метка кнопки перехода — следующий статус с заглавной буквы.
function advanceLabel(o: CrmOrder): string {
  const next = STAGES[o.stage + 1]
  if (!next) return ''
  return next.charAt(0).toUpperCase() + next.slice(1) + ' →'
}

type Step = {
  label: string
  mark: string
  done: boolean
  current: boolean
  hasBar: boolean
  barActive: boolean
}

function steps(o: CrmOrder): Step[] {
  return STAGES.map((label, i) => ({
    label,
    mark: i < o.stage ? '✓' : String(i + 1),
    done: i < o.stage,
    current: i === o.stage,
    hasBar: i < STAGES.length - 1,
    barActive: i < o.stage,
  }))
}
</script>

<template>
  <div class="head">
    <h1 class="crm-h1">Заказы</h1>
    <p class="crm-subtitle">{{ ordersStore.orderCountLabel }}</p>
    <p class="crm-subtitle">
      Проведите заказ по этапам: создан → оплачен → собран → отправлен → завершён
    </p>
  </div>

  <p v-if="ordersStore.actionError" class="action-error">{{ ordersStore.actionError }}</p>

  <div v-if="ordersStore.loading" class="state">Загрузка заказов…</div>

  <!-- Ошибка вместо списка: иначе «не смогли загрузить» читается как «заказов нет». -->
  <div v-else-if="ordersStore.error" class="crm-panel state state-error">
    <p>{{ ordersStore.error }}</p>
    <button type="button" class="crm-btn crm-btn-sm" @click="ordersStore.loadOrders()">
      Повторить
    </button>
  </div>

  <div v-else-if="ordersStore.orders.length === 0" class="crm-panel state">Заказов пока нет.</div>

  <div v-else class="list">
    <div v-for="o in ordersStore.orders" :key="o.id" class="order" :class="{ off: o.cancelled }">
      <div class="order-head">
        <div class="order-info">
          <span class="order-id">{{ o.number }}</span>
          <span class="order-customer">{{ o.customer }}</span>
          <span v-if="o.contact" class="order-customer">· {{ o.contact }}</span>
          <a v-if="o.email" class="mail-link" :href="`mailto:${o.email}`">{{ o.email }}</a>
          <span class="order-summary">· {{ o.summary }} · {{ o.date }}</span>
          <span class="channel" :class="o.channel">{{
            o.channel === 'telegram' ? 'Telegram' : 'сайт'
          }}</span>

          <!-- Телеграм покупателя: по username можно написать, иначе показываем id. -->
          <a
            v-if="o.telegramLink"
            class="tg-link"
            :href="o.telegramLink"
            target="_blank"
            rel="noopener"
            :title="o.telegram?.name ? `Написать ${o.telegram.name}` : 'Написать в Telegram'"
          >
            @{{ o.telegram?.username }}
          </a>
          <span v-else-if="o.telegram" class="tg-id" title="У покупателя нет @username">
            tg id {{ o.telegram.id }}
          </span>
        </div>
        <div class="order-right">
          <span class="order-total">{{ o.total }}</span>

          <template v-if="o.cancelled">
            <span class="order-cancelled">отменён</span>
          </template>
          <template v-else-if="isDone(o)">
            <span class="order-done">✓ завершён</span>
          </template>
          <template v-else>
            <button
              type="button"
              class="crm-btn-ghost crm-btn-sm"
              :disabled="ordersStore.updatingId === o.id"
              @click="emit('cancel', o)"
            >
              Отменить
            </button>
            <button
              type="button"
              class="crm-btn crm-btn-sm"
              :disabled="ordersStore.updatingId === o.id"
              @click="ordersStore.advanceOrder(o.id)"
            >
              {{ ordersStore.updatingId === o.id ? 'Сохранение…' : advanceLabel(o) }}
            </button>
          </template>
        </div>
      </div>

      <ul class="items">
        <li v-for="(item, i) in o.items" :key="i">
          {{ item.name }} × {{ item.quantity }}
          <span class="item-price"
            >{{ (item.price * item.quantity).toLocaleString('ru-RU') }} ₽</span
          >
        </li>
      </ul>

      <p v-if="o.address" class="address">Доставка: {{ o.address }}</p>
      <p v-if="o.delivery" class="address">{{ o.delivery }}</p>
      <p v-if="o.payment" class="address">{{ o.payment }}</p>

      <!-- У отменённого заказа цепочка этапов ничего не значит — не показываем. -->
      <div v-if="!o.cancelled" class="pipeline">
        <div v-for="(st, i) in steps(o)" :key="i" class="step-wrap">
          <div class="step">
            <div class="dot" :class="{ done: st.done, current: st.current }">
              {{ st.mark }}
            </div>
            <span class="step-label" :class="{ active: st.done || st.current }">{{
              st.label
            }}</span>
          </div>
          <div
            v-if="st.hasBar"
            class="bar"
            :style="{ background: st.barActive ? 'var(--brand-accent)' : 'rgba(122,92,58,.25)' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  margin-bottom: 24px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.order {
  background: #faf6ee;
  border: 1px solid rgba(122, 92, 58, 0.16);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 12px 30px -24px rgba(74, 52, 30, 0.5);
}
/* Отменённый заказ из списка не убираем, но приглушаем. */
.order.off {
  opacity: 0.6;
}
.state {
  padding: 40px 20px;
  text-align: center;
  font-size: 14px;
  color: #8a7458;
}
.action-error {
  margin: -10px 0 16px;
  font-size: 13px;
  color: #b0623f;
}
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #b0623f;
}
.channel {
  padding: 2px 8px;
  border-radius: 999px;
  font: 500 11px 'Spline Sans';
  background: #eadfce;
  color: #8a7458;
}
.channel.telegram {
  background: #dfe9f2;
  color: #4a6d8c;
}
.mail-link {
  font-size: 13px;
  color: #8a7458;
  text-decoration: none;
  border-bottom: 1px dashed rgba(138, 116, 88, 0.5);
}
.mail-link:hover {
  color: #5f4d38;
}
.tg-link,
.tg-id {
  font-size: 13px;
  color: #4a6d8c;
}
.tg-link {
  text-decoration: none;
  border-bottom: 1px dashed rgba(74, 109, 140, 0.5);
}
.tg-link:hover {
  color: #2f5474;
}
.tg-id {
  color: #a08a6a;
}
.items {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  color: #5f4d38;
}
.item-price {
  color: #a08a6a;
}
.address {
  margin: 0 0 14px;
  font-size: 13px;
  color: #8a7458;
}
.order-cancelled {
  font: 600 13px 'Spline Sans';
  color: #b0623f;
}
.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.order-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.order-id {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 17px;
  color: var(--brand-ink);
}
.order-customer {
  font-size: 13px;
  color: #8a7458;
}
.order-summary {
  font-size: 13px;
  color: #a08a6a;
}
.order-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.order-total {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  color: var(--brand-ink);
}
.order-done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: 600 13px 'Spline Sans';
  color: #5c7a3f;
}
.pipeline {
  display: flex;
  align-items: center;
}
.step-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 13px 'Spline Sans';
  flex: none;
  background: #efe7d8;
  color: #a8967a;
  border: 2px solid rgba(122, 92, 58, 0.22);
}
.dot.done {
  background: var(--brand-accent);
  color: #fdf3ec;
  border: 2px solid var(--brand-accent);
}
.dot.current {
  background: #faf6ee;
  color: var(--brand-accent);
  border: 2px solid var(--brand-accent);
  box-shadow: 0 0 0 4px rgba(168, 73, 43, 0.14);
}
.step-label {
  font: 500 11.5px 'Spline Sans';
  color: #a8967a;
  white-space: nowrap;
}
.step-label.active {
  color: #5f4d38;
}
.bar {
  flex: 1;
  height: 2px;
  margin: 0 6px;
  margin-bottom: 22px;
  border-radius: 2px;
}
</style>
