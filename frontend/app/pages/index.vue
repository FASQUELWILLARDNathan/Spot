
<script setup lang="ts">
import { LogOut } from 'lucide-vue-next'
useHead({
  title: 'Spot - Workout Tracker',
})
definePageMeta({
  middleware: 'auth',
})
const { user, logout } = useAuth()
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
    <button
      type="button"
      @click="logout"
      class="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
    >
      <LogOut :size="18" />
      Se déconnecter
    </button>
  </main>
</template>
