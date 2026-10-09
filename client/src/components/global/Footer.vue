<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAbout, type SellerInfo } from '@/api/about'
import { hasDialableDigits, telHref } from '@/scripts/about'

// Имя из двух слов: «Footer» — одно слово, а eslint (vue/multi-word-component-names) такое не пропускает.
defineOptions({ name: 'SiteFooter' })

const router = useRouter()
const year = new Date().getFullYear()

function goToSection(id: string) {
  void router.push({ path: '/', hash: `#${id}` })
}
const seller = ref<SellerInfo | null>(null)

onMounted(async () => {
  try {
    seller.value = (await getAbout()).seller
  } catch {
    seller.value = null
  }
})

const contacts = computed(() => {
  const info = seller.value
  if (!info) return []

  const items: { label: string; href: string; external: boolean }[] = []
  if (info.phone && hasDialableDigits(info.phone)) {
    items.push({ label: info.phone, href: telHref(info.phone), external: false })
  }
  if (info.email) {
    items.push({ label: info.email, href: `mailto:${info.email}`, external: false })
  }
  for (const link of info.links) {
    if (link.label && link.url) {
      items.push({ label: link.label, href: link.url, external: true })
    }
  }
  return items
})
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <div class="footer-title">Сказка странствий</div>
        <p>Керамика ручной работы.</p>
      </div>
      <div class="footer-cols">
        <div class="footer-col">
          <div class="footer-col-title">Магазин</div>
          <a href="/#catalog" @click.prevent="goToSection('catalog')">Каталог</a>
          <RouterLink to="/about">О мастере</RouterLink>
          <a href="/#delivery" @click.prevent="goToSection('delivery')">Доставка и оплата</a>
        </div>
        <div v-if="contacts.length" class="footer-col">
          <div class="footer-col-title">Связаться</div>
          <a
            v-for="item in contacts"
            :key="item.href + item.label"
            :href="item.href"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
          >
            {{ item.label }}
          </a>
        </div>
      </div>
    </div>
    <div class="container footer-bottom">© {{ year }} Сказка странствий</div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: var(--ink);
  color: #e9e1d6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.footer-inner {
  padding-top: 56px;
  padding-bottom: 40px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 40px;
}

.footer-brand {
  flex: 1 1 280px;
  min-width: 0;
}

.footer-title {
  font-family: var(--serif);
  font-size: 26px;
  margin-bottom: 10px;
}

.footer-brand p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #bfb3a5;
  max-width: 340px;
}

.footer-cols {
  display: flex;
  flex-wrap: wrap;
  gap: 56px;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 15px;
}

.footer-col-title {
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.footer-col a {
  color: #d8cdbf;
  text-decoration: none;
}

.footer-col a:hover {
  color: #fff;
}

.footer-bottom {
  padding-top: 20px;
  padding-bottom: 32px;
  border-top: 1px solid #4a3e36;
  font-size: 13px;
  color: #a99c8d;
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .footer-inner {
    padding-top: 40px;
    padding-bottom: 28px;
    flex-direction: column;
    gap: 28px;
  }

  .footer-title {
    font-size: 24px;
  }

  .footer-brand {
    flex: none;
  }

  .footer-cols {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }

  .footer-bottom {
    padding-top: 16px;
    padding-bottom: 28px;
  }
}
</style>
