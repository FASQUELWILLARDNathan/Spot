
<script setup lang="ts">
useHead({
  title: 'Spot - Workout Tracker',
})
</script>

<template>
  <main class="min-h-screen bg-[#0B1018] text-white flex flex-col items-center justify-center p-6">
    <div class="text-center space-y-4">
      <h1 class="text-5xl font-bold text-lime-400">
        SPOT
      </h1>

      <p class="text-gray-400">
        Your workout companion
      </p>

      <button
        class="rounded-xl bg-lime-400 px-6 py-3 font-semibold text-black"
      >
        Démarrer une séance
      </button>
    </div>
  </main>
</template>
