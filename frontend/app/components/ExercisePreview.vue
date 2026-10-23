<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  exerciseId: string
}>()

const isOpen = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | null = null

function startHold() {
  cancelHold()

  holdTimer = setTimeout(() => {
    isOpen.value = true
    holdTimer = null
  }, 2000)
}

function cancelHold() {
  if (holdTimer !== null) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
}

onBeforeUnmount(cancelHold)
</script>

<template>
  <div
    class="touch-pan-y select-none"
    @mouseenter="startHold"
    @mouseleave="cancelHold"
    @touchstart.passive="startHold"
    @touchend="cancelHold"
    @touchcancel="cancelHold"
    @contextmenu.prevent
  >
    <slot />

    <!-- La fiche détaillée s'affichera ici -->
  </div>
</template>