<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import type CdekWidget from '@cdek-it/widget'
import {
  CDEK_SERVICE_PATH,
  type CdekGeoTarget,
  type CdekOffice,
  type CdekParcel,
  type CdekSettings,
  type CdekTariff,
} from '@/api/cdek'
import type { CdekSelection } from '@/stores/cart'
import FormField from '@/components/global/FormField.vue'

// Карта пунктов выдачи СДЭК. Виджет тяжёлый (около мегабайта вместе с картами),
// поэтому грузится динамически — только когда покупатель открыл выбор точки.
const props = defineProps<{
  settings: CdekSettings
  goods: CdekParcel[] // посылка по составу корзины (см. scripts/parcel.ts)
  stale?: boolean // выбор сброшен, потому что изменился состав корзины
  hasError?: boolean
}>()

const selection = defineModel<CdekSelection | null>({ required: true })
const flat = defineModel<string>('flat', { required: true })

const widget = shallowRef<CdekWidget | null>(null)
const loading = ref(false)
const loadError = ref('')

const methodLabel = computed(() =>
  selection.value?.method === 'cdek_door' ? 'СДЭК, курьером' : 'СДЭК, пункт выдачи',
)

/** Строка под адресом: тариф, стоимость и срок доставки. */
const tariffLine = computed(() => {
  const chosen = selection.value
  if (!chosen) return ''

  const price = chosen.price ? `${chosen.price.toLocaleString('ru-RU')} ₽` : ''
  const period =
    chosen.periodMin && chosen.periodMax ? `${chosen.periodMin}–${chosen.periodMax} дн.` : ''

  return [chosen.tariffName, price, period].filter(Boolean).join(' · ')
})

const chosenMeta = computed(() => [methodLabel.value, tariffLine.value].filter(Boolean).join(' · '))

// Виджет отдаёт либо ПВЗ/постамат (у него есть code), либо адрес из геокодера
// Яндекса — для курьерской доставки.
function handleChoose(
  mode: 'office' | 'door',
  tariff: CdekTariff | null,
  target: CdekOffice | CdekGeoTarget,
) {
  selection.value = {
    method: mode === 'office' ? 'cdek_office' : 'cdek_door',
    pointCode: 'code' in target ? target.code : null,
    address:
      'code' in target
        ? [target.city, target.address].filter(Boolean).join(', ')
        : target.formatted,
    location:
      'code' in target
        ? null
        : {
            address: target.formatted,
            postal_code: target.postal_code,
            country_code: target.country_code,
          },
    tariffName: tariff?.tariff_name ?? '',
    tariffCode: tariff?.tariff_code ?? null,
    price: Math.round(tariff?.delivery_sum ?? 0), // копейки в заказе не храним
    periodMin: tariff?.period_min ?? null,
    periodMax: tariff?.period_max ?? null,
  }

  widget.value?.close()
}

// Корзину могли изменить, пока виджет уже создан: пересобираем посылку, иначе
// он посчитает доставку по прежним весу и габаритам.
function syncParcels() {
  const instance = widget.value
  if (!instance) return

  instance.resetParcels()
  instance.addParcel(props.goods)
}

async function openWidget() {
  loadError.value = ''

  if (widget.value) {
    syncParcels()
    widget.value.open()
    return
  }

  loading.value = true
  try {
    const { default: CDEKWidget } = await import('@cdek-it/widget')

    const params = {
      apiKey: props.settings.apiKey, // ключ Яндекс.Карт
      servicePath: CDEK_SERVICE_PATH, // наш прокси к CDEK API, креды остаются на сервере
      from: props.settings.from,
      defaultLocation: props.settings.defaultLocation,
      goods: props.goods,
      popup: true, // на телефоне встроенной карте не хватило бы места
      lang: 'rus',
      currency: 'RUB',
      // Списки тарифов передаём только заданные — остальные виджет возьмёт свои
      // (например, постаматные, у них отдельные коды).
      tariffs: props.settings.tariffs,
      hideDeliveryOptions: { door: !props.settings.doorDelivery, office: false },
      // Постаматы не используем (у них свои тарифы и ограничения по габаритам):
      // показываем только ПВЗ, а сам фильтр типа точки покупателю не нужен.
      forceFilters: { type: 'PVZ' },
      hideFilters: { type: true },
      onChoose: handleChoose,
    }

    // Пакет не экспортирует ни тип параметров (iWidget), ни enum языка, а
    // обязательными в его типах значатся все поля схемы, хотя у большинства есть
    // значения по умолчанию. Поэтому приводим конфиг к типу конструктора.
    widget.value = new CDEKWidget(params as unknown as ConstructorParameters<typeof CDEKWidget>[0])
    widget.value.open()
  } catch (error) {
    console.error(error)
    loadError.value = 'Не удалось открыть карту пунктов выдачи. Попробуйте позже.'
  } finally {
    loading.value = false
  }
}

