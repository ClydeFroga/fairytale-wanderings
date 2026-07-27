<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div v-if="open" class="scrim" @click="emit('cancel')">
    <div class="modal" @click.stop>
      <div class="icon">🗑</div>
      <h2 class="title">{{ title }}</h2>
      <p class="message">{{ message }}</p>
      <div class="actions">
        <button type="button" class="crm-btn-ghost" @click="emit('cancel')">Отмена</button>
        <button type="button" class="crm-btn-danger" @click="emit('confirm')">
          {{ confirmLabel || 'Удалить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(46, 33, 19, 0.48);
  backdrop-filter: blur(2px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: min(400px, 100%);
  background: #f7f1e6;
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 40px 80px -30px rgba(46, 33, 19, 0.7);
}
.icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f6ded4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 16px;
}
.title {
  margin: 0 0 8px;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 21px;
  color: #2e2113;
}
.message {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.5;
  color: #6b5942;
}
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
