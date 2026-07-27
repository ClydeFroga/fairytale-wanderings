<script setup lang="ts">
import { useOrdersStore, STAGES, type CrmOrder } from '@/stores/orders'

const ordersStore = useOrdersStore()

function isDone(o: CrmOrder): boolean {
  return o.stage >= STAGES.length - 1
}

// Метка кнопки перехода — следующий статус с заглавной буквы.
function advanceLabel(o: CrmOrder): string {
  const next = STAGES[o.stage + 1]
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
    <p class="crm-subtitle">
      Проведите заказ по этапам: создан → оплачен → собран → отправлен → завершён
    </p>
  </div>

  <div class="list">
    <div v-for="o in ordersStore.orders" :key="o.id" class="order">
      <div class="order-head">
        <div class="order-info">
          <span class="order-id">{{ o.id }}</span>
          <span class="order-customer">{{ o.customer }}</span>
          <span class="order-summary">· {{ o.summary }}</span>
        </div>
        <div class="order-right">
          <span class="order-total">{{ o.total }}</span>
          <button
            v-if="!isDone(o)"
            type="button"
            class="crm-btn crm-btn-sm"
            @click="ordersStore.advanceOrder(o.id)"
          >
            {{ advanceLabel(o) }}
          </button>
          <span v-else class="order-done">✓ завершён</span>
        </div>
      </div>

      <div class="pipeline">
        <div v-for="(st, i) in steps(o)" :key="i" class="step-wrap">
          <div class="step">
            <div
              class="dot"
              :class="{ done: st.done, current: st.current }"
            >
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
