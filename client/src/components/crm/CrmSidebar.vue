<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMe, type MeProfile } from '@/api/users'

export type CrmView = 'products' | 'categories' | 'orders'

defineProps<{ view: CrmView }>()
const emit = defineEmits<{ select: [view: CrmView] }>()

const me = ref<MeProfile | null>(null)

onMounted(async () => {
  try {
    me.value = await getMe()
  } catch {
    // без initData (dev в браузере) профиль недоступен
  }
})

const displayName = computed(() => {
  if (!me.value) return 'Администратор'
  const parts = [me.value.firstName, me.value.lastName].filter(Boolean)
  return parts.join(' ') || 'Администратор'
})

const initials = computed(() => {
  if (!me.value) return 'А'
  const first = me.value.firstName?.trim()
  const last = me.value.lastName?.trim()
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  return 'А'
})

const nav: { key: CrmView; label: string; icon: string }[] = [
  { key: 'products', label: 'Товары', icon: '◈' },
  { key: 'categories', label: 'Категории', icon: '⌗' },
  { key: 'orders', label: 'Заказы', icon: '❏' },
]
</script>

<template>
  <aside class="sidebar">
    <RouterLink to="/" class="brand">Сказка Странствий</RouterLink>
    <div class="brand-sub">панель управления</div>

    <button
      v-for="n in nav"
      :key="n.key"
      type="button"
      class="nav-item"
      :class="{ active: view === n.key }"
      @click="emit('select', n.key)"
    >
      <span class="nav-icon">{{ n.icon }}</span
      >{{ n.label }}
    </button>

    <div class="user">
      <div class="avatar">{{ initials }}</div>
      <div class="user-meta">
        <div class="user-name">{{ displayName }}</div>
        <div class="user-role">владелец</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 232px;
  flex: none;
  background: #3a2a19;
  color: #efe3d0;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: sticky;
  top: 0;
  height: 100vh;
  box-sizing: border-box;
}
.brand {
  font-family: 'Caveat', cursive;
  font-size: 30px;
  line-height: 1;
  color: #f4d9b8;
  padding: 6px 10px 4px;
  text-decoration: none;
  display: block;
  border-radius: 8px;
  transition: color 0.15s ease;
}
.brand:hover {
  color: #fce8cc;
}
.brand-sub {
  font:
    500 10px/1 ui-monospace,
    Menlo,
    monospace;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #a98d68;
  padding: 0 10px 18px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  box-sizing: border-box;
  appearance: none;
  border: none;
  text-align: left;
  padding: 11px 12px;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px 'Spline Sans';
  color: #c3ac89;
  background: transparent;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e6d4b8;
}
.nav-item.active {
  color: #f7ead6;
  background: rgba(168, 73, 43, 0.35);
}
.nav-item.active:hover {
  background: rgba(168, 73, 43, 0.35);
  color: #f7ead6;
}
.nav-icon {
  font-size: 17px;
  line-height: 1;
  width: 20px;
  text-align: center;
}
.user {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand-accent);
  color: #fdf3ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex: none;
}
.user-meta {
  min-width: 0;
}
.user-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  font-size: 11px;
  color: #a98d68;
}
</style>
