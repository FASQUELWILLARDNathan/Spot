
<script setup lang="ts">
import { Dumbbell, ArrowRight, LoaderCircle } from 'lucide-vue-next'

definePageMeta({ layout: false })

const { login } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true

  try {
    await login({
      email: email.value,
      password: password.value,
    })

    await navigateTo('/')
  }
  catch (err: any) {
    error.value = err?.data?.error || 'Impossible de se connecter'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-[#0B1018] px-6 py-12 text-white">
    <div class="mx-auto flex w-full max-w-sm flex-col">
      <NuxtLink to="/" class="mb-16 flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9F36A]">
          <Dumbbell :size="25" class="text-[#0B1018]" />
        </div>
        <span class="text-2xl font-black tracking-tight">SPOT</span>
      </NuxtLink>

      <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-[#C9F36A]">
        Bon retour
      </p>

      <h1 class="mb-3 text-4xl font-bold tracking-tight">
        Connexion
      </h1>

      <p class="mb-10 text-sm leading-relaxed text-slate-400">
        Retrouve tes entraînements, tes records et ta progression.
      </p>

      <form class="space-y-5" @submit.prevent="submit">
        <div>
          <label for="email" class="mb-2 block text-sm font-medium">
            Adresse e-mail
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="toi@exemple.com"
            class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3.5 outline-none transition focus:border-[#C9F36A]"
          >
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Ton mot de passe"
            class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3.5 outline-none transition focus:border-[#C9F36A]"
          >
        </div>

        <p v-if="error" role="alert" class="text-sm text-red-400">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-4 font-bold text-[#0B1018] transition hover:bg-lime-300 disabled:opacity-60"
        >
          <LoaderCircle v-if="loading" :size="20" class="animate-spin" />
          <template v-else>
            Se connecter
            <ArrowRight :size="19" />
          </template>
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-slate-400">
        Pas encore de compte ?
        <NuxtLink to="/register" class="font-semibold text-[#C9F36A]">
          S'inscrire
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
