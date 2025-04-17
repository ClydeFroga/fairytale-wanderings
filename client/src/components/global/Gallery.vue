<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  image: string[]
}>()

const currentIndex = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const currentX = ref(0)
const galleryRef = ref<HTMLElement | null>(null)
const dragOffset = ref(0)

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  startX.value = e.clientX
  currentX.value = e.clientX
  dragOffset.value = 0

  document.addEventListener('mousemove', handleMouseMove)
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  currentX.value = e.clientX
  dragOffset.value = currentX.value - startX.value
}

const handleMouseUp = () => {
  if (!isDragging.value) return

  const diff = startX.value - currentX.value
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentIndex.value < props.image.length - 1) {
      currentIndex.value++
    } else if (diff < 0 && currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  document.removeEventListener('mousemove', handleMouseMove)

  isDragging.value = false
  dragOffset.value = 0
}

const goToSlide = (index: number) => {
  currentIndex.value = index
}

onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div
    ref="galleryRef"
    class="relative w-full aspect-square rounded-xl lg:max-w-[600px] overflow-hidden mx-auto"
    @mousedown="handleMouseDown"
  >
    <div
      class="absolute inset-0 transition-transform duration-0"
      :class="{ 'duration-300': !isDragging }"
      :style="{
        transform: `translateX(calc(${-currentIndex * 100}% + ${dragOffset}px - ${(currentIndex + 1) * 20}px))`,
        width: `100%`,
        display: 'flex',
      }"
    >
      <div
        v-for="(img, index) in image"
        :key="index"
        class="w-full h-full rounded-xl aspect-square bg-center bg-no-repeat bg-cover pointer-events-none select-none ml-5"
        :style="{ backgroundImage: `url(${img})` }"
      />
    </div>

    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
      <button
        v-for="(_, index) in image"
        :key="index"
        class="w-2 h-2 rounded-full transition-colors"
        :class="currentIndex === index ? 'bg-white' : 'bg-white/50'"
        @click="goToSlide(index)"
      />
    </div>
  </div>
</template>
