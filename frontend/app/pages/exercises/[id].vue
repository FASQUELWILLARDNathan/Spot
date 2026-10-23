
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  Dumbbell,
  Target,
  ListChecks,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

type Exercise = {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  descriptionFr: string | null
  instructionSteps: string[]
  targetMuscle: string | null
  secondaryMuscles: string[]
  imageUrl: string | null
  animationUrl: string | null
}

const route = useRoute()
const apiBase = String(
  useRuntimeConfig().public.apiBase || '/api',
).replace(/\/$/, '')

const exercise = ref<Exercise | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const title = computed(() =>
  exercise.value?.name ?? 'Exercice',
)

useHead(() => ({
  title: `${title.value} - Spot`,
}))

async function loadExercise() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch<{ exercise: Exercise }>(
      `${apiBase}/exercises/${route.params.id}`,
      { credentials: 'include' },
    )

    exercise.value = result.exercise
  } catch {
    errorMessage.value = 'Impossible de charger cet exercice.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void loadExercise())
</script>

<template>
  <main class="min-h-screen bg-[#0B1018] px-4 py-8 pb-28 text-white">
    <div class="mx-auto max-w-3xl">
      <NuxtLink
        to="/exercises"
        class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft :size="18" />
        Bibliothèque
      </NuxtLink>

      <p v-if="loading" class="text-slate-400">Chargement...</p>
      <p v-else-if="errorMessage" role="alert" class="text-red-400">
        {{ errorMessage }}
      </p>

      <template v-else-if="exercise">
        <div class="mb-6">
          <p class="mb-2 text-xs font-bold tracking-widest text-[#C9F36A]">
            FICHE EXERCICE
          </p>
          <h1 class="text-3xl font-bold">{{ exercise.name }}</h1>
        </div>

        <div class="mb-6 flex min-h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#19232F] p-6">
          <img
            v-if="exercise.animationUrl || exercise.imageUrl"
            :src="exercise.animationUrl || exercise.imageUrl || ''"
            :alt="`Démonstration de ${exercise.name}`"
            class="max-h-72 max-w-full object-contain"
          />
          <div v-else class="text-center">
            <Dumbbell :size="48" class="mx-auto mb-3 text-[#C9F36A]" />
            <p class="text-sm text-slate-400">
              Animation indisponible pour le moment.
            </p>
          </div>
        </div>

        <div class="mb-6 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-[#19232F] p-4">
            <Target :size="21" class="mb-3 text-[#C9F36A]" />
            <p class="text-xs text-slate-400">Muscle ciblé</p>
            <p class="mt-1 font-semibold">
              {{ exercise.targetMuscle || exercise.muscleGroup }}
            </p>
          </div>
          <div class="rounded-xl bg-[#19232F] p-4">
            <Dumbbell :size="21" class="mb-3 text-[#C9F36A]" />
            <p class="text-xs text-slate-400">Matériel</p>
            <p class="mt-1 font-semibold">{{ exercise.equipment }}</p>
          </div>
        </div>

        <section class="mb-5 rounded-2xl bg-[#19232F] p-5">
          <h2 class="mb-4 flex items-center gap-2 text-lg font-bold">
            <ListChecks :size="21" class="text-[#C9F36A]" />
            Comment réaliser cet exercice ?
          </h2>

          <ol
            v-if="exercise.instructionSteps.length"
            class="list-inside list-decimal space-y-3 text-sm leading-relaxed text-slate-300"
          >
            <li
              v-for="(step, index) in exercise.instructionSteps"
              :key="index"
            >
              {{ step }}
            </li>
          </ol>

          <p
            v-else-if="exercise.descriptionFr"
            class="whitespace-pre-line text-sm leading-relaxed text-slate-300"
          >
            {{ exercise.descriptionFr }}
          </p>

          <p v-else class="text-sm text-slate-400">
            Aucune instruction disponible pour cet exercice.
          </p>
        </section>

        <section
          v-if="exercise.secondaryMuscles.length"
          class="rounded-2xl bg-[#19232F] p-5"
        >
          <h2 class="mb-3 font-bold">Muscles secondaires</h2>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="muscle in exercise.secondaryMuscles"
              :key="muscle"
              class="rounded-full bg-[#293746] px-3 py-2 text-xs text-slate-300"
            >
              {{ muscle }}
            </span>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>
