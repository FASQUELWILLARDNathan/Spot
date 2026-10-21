
<script setup lang="ts">
import { Dumbbell, ArrowRight, LoaderCircle } from 'lucide-vue-next'

definePageMeta({
  layout: false,
  middleware: 'auth',
})

const { user, fetchUser } = useAuth()
const config = useRuntimeConfig()

const heightCm = ref<number | null>(null)
const startingWeightKg = ref<number | null>(null)
const goal = ref<'GAIN_MUSCLE' | 'LOSE_WEIGHT' | 'MAINTAIN'>(
  'GAIN_MUSCLE',
)

const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''

  if (
    heightCm.value === null ||
    startingWeightKg.value === null
  ) {
    error.value = 'Renseigne ta taille et ton poids.'
    return
  }

  loading.value = true

  try {
    await $fetch(`${config.public.apiBase}/profile`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        heightCm: heightCm.value,
        startingWeightKg: startingWeightKg.value,
        goal: goal.value,
      },
    })

    await fetchUser()
    await navigateTo('/')
  }
  catch {
    error.value = "Impossible d'enregistrer ton profil."
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-[#0B1018] px-6 py-10 text-white">
    <div class="mx-auto w-full max-w-sm">
      <div class="mb-12 flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9F36A]">
          <Dumbbell :size="24" class="text-[#0B1018]" />
        </div>
        <span class="text-2xl font-black">SPOT</span>
      </div>

      <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-[#C9F36A]">
        Ton profil sportif
      </p>

      <h1 class="mb-3 text-4xl font-bold tracking-tight">
        Parlons de toi.
      </h1>

      <p class="mb-10 text-sm leading-relaxed text-slate-400">
        Quelques informations pour commencer à suivre ton évolution.
      </p>

      <form class="space-y-6" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="height" class="mb-2 block text-sm">
              Taille (cm)
            </label>
            <input
              id="height"
              v-model.number="heightCm"
              type="number"
              min="100"
              max="250"
              required
              placeholder="175"
              class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3.5 outline-none focus:border-[#C9F36A]"
            >
          </div>

          <div>
            <label for="weight" class="mb-2 block text-sm">
              Poids (kg)
            </label>
            <input
              id="weight"
              v-model.number="startingWeightKg"
              type="number"
              min="20"
              max="400"
              step="0.1"
              required
              placeholder="70"
              class="w-full rounded-xl border border-slate-700 bg-[#19232F] px-4 py-3.5 outline-none focus:border-[#C9F36A]"
            >
          </div>
        </div>

        <fieldset>
          <legend class="mb-3 text-sm font-medium">
            Ton objectif principal
          </legend>

          <div class="space-y-3">
            <label
              v-for="option in [
                { value: 'GAIN_MUSCLE', label: 'Prendre du muscle' },
                { value: 'LOSE_WEIGHT', label: 'Perdre du poids' },
                { value: 'MAINTAIN', label: 'Maintenir ma forme' },
              ]"
              :key="option.value"
              class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-[#19232F] p-4"
            >
              <input
                v-model="goal"
                type="radio"
                name="goal"
                :value="option.value"
                class="accent-lime-300"
              >
              <span class="text-sm font-medium">
                {{ option.label }}
              </span>
            </label>
          </div>
        </fieldset>

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
            Commencer sur Spot
            <ArrowRight :size="19" />
          </template>
        </button>
      </form>
    </div>
  </div>
</template>
