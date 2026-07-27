<script setup lang="ts">
withDefaults(defineProps<{ text: string; disabled?: boolean }>(), {
  disabled: false,
})
</script>

<template>
  <button type="button" :disabled="disabled" class="btn-primary max-w-[480px] flex-1">
    <span class="truncate">{{ text }}</span>
  </button>
</template>
