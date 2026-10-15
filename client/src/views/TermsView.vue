<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from '@/components/global/Header.vue'
import DocumentLink from '@/components/global/DocumentLink.vue'
import { useTermsStore } from '@/stores/terms'
import { formatDocumentDate, type DocumentKind } from '@/api/terms'
import { hasDialableDigits, paragraphs, telHref } from '@/scripts/about'

const SHOP_NAME = 'Сказка странствий'
document.title = `Покупателям — ${SHOP_NAME}`

const route = useRoute()
const termsStore = useTermsStore()
const loaded = ref(false)

onMounted(async () => {
  // Ошибку загрузки стор запоминает сам; без данных останутся оплата и пустые разделы.
  await termsStore.ensureLoaded()
  loaded.value = true
})

// Оплата на витрине собрана как в макете: это то, как касса работает сейчас.
const PAYMENT_ITEMS = [
  {
    icon: 'card',
    title: 'Как оплатить',
    text: 'Заказ оплачивается сразу при оформлении: после нажатия кнопки «Оплатить» откроется защищённая платёжная страница Робокассы. Можно оплатить банковской картой или через СБП.',
  },
  {
    icon: 'sum',
    title: 'Сумма к оплате',
    text: 'Стоимость товаров и доставки. Все цены указаны в рублях.',
  },
  {
    icon: 'receipt',
    title: 'Чек',
    text: 'После оплаты придёт электронный чек на почту или телефон, указанные при оплате.',
  },
  {
    icon: 'lock',
    title: 'Безопасность',
    text: 'Данные карты вводятся на стороне Робокассы и магазину не передаются.',
  },
] as const

const deliveryParagraphs = computed(() => paragraphs(termsStore.data?.delivery ?? ''))
const returnsParagraphs = computed(() => paragraphs(termsStore.data?.returns ?? ''))

const seller = computed(() => termsStore.data?.seller ?? null)

type ContactRow = { label: string; text: string; href?: string; external?: boolean }

const contactRows = computed(() => {
  const info = seller.value
  if (!info) return [] as ContactRow[]

  const rows: ContactRow[] = []
  if (info.fullName) rows.push({ label: 'Продавец', text: info.fullName })
  if (info.inn) rows.push({ label: 'Статус', text: `Самозанятая, ИНН ${info.inn}` })
  if (info.phone) {
    rows.push({
      label: 'Телефон',
      text: info.phone,
      href: hasDialableDigits(info.phone) ? telHref(info.phone) : undefined,
    })
  }
  if (info.email) rows.push({ label: 'Email', text: info.email, href: `mailto:${info.email}` })
  for (const link of info.links) {
    if (!link.label || !link.url) continue
    rows.push({ label: link.label, text: link.label, href: link.url, external: true })
  }
  return rows
})

const DOCUMENTS: { kind: DocumentKind; label: string }[] = [
  { kind: 'offer', label: 'Публичная оферта' },
  { kind: 'privacy', label: 'Политика конфиденциальности' },
]
const documents = computed(() =>
  DOCUMENTS.flatMap((doc) => {
    const info = termsStore.data?.[doc.kind]
    return info ? [{ ...doc, updatedAt: formatDocumentDate(info.updatedAt) }] : []
  }),
)

const toc = computed(() => {
  const items = [{ id: 'pay', label: 'Оплата' }]
  if (deliveryParagraphs.value.length) items.push({ id: 'delivery', label: 'Доставка' })
  if (returnsParagraphs.value.length) items.push({ id: 'return', label: 'Возврат и обмен' })
  if (documents.value.length) items.push({ id: 'documents', label: 'Документы' })
  if (contactRows.value.length) items.push({ id: 'contacts', label: 'Контакты и реквизиты' })
  return items
})

// Старые якоря страницы: подвал и сохранённые ссылки ещё могут вести на них.
const HASH_ALIASES: Record<string, string> = { payment: 'pay', returns: 'return' }

watch(
  [() => route.hash, loaded],
  async ([hash, ready]) => {
    if (!hash || !ready) return
    await nextTick()
    const id = HASH_ALIASES[hash.slice(1)] ?? hash.slice(1)
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  },
  { immediate: true },
)
</script>