// Виджет живёт своим Vue-приложением в отдельном div у body — убираем за собой.
onBeforeUnmount(() => widget.value?.destroy())
</script>

<template>
  <div class="pvz-block" :class="{ 'has-error': hasError && !selection }">
    <div v-if="selection" class="pvz pvz-chosen">
      <div class="pvz-info">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A55"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
        <div>
          <div class="pvz-title">{{ selection.address }}</div>
          <div class="pvz-sub">{{ chosenMeta }}</div>
        </div>
      </div>
      <button type="button" class="btn-pill ghost" :disabled="loading" @click="openWidget">
        Изменить
      </button>
    </div>

    <div v-else class="pvz pvz-empty">
      <div class="pvz-info">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#A2412E"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <div>
          <div class="pvz-title">Пункт выдачи не выбран</div>
          <div class="pvz-sub">Стоимость доставки рассчитается после выбора</div>
        </div>
      </div>
      <button type="button" class="btn-pill" :disabled="loading" @click="openWidget">
        {{ loading ? 'Загружаем карту…' : 'Выбрать пункт выдачи' }}
      </button>
    </div>

    <p v-if="stale && !selection" class="field-hint">
      Состав заказа изменился — выберите пункт выдачи заново, чтобы пересчитать доставку.
    </p>
    <p v-if="hasError && !selection" class="field-error">Выберите пункт выдачи</p>
    <p v-if="loadError" class="field-error">{{ loadError }}</p>

    <!-- Курьеру виджет отдаёт адрес только до дома — квартиру спрашиваем сами. -->
    <div v-if="selection?.method === 'cdek_door'" class="flat-field">
      <FormField
        v-model="flat"
        label="Квартира или офис"
        placeholder="Например, 42"
        inputmode="numeric"
        error="Укажите квартиру или офис — курьеру нужен точный адрес"
        :has-error="Boolean(hasError) && !flat.trim()"
      />
    </div>
  </div>
</template>

<style scoped>
.pvz-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.btn-pill:hover:not(:disabled) {
  background: var(--accent-dark);
  color: #fff;
}

.btn-pill:disabled {
  opacity: 0.6;
  cursor: progress;
}

.btn-pill.ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--line-strong);
  height: 44px;
}

.btn-pill.ghost:hover:not(:disabled) {
  background: var(--sand);
  color: var(--ink);
}

.pvz {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
}

.pvz-empty {
  border: 2px dashed var(--line-strong);
}

.pvz-chosen {
  border: 1px solid var(--line-strong);
  background: var(--bg);
}

.pvz-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.pvz-info svg {
  flex: none;
}

.pvz-title {
  font-size: 16px;
  font-weight: 600;
}

.pvz-sub {
  font-size: 14px;
  color: var(--muted);
}

.has-error .pvz-empty {
  border-color: #b3261e;
}

.field-hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.field-error {
  margin: 0;
  font-size: 13px;
  color: #b3261e;
}

.flat-field {
  margin-top: 4px;
}

@media (max-width: 720px) {
  .pvz {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
  }

  .pvz-empty {
    border: 0;
    padding: 0;
  }

  .pvz-empty .pvz-info {
    display: none;
  }

  .pvz-empty::before {
    content: 'Стоимость рассчитается после выбора пункта выдачи';
    font-size: 14px;
    color: var(--muted);
  }

  .pvz .btn-pill {
    height: 52px;
    font-size: 16px;
  }

  .pvz-chosen .btn-pill {
    align-self: flex-start;
    height: 40px;
  }
}
</style>
