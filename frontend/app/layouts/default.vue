<script setup lang="ts">
import BottomNavigation from '~/components/layout/BottomNavigation.vue'
</script>

<template>
  <div class="min-h-dvh bg-[#0B1018] text-white">
    <slot />

    <BottomNavigation />
  </div>
</template>