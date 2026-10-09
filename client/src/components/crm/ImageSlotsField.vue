<script setup lang="ts">
import { computed, ref } from 'vue'
import { fileSlot, type ImageSlot } from '@/scripts/imageSlots'

const props = withDefaults(defineProps<{ max: number; hint?: string; label?: string }>(), {
  hint: '',
  label: 'Изображения',
})

const slots = defineModel<ImageSlot[]>({ required: true })

const warning = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const canAdd = computed(() => slots.value.length < props.max)
const count = computed(() => `${slots.value.length} из ${props.max}`)

function pick() {
  fileInput.value?.click()
}

function onFilesChange(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  const free = props.max - slots.value.length

  slots.value = [...slots.value, ...picked.slice(0, free).map(fileSlot)]
  warning.value =
    picked.length > free ? `Можно не больше ${props.max} изображений — лишние не добавлены.` : ''

  // Сбрасываем input, иначе повторный выбор того же файла не вызовет change.
  input.value = ''
}

function remove(index: number) {
  const removed = slots.value[index]
  if (removed?.file) URL.revokeObjectURL(removed.url)
  slots.value = slots.value.filter((_, i) => i !== index)
  warning.value = ''
}
</script>

<template>
  <div class="field">
    <label class="crm-label">
      {{ label }}
      <span class="images-count">{{ count }}</span>
    </label>
    <div class="images">
      <div
        v-for="(slot, i) in slots"
        :key="slot.key"
        class="image"
        :style="{ backgroundImage: `url(${slot.url})` }"
      >
        <span v-if="i === 0" class="image-cover">обложка</span>
        <button
          type="button"
          class="image-remove"
          aria-label="Убрать изображение"
          title="Убрать"
          @click="remove(i)"
        >
          ✕
        </button>
      </div>
      <button
        v-if="canAdd"
        type="button"
        class="image-add"
        title="Добавить изображения"
        @click="pick"
      >
        +
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="file-hidden"
        @change="onFilesChange"
      />
    </div>
    <p class="images-hint" :class="{ warn: warning }">{{ warning || hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.images {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.image {
  width: 74px;
  height: 74px;
  border-radius: 10px;
  border: 1px solid rgba(122, 92, 58, 0.2);
  position: relative;
  background-size: cover;
  background-position: center;
}
.images-count {
  margin-left: 6px;
  font-size: 11px;
  color: #a08a6a;
}
.images-hint {
  margin: 0;
  font-size: 12px;
  color: #a08a6a;
}
.images-hint.warn {
  color: #b0623f;
}
.image-cover {
  position: absolute;
  left: 4px;
  bottom: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(46, 33, 19, 0.72);
  color: #f7f1e6;
  font-size: 10px;
  line-height: 16px;
}
.image-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #3a2a19;
  color: #f7f1e6;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}
.image-add {
  width: 74px;
  height: 74px;
  border-radius: 10px;
  border: 1.5px dashed rgba(122, 92, 58, 0.4);
  background: #efe7d8;
  color: #9a8464;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-add:hover {
  border-color: rgba(168, 73, 43, 0.55);
  color: var(--brand-accent-strong);
}
.file-hidden {
  display: none;
}
</style>
