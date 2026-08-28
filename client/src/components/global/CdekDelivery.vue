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

// Карта пунктов выдачи СДЭК. Виджет тяжёлый (около мегабайта вместе с картами),
// поэтому грузится динамически — только когда покупатель открыл выбор точки.
const props = defineProps<{
  settings: CdekSettings
  goods: CdekParcel[] // посылка по составу корзины (см. scripts/parcel.ts)
  stale?: boolean // выбор сброшен, потому что изменился состав корзины
  hasError?: boolean
}>()

const selection = defineModel<CdekSelection | null>({ required: true })

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
  <div class="flex flex-col gap-2">
    <p class="text-base font-medium leading-normal">Доставка СДЭК</p>

    <div
      v-if="selection"
      class="flex flex-col gap-1 rounded-xl border border-(--vt-c-divider-light-1) p-4"
    >
      <p class="text-base font-medium leading-normal">{{ methodLabel }}</p>
      <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">
        {{ selection.address }}
      </p>
      <p v-if="tariffLine" class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">
        {{ tariffLine }}
      </p>
      <button
        type="button"
        class="mt-2 self-start cursor-pointer text-sm underline"
        @click="openWidget"
      >
        Изменить
      </button>
    </div>

    <button
      v-else
      type="button"
      class="btn-primary max-w-[480px]"
      :disabled="loading"
      @click="openWidget"
    >
      <span class="truncate">{{ loading ? 'Загружаем карту…' : 'Выбрать пункт выдачи' }}</span>
    </button>

    <p v-if="stale && !selection" class="text-(--vt-c-text-light-2) text-sm leading-normal">
      Состав заказа изменился — выберите пункт выдачи заново, чтобы пересчитать доставку.
    </p>
    <p v-if="hasError && !selection" class="text-red-600 text-sm font-medium leading-normal">
      Выберите пункт выдачи на карте
    </p>
    <p v-if="loadError" class="text-red-600 text-sm font-medium leading-normal">{{ loadError }}</p>
  </div>
</template>