<template>
  <article>
    <Header :back-button="false" BackLink="/" />

    <div v-if="loaded" class="container buyers">
      <h1>Покупателям</h1>
      <p class="buyers-lead">Как оплатить заказ, что будет после оплаты и как со мной связаться.</p>

      <nav class="buyers-toc" aria-label="Разделы страницы">
        <a v-for="item in toc" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
      </nav>

      <div class="buyers-content">
        <section id="pay" class="b-card">
          <h2>Оплата</h2>
          <p class="b-sub">Банковской картой или через СБП — сразу при оформлении заказа.</p>
          <ul class="b-list">
            <li v-for="item in PAYMENT_ITEMS" :key="item.title">
              <span class="b-ico">
                <svg
                  v-if="item.icon === 'card'"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M7 15h3" />
                </svg>
                <svg
                  v-else-if="item.icon === 'sum'"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M7 4h7a4 4 0 0 1 0 8H7z" />
                  <path d="M7 4v16" />
                  <path d="M5 16h8" />
                </svg>
                <svg
                  v-else-if="item.icon === 'receipt'"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 3h5v5" />
                  <path d="M19 3l-7 7" />
                  <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
                </svg>
                <svg
                  v-else
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <div>
                <div class="b-title">{{ item.title }}</div>
                <p>{{ item.text }}</p>
              </div>
            </li>
          </ul>
          <div class="b-note">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <p>
              <b>На оплату — 60 минут.</b> Неоплаченный заказ после этого отменяется, а товары
              возвращаются в продажу. Если не успели — просто оформите заказ заново.
            </p>
          </div>
        </section>

        <section v-if="deliveryParagraphs.length" id="delivery" class="b-card">
          <h2>Доставка</h2>
          <p v-for="(paragraph, i) in deliveryParagraphs" :key="i" class="paragraph">
            {{ paragraph }}
          </p>
        </section>

        <section v-if="returnsParagraphs.length" id="return" class="b-card">
          <h2>Возврат и обмен</h2>
          <p v-for="(paragraph, i) in returnsParagraphs" :key="i" class="paragraph">
            {{ paragraph }}
          </p>
        </section>

        <section v-if="documents.length" id="documents" class="b-card">
          <h2>Документы</h2>
          <ul class="b-docs">
            <li v-for="doc in documents" :key="doc.kind">
              <DocumentLink :kind="doc.kind">{{ doc.label }}</DocumentLink>
              <span>обновлено {{ doc.updatedAt }}</span>
            </li>
          </ul>
        </section>

        <section v-if="contactRows.length" id="contacts" class="b-card b-card-dark">
          <h2>Контакты и реквизиты</h2>
          <dl class="b-req">
            <template v-for="(row, i) in contactRows" :key="`${row.label}-${i}`">
              <dt>{{ row.label }}</dt>
              <dd>
                <a
                  v-if="row.href"
                  :href="row.href"
                  :target="row.external ? '_blank' : undefined"
                  :rel="row.external ? 'noopener noreferrer' : undefined"
                >
                  {{ row.text }}
                </a>
                <template v-else>{{ row.text }}</template>
              </dd>
            </template>
          </dl>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.buyers {
  padding-top: 56px;
  padding-bottom: 96px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  column-gap: 48px;
  align-items: start;
  color: var(--ink);
}

.buyers h1,
.buyers-lead {
  grid-column: 1 / -1;
}

.buyers h1 {
  margin: 0 0 12px;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 52px;
  line-height: 1.1;
}

.buyers-lead {
  margin: 0 0 48px;
  font-size: 18px;
  line-height: 1.6;
  color: var(--muted-2);
  max-width: 620px;
}

.buyers-toc {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  font-size: 15px;
  font-weight: 600;
}

.buyers-toc a {
  padding: 10px 0;
  border-bottom: 1px solid #e8dfd3;
  text-decoration: none;
  color: var(--muted-2);
}

.buyers-toc a:last-child {
  border-bottom: 0;
}

.buyers-toc a:hover {
  color: var(--accent);
}

