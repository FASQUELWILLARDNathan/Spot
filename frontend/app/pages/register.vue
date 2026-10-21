
<script setup lang="ts">
import { Dumbbell, ArrowRight, LoaderCircle } from 'lucide-vue-next'

definePageMeta({ layout: false })

const { register } = useAuth()

const form = reactive({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true

  try {
    await register(form)
    await navigateTo('/onboarding')
  }
  catch (err: any) {
    error.value = err?.data?.error || 'Impossible de créer le compte'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-[#0B1018] px-6 py-10 text-white">
    <div class="mx-auto w-full max-w-sm">
      <div class="mb-10 flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9F36A]">
          <Dumbbell :size="24" class="text-[#0B1018]" />
        </div>
        <span class="text-2xl font-black">SPOT</span>
      </div>

      <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-[#C9F36A]">
        Commence ton évolution
      </p>
      <h1 class="mb-3 text-4xl font-bold">Créer un compte</h1>
      <p class="mb-8 text-sm text-slate-400">
        Rejoins Spot et suis ta progression à chaque séance.
      </p>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="firstName" class="mb-2 block text-sm">Prénom</label>
            <input
              id="firstName"
              v-model="form.firstName"
              required
              autocomplete="given-name"
              maxlength="80"
              class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3 outline-none focus:border-[#C9F36A]"
              placeholder="Prénom"
            >
          </div>
          <div>
            <label for="lastName" class="mb-2 block text-sm">Nom</label>
            <input
              id="lastName"
              v-model="form.lastName"
              required
              autocomplete="family-name"
              maxlength="80"
              class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3 outline-none focus:border-[#C9F36A]"
              placeholder="Nom"
            >
          </div>
        </div>

        <div>
          <label for="username" class="mb-2 block text-sm">Pseudo</label>
          <input
            id="username"
            v-model="form.username"
            required
            minlength="3"
            maxlength="24"
            pattern="[A-Za-z0-9_]+"
            autocomplete="username"
            placeholder="ton_pseudo"
            class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3 outline-none focus:border-[#C9F36A]"
          >
        </div>

        <div>
          <label for="email" class="mb-2 block text-sm">Adresse e-mail</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            placeholder="toi@exemple.com"
            class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3 outline-none focus:border-[#C9F36A]"
          >
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm">Mot de passe</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            minlength="12"
            maxlength="128"
            autocomplete="new-password"
            placeholder="12 caractères minimum"
            class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3 outline-none focus:border-[#C9F36A]"
          >
        </div>

        <p v-if="error" role="alert" class="text-sm text-red-400">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-4 font-bold text-[#0B1018] disabled:opacity-60"
        >
          <LoaderCircle v-if="loading" :size="20" class="animate-spin" />
          <template v-else>
            Créer mon compte
            <ArrowRight :size="19" />
          </template>
        </button>
      </form>

      <p class="mt-7 text-center text-sm text-slate-400">
        Déjà inscrit ?
        <NuxtLink to="/login" class="font-semibold text-[#C9F36A]">
          Se connecter
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
