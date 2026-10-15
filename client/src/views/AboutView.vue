<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Header from '@/components/global/Header.vue'
import { getAbout, type AboutData } from '@/api/about'
import { getProducts } from '@/api/products'
import type { IProduct } from '@/types/product'
import { imageUrls } from '@/scripts/images'
import { paragraphs } from '@/scripts/about'

const SHOP_NAME = 'Сказка странствий'

// Секции «Почему…» и «Как рождается вещь» временно скрыты. Чтобы вернуть — true.
const SHOW_STORY_SECTIONS = false

const STORY_TITLE = 'Почему «Сказка странствий»'
const STORY =
  'Сюжеты приходят из дороги: птица на ветке, земляника, зверь, который смотрит в сторону. Название — про это путешествие. Каждая вещь уносит с собой маленький кусок пути.'
const QUOTE = '«Двух одинаковых не бывает — и в этом вся прелесть ручной работы.»'
const PROCESS_TITLE = 'Как рождается вещь'
const PROCESS_LEAD = 'От эскиза до готовой вещи каждый этап я делаю сама.'

const STEPS = [
  {
    num: '01',
    title: 'Эскиз',
    text: 'Сначала появляется рисунок: силуэт, характер, то, что хочется унести с собой.',
  },
  {
    num: '02',
    title: 'Лепка',
    text: 'Форму леплю вручную. Поэтому у каждой вещи свой наклон, своя линия, свой нрав.',
  },
  {
    num: '03',
    title: 'Роспись',
    text: 'Дальше — глазурь и тонкий рисунок кистью. Цвет проявляется после печи, и это часть сюрприза.',
  },
  {
    num: '04',
    title: 'Обжиг',
    text: 'Изделие проходит огонь. Из печи оно выходит чуть иным, чем я его туда положила.',
  },
] as const

const data = ref<AboutData | null>(null)
const loaded = ref(false)
const products = ref<IProduct[] | null>(null)

onMounted(() => {
  void getAbout()
    .then((value) => {
      data.value = value
    })
    .catch((error) => {
      // Страница видна и без данных — покажем заглушку и зашитые секции.
      console.error(error)
    })
    .finally(() => {
      loaded.value = true
    })

  void getProducts()
    .then((list) => {
      products.value = list
    })
    .catch((error) => {
      console.error(error)
      products.value = []
    })
})

const title = computed(() => data.value?.about.title || 'Обо мне')
const photos = computed(() => imageUrls(data.value?.about.images))
const portrait = computed(() => photos.value[0])
const text = computed(() => paragraphs(data.value?.about.body ?? ''))
const signature = computed(() => data.value?.seller.fullName ?? '')

const steps = computed(() =>
  STEPS.map((step, index) => ({
    ...step,
    image: photos.value[index + 1],
  })),
)

const works = computed(() => {
  if (!products.value) return null
  const items: { slug: string; name: string; src: string }[] = []
  for (const product of products.value) {
    const src = imageUrls(product.image)[0]
    if (!src) continue
    items.push({ slug: product.slug, name: product.name, src })
    if (items.length === 5) break
  }
  return items
})

watch(title, (value) => (document.title = `${value} — ${SHOP_NAME}`), { immediate: true })
</script>

<template>
  <article class="about">
    <Header :back-button="false" BackLink="/" />

    <template v-if="loaded">
      <section class="container intro">
        <div v-if="portrait" class="portrait">
          <img :src="portrait" :alt="title" />
        </div>
        <div class="intro-text">
          <div class="eyebrow">Обо мне</div>
          <h1>{{ title }}</h1>
          <div v-if="text.length" class="intro-body">
            <!-- Только интерполяция: текст из CRM не может принести разметку или скрипт. -->
            <p v-for="(paragraph, i) in text" :key="i" class="paragraph">{{ paragraph }}</p>
          </div>
          <p v-else class="intro-fallback">Скоро здесь будет рассказ</p>
          <div v-if="signature" class="signature">{{ signature }}</div>
        </div>
      </section>

      <section v-if="SHOW_STORY_SECTIONS" class="story">
        <div class="container story-inner">
          <div class="story-text">
            <h2>{{ STORY_TITLE }}</h2>
            <p>{{ STORY }}</p>
          </div>
          <blockquote class="quote">{{ QUOTE }}</blockquote>
        </div>
      </section>

      <section v-if="SHOW_STORY_SECTIONS" class="container process">
        <h2>{{ PROCESS_TITLE }}</h2>
        <p class="process-lead">{{ PROCESS_LEAD }}</p>
        <ol class="steps">
          <li
            v-for="step in steps"
            :key="step.num"
            class="step"
            :class="{ 'has-photo': step.image }"
          >
            <div v-if="step.image" class="step-photo">
              <img :src="step.image" :alt="step.title" />
            </div>
            <div class="step-body">
              <div class="step-num">{{ step.num }}</div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section v-if="works?.length" class="container works">
        <div class="works-head">
          <h2>Мои работы</h2>
          <RouterLink :to="{ path: '/', hash: '#catalog' }" class="text-link"
            >Весь каталог →</RouterLink
          >
        </div>
        <div class="works-list">
          <RouterLink
            v-for="work in works"
            :key="work.slug"
            :to="`/product/${work.slug}`"
            class="work"
          >
            <img :src="work.src" :alt="work.name" />
          </RouterLink>
        </div>
      </section>
    </template>
  </article>
