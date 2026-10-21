
<script setup lang="ts">
import {
  Dumbbell,
  Plus,
  Clock3,
  CalendarDays,
  ChevronRight,
  LoaderCircle,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

interface Workout {
  id: string
  name: string
  startedAt: string
  endedAt: string | null
  exercises: {
    id: string
    sets: {
      id: string
      completed: boolean
    }[]
  }[]
}

const workouts = ref<Workout[]>([])
const loading = ref(true)
const error = ref('')

const activeWorkouts = computed(() =>
  workouts.value.filter((workout) => !workout.endedAt),
)

const completedWorkouts = computed(() =>
  workouts.value.filter((workout) => workout.endedAt),
)

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function getSetCount(workout: Workout): number {
  return workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  )
}

async function loadWorkouts(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<{ workouts: Workout[] }>(
      '/api/workouts',
      { credentials: 'include' },
    )

    workouts.value = response.workouts
  } catch {
    error.value = 'Impossible de charger tes séances.'
  } finally {
    loading.value = false
  }
}

onMounted(loadWorkouts)
</script>

<template>
  <main class="mx-auto max-w-2xl px-5 pb-28 pt-8">
    <header class="mb-8">
      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
        Spot / Entraînements
      </p>

      <h1 class="text-3xl font-bold tracking-tight text-white">
        Mes séances
      </h1>

      <p class="mt-2 text-sm text-slate-400">
        Retrouve tes entraînements et suis ta progression.
      </p>
    </header>

    <NuxtLink
      to="/workouts/new"
      class="mb-8 flex items-center justify-center gap-2 rounded-2xl bg-lime-300 px-5 py-4 font-bold text-slate-950 transition hover:bg-lime-200"
    >
      <Plus :size="20" />
      Nouvelle séance
    </NuxtLink>

    <div
      v-if="loading"
      class="flex justify-center py-16 text-slate-400"
    >
      <LoaderCircle :size="28" class="animate-spin" />
    </div>

    <div
      v-else-if="error"
      class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
    >
      {{ error }}

      <button
        class="ml-2 font-semibold underline"
        @click="loadWorkouts"
      >
        Réessayer
      </button>
    </div>

    <template v-else>
      <section v-if="activeWorkouts.length" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold text-white">
          En cours
        </h2>

        <div class="space-y-3">
          <NuxtLink
            v-for="workout in activeWorkouts"
            :key="workout.id"
            :to="`/workouts/${workout.id}`"
            class="flex items-center gap-4 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4"
          >
            <div class="rounded-xl bg-lime-300/15 p-3 text-lime-300">
              <Dumbbell :size="22" />
            </div>

            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold text-white">
                {{ workout.name }}
              </h3>

              <p class="mt-1 text-xs text-slate-400">
                {{ workout.exercises.length }} exercices ·
                {{ getSetCount(workout) }} séries
              </p>
            </div>

            <ChevronRight :size="20" class="text-lime-300" />
          </NuxtLink>
        </div>
      </section>

      <section>
        <h2 class="mb-4 text-lg font-semibold text-white">
          Historique
        </h2>

        <div
          v-if="!completedWorkouts.length"
          class="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center"
        >
          <Dumbbell
            :size="36"
            class="mx-auto mb-4 text-slate-500"
          />

          <h3 class="font-semibold text-white">
            Aucune séance terminée
          </h3>

          <p class="mt-2 text-sm text-slate-400">
            Tes entraînements apparaîtront ici.
          </p>
        </div>

        <div v-else class="space-y-3">
          <NuxtLink
            v-for="workout in completedWorkouts"
            :key="workout.id"
            :to="`/workouts/${workout.id}`"
            class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
          >
            <div class="rounded-xl bg-white/5 p-3 text-slate-300">
              <CalendarDays :size="22" />
            </div>

            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold text-white">
                {{ workout.name }}
              </h3>

              <p class="mt-1 text-xs text-slate-400">
                {{ formatDate(workout.startedAt) }} ·
                {{ workout.exercises.length }} exercices ·
                {{ getSetCount(workout) }} séries
              </p>
            </div>

            <ChevronRight :size="20" class="text-slate-500" />
          </NuxtLink>
        </div>
      </section>
    </template>
  </main>
</template>