.buyers-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.b-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 40px;
  scroll-margin-top: 24px;
}

.b-card h2 {
  margin: 0 0 16px;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 32px;
  line-height: 1.2;
}

.b-card > p {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: #4a3e36;
}

.b-card > p + p {
  margin-top: 12px;
}

.b-card .b-sub {
  margin: -8px 0 28px;
  color: var(--muted);
}

.paragraph {
  white-space: pre-line;
}

.b-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.b-list li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.b-ico {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: var(--sand);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.b-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 4px;
}

.b-list p {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: #4a3e36;
}

.b-note {
  margin-top: 32px;
  padding: 20px 24px;
  border-radius: 14px;
  background: var(--sand);
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  color: var(--accent);
}

.b-note p {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--ink);
}

.b-note b {
  font-weight: 700;
}

.b-docs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.b-docs a {
  color: var(--accent);
  font-weight: 600;
}

.b-docs span {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  color: var(--muted);
}

.b-card-dark {
  background: var(--ink);
  border-color: var(--ink);
  color: #e9e1d6;
}

.b-card-dark h2 {
  color: #fff;
  margin-bottom: 24px;
}

.b-req {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(140px, auto) minmax(0, 1fr);
  font-size: 16px;
}

.b-req dt {
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid #4a3e36;
  color: #bfb3a5;
}

.b-req dd {
  margin: 0;
  padding: 12px 0;
  border-bottom: 1px solid #4a3e36;
}

.b-req dt:last-of-type,
.b-req dd:last-of-type {
  border-bottom: 0;
}

.b-req a {
  color: #fff;
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .buyers {
    display: block;
    padding-top: 28px;
    padding-bottom: 48px;
  }

  .buyers h1 {
    font-size: 34px;
    margin-bottom: 8px;
  }

  .buyers-lead {
    font-size: 16px;
    margin-bottom: 20px;
  }

  .buyers-toc {
    position: static;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    margin: 0 -16px 24px;
    padding: 0 16px 4px;
  }

  .buyers-toc::-webkit-scrollbar {
    display: none;
  }

  .buyers-toc a {
    flex: none;
    height: 44px;
    padding: 0 16px;
    border: 1px solid var(--line-strong);
    border-radius: 22px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    color: var(--ink);
  }

  .buyers-toc a:last-child {
    border-bottom: 1px solid var(--line-strong);
  }

  .buyers-content {
    gap: 16px;
  }

  .b-card {
    padding: 24px 20px;
    border-radius: 16px;
    scroll-margin-top: 80px;
  }

  .b-card h2 {
    font-size: 26px;
    margin-bottom: 12px;
  }

  .b-card > p {
    font-size: 15px;
    line-height: 1.55;
  }

  .b-card .b-sub {
    margin: -4px 0 20px;
    font-size: 15px;
  }

  .b-list {
    gap: 18px;
  }

  .b-list li {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 12px;
  }

  .b-ico {
    width: 36px;
    height: 36px;
    border-radius: 18px;
  }

  .b-ico svg {
    width: 18px;
    height: 18px;
  }

  .b-title {
    font-size: 16px;
  }

  .b-list p {
    font-size: 15px;
    line-height: 1.55;
  }

  .b-note {
    margin-top: 22px;
    padding: 16px;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 12px;
  }

  .b-note svg {
    width: 22px;
    height: 22px;
  }

  .b-note p {
    font-size: 15px;
    line-height: 1.55;
  }

  .b-card-dark {
    background: var(--surface);
    border-color: var(--line);
    color: var(--ink);
  }

  .b-card-dark h2 {
    color: var(--ink);
    margin-bottom: 16px;
  }

  .b-req {
    display: flex;
    flex-direction: column;
    font-size: 15px;
  }

  .b-req dt {
    padding: 12px 0 0;
    border: 0;
    color: var(--muted);
    font-size: 13px;
  }

  .b-req dt:first-of-type {
    padding-top: 0;
  }

  .b-req dd {
    padding: 2px 0 12px;
    border-bottom: 1px solid #e8dfd3;
  }

  .b-req a {
    color: var(--accent);
    font-weight: 600;
  }
}
</style>