</template>

<style scoped>
.about {
  background: var(--bg);
  color: var(--ink);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}

h1,
h2,
h3 {
  font-family: var(--serif);
  font-weight: 500;
}

h1 {
  margin: 0 0 20px;
  font-size: 56px;
  line-height: 1.08;
  letter-spacing: -0.01em;
}

h2 {
  margin: 0 0 20px;
  font-size: 38px;
  line-height: 1.15;
}

.intro {
  padding-top: 72px;
  padding-bottom: 88px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 64px;
}

.portrait {
  flex: 1 1 380px;
  min-width: 0;
  max-width: 460px;
  aspect-ratio: 4 / 5;
  border-radius: 20px;
  overflow: hidden;
  background: var(--sand);
}

.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.intro-text {
  flex: 1 1 460px;
  min-width: 0;
}

.intro-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.paragraph,
.intro-fallback,
.story-text p,
.process-lead,
.step p {
  margin: 0;
}

.paragraph,
.story-text p {
  font-size: 18px;
  line-height: 1.65;
  color: var(--muted-2);
}

.paragraph {
  white-space: pre-line;
}

.intro-fallback {
  margin-bottom: 32px;
  font-size: 18px;
  line-height: 1.65;
  color: var(--muted);
}

.signature {
  font-family: var(--serif);
  font-style: italic;
  font-size: 24px;
  color: var(--accent);
}

.story {
  background: var(--sand);
}

.story-inner {
  padding-top: 88px;
  padding-bottom: 88px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 56px;
}

.story-text {
  flex: 1 1 420px;
  min-width: 0;
}

.quote {
  flex: 1 1 380px;
  min-width: 0;
  margin: 0;
  font-family: var(--serif);
  font-size: 30px;
  line-height: 1.35;
  color: var(--ink);
}

.process {
  padding-top: 88px;
  padding-bottom: 88px;
}

.process-lead {
  margin-bottom: 40px;
  max-width: 560px;
  font-size: 17px;
  line-height: 1.6;
  color: var(--muted);
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  align-items: end;
}

.step {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.step-photo {
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  background: var(--sand);
}

.step-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-num {
  font-family: var(--serif);
  font-size: 15px;
  color: var(--accent);
}

.step h3 {
  margin: 0;
  font-size: 22px;
}

.step p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted-2);
}

.works {
  padding-bottom: 88px;
}

.works-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 24px;
}

.works-head h2 {
  margin: 0;
}

.text-link {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}

.text-link:hover {
  color: var(--accent-dark);
}

.works-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.work {
  display: block;
  min-width: 0;
  transition: transform 0.2s ease;
}

.work:hover {
  transform: translateY(-3px);
}

.work img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 14px;
  background: var(--sand);
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .eyebrow {
    font-size: 12px;
    margin-bottom: 12px;
  }

  h1 {
    font-size: 34px;
    line-height: 1.12;
    margin-bottom: 14px;
  }

  h2 {
    font-size: 30px;
    margin-bottom: 14px;
  }

  .intro {
    padding-top: 32px;
    padding-bottom: 48px;
    flex-direction: column;
    align-items: stretch;
    gap: 28px;
  }

  .portrait {
    flex: none;
    max-width: none;
    width: 100%;
  }

  .paragraph,
  .intro-fallback,
  .story-text p {
    font-size: 16px;
  }

  .intro-body,
  .intro-fallback {
    margin-bottom: 24px;
  }

  .signature {
    font-size: 22px;
  }

  .story-inner {
    padding-top: 48px;
    padding-bottom: 48px;
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
  }

  .quote {
    font-size: 22px;
    line-height: 1.4;
  }

  .process {
    padding-top: 48px;
    padding-bottom: 48px;
  }

  .process-lead {
    font-size: 15px;
    margin-bottom: 24px;
  }

  .steps {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 28px;
  }

  .step.has-photo {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  .step-photo {
    aspect-ratio: 1 / 1;
    border-radius: 12px;
  }

  .step-body {
    gap: 6px;
  }

  .step h3 {
    font-size: 20px;
  }

  .step p {
    font-size: 14px;
    line-height: 1.55;
  }

  .works {
    padding-bottom: 48px;
  }

  .works-head {
    align-items: baseline;
    margin-bottom: 16px;
  }

  .works-list {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    gap: 12px;
    padding-bottom: 4px;
  }

  .works-list::-webkit-scrollbar {
    display: none;
  }

  .work {
    flex: 0 0 150px;
  }

  .work:hover {
    transform: none;
  }

  .work img {
    border-radius: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .work {
    transition: none;
  }
}
</style>
