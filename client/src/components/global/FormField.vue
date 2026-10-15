<script setup lang="ts">
import { vMaska } from 'maska/vue'

const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    hasError?: boolean
    error?: string
    hint?: string
    mask?: string
    type?: string
    inputmode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal'
    autocomplete?: string
    wide?: boolean
    optional?: boolean
  }>(),
  {
    hasError: false,
    type: 'text',
    wide: false,
    optional: false,
  },
)
</script>

<template>
  <label class="field" :class="{ 'has-error': hasError, 'field-wide': wide }">
    <span class="field-label">
      {{ label }}
      <span v-if="optional" class="optional">(необязательно)</span>
    </span>
    <input
      v-if="mask"
      v-model="model"
      v-maska="mask"
      :type="type"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :aria-invalid="hasError"
    />
    <input
      v-else
      v-model="model"
      :type="type"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :aria-invalid="hasError"
    />
    <span v-if="hint" class="field-hint">{{ hint }}</span>
    <p v-if="hasError && error" class="field-error">{{ error }}</p>
  </label>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.field-wide {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 15px;
  font-weight: 600;
}

.optional {
  font-weight: 400;
  color: var(--muted);
}

.field input {
  height: 52px;
  padding: 0 16px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: #fff;
  font-family: inherit;
  font-size: 16px;
  font-weight: 400;
  color: var(--ink);
}

.field input::placeholder {
  color: #9a8b7e;
}

.field input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.field-hint {
  font-size: 13px;
  color: var(--muted);
}

.field-error {
  margin: 0;
  font-size: 13px;
  color: #b3261e;
}

.field.has-error input {
  border-color: #b3261e;
}

.field.has-error .field-hint {
  display: none;
}
</style>
