
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  Search,
  Dumbbell,
  ChevronRight,
  RefreshCw,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Bibliothèque d’exercices - Spot' })

type Exercise = {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  targetMuscle: string | null
  imageUrl: string | null
}

const apiBase = String(
  useRuntimeConfig().public.apiBase || '/api',
).replace(/\/$/, '')

const exercises = ref<Exercise[]>([])
const search = ref('')
const muscleFilter = ref('ALL')
const loading = ref(false)
const errorMessage = ref('')

const muscleLabels: Record<string, string> = {
  CHEST: 'Pectoraux',
  BACK: 'Dos',
  SHOULDERS: 'Épaules',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADS: 'Quadriceps',
  HAMSTRINGS: 'Ischio-jambiers',
  GLUTES: 'Fessiers',
  CALVES: 'Mollets',
  ABS: 'Abdominaux',
  FULL_BODY: 'Corps entier',
}

const filteredExercises = computed(() =>
  exercises.value.filter(exercise =>
    muscleFilter.value === 'ALL' ||
    exercise.muscleGroup === muscleFilter.value,
  ),
)

let requestId = 0

async function loadExercises() {
  const currentRequest = ++requestId
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch<{ exercises: Exercise[] }>(
      `${apiBase}/exercises`,
      {
        credentials: 'include',
        query: { search: search.value.trim() },
      },
    )

    if (currentRequest === requestId) {
      exercises.value = result.exercises
    }
  } catch {
    if (currentRequest === requestId) {
      errorMessage.value = 'Impossible de charger les exercices.'
    }
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
    }
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined

watch(search, () => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => void loadExercises(), 300)
})

onMounted(() => void loadExercises())
onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce)
})
</script>

<template>
  <main class="min-h-screen bg-[#0B1018] px-4 py-8 pb-28 text-white">
    <div class="mx-auto max-w-5xl">
      <NuxtLink
        to="/"
        class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft :size="18" />
        Accueil
      </NuxtLink>

      <div class="mb-7 flex items-center justify-between gap-3">
        <div>
          <p class="mb-2 text-xs font-bold tracking-widest text-[#C9F36A]">
            SPOT / ENTRAÎNEMENT
          </p>
          <h1 class="text-3xl font-bold">Exercices</h1>
          <p class="mt-2 text-sm text-slate-400">
            Découvre les mouvements et apprends à les réaliser.
          </p>
        </div>
        <Dumbbell :size="30" class="text-[#C9F36A]" />
      </div>

      <div class="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-[#19232F] px-4">
        <Search :size="19" class="text-slate-400" />
        <input
          v-model="search"
          type="search"
          placeholder="Rechercher un exercice..."
          class="w-full bg-transparent py-4 text-sm outline-none placeholder:text-slate-500"
        />
      </div>

      <div class="mb-7 flex flex-wrap gap-2">
        <button
          v-for="muscle in ['ALL', ...Object.keys(muscleLabels)]"
          :key="muscle"
          type="button"
          class="rounded-full px-3 py-2 text-xs font-semibold transition"
          :class="muscleFilter === muscle
            ? 'bg-[#C9F36A] text-[#111923]'
            : 'bg-[#19232F] text-slate-300 hover:bg-[#263646]'"
          @click="muscleFilter = muscle"
        >
          {{ muscle === 'ALL' ? 'Tous' : muscleLabels[muscle] }}
        </button>
      </div>

      <p v-if="loading" class="flex items-center gap-2 text-slate-400">
        <RefreshCw :size="17" class="animate-spin" />
        Chargement...
      </p>

      <p v-if="errorMessage" role="alert" class="text-red-400">
        {{ errorMessage }}
      </p>

      <div v-else-if="!loading" class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="exercise in filteredExercises"
          :key="exercise.id"
          :to="`/exercises/${exercise.id}`"
          class="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#19232F] p-4 transition hover:border-[#C9F36A]/40"
        >
          <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#293746]">
            <img
              v-if="exercise.imageUrl"
              :src="exercise.imageUrl"
              :alt="exercise.name"
              class="h-full w-full object-contain"
              loading="lazy"
            />
            <Dumbbell v-else :size="25" class="text-[#C9F36A]" />
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="truncate font-semibold">{{ exercise.name }}</h2>
            <p class="mt-1 text-xs text-slate-400">
              {{ muscleLabels[exercise.muscleGroup] ?? exercise.muscleGroup }}
              · {{ exercise.equipment }}
            </p>
          </div>

          <ChevronRight :size="19" class="text-slate-500" />
        </NuxtLink>

        <p
          v-if="filteredExercises.length === 0"
          class="col-span-full py-10 text-center text-sm text-slate-400"
        >
          Aucun exercice trouvé.
        </p>
      </div>

      <p class="mt-6 text-xs text-slate-500">
        Les résultats sont limités à 100 exercices par recherche.
      </p>
    </div>
  </main>
</template>
