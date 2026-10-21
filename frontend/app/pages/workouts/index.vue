
<script setup lang="ts">
import {
  Dumbbell,
  Plus,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  LoaderCircle,
  History,
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

interface WorkoutGroup {
  key: string
  name: string
  latest: Workout
  count: number
  history: Workout[]
}

const workouts = ref<Workout[]>([])
const loading = ref(true)
const error = ref('')

const expandedGroups = ref<string[]>([])

// Les séances en cours restent indépendantes.
const activeWorkouts = computed(() =>
  workouts.value
    .filter((workout) => !workout.endedAt)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() -
        new Date(a.startedAt).getTime(),
    ),
)

// Seules les séances terminées sont regroupées.
const completedWorkouts = computed(() =>
  workouts.value.filter((workout) => workout.endedAt !== null),
)

function normalizeWorkoutName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr')
}

const groupedWorkouts = computed<WorkoutGroup[]>(() => {
  const groups = new Map<string, WorkoutGroup>()

  const sorted = [...completedWorkouts.value].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() -
      new Date(a.startedAt).getTime(),
  )

  for (const workout of sorted) {
    const key = normalizeWorkoutName(workout.name)
    const existing = groups.get(key)

    if (existing) {
      existing.count++
      existing.history.push(workout)
    } else {
      groups.set(key, {
        key,
        name: workout.name,
        latest: workout,
        count: 1,
        history: [workout],
      })
    }
  }

  return [...groups.values()]
})

function toggleHistory(key: string): void {
  if (expandedGroups.value.includes(key)) {
    expandedGroups.value = expandedGroups.value.filter(
      (item) => item !== key,
    )
  } else {
    expandedGroups.value.push(key)
  }
}

function isExpanded(key: string): boolean {
  return expandedGroups.value.includes(key)
}

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
      <p
        class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300"
      >
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
        type="button"
        class="ml-2 font-semibold underline"
        @click="loadWorkouts"
      >
        Réessayer
      </button>
    </div>

    <template v-else>
      <!-- Séances en cours -->
      <section v-if="activeWorkouts.length" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold text-white">
          En cours
        </h2>

        <div class="space-y-3">
          <NuxtLink
            v-for="workout in activeWorkouts"
            :key="workout.id"
            :to="`/workouts/${workout.id}`"
            class="flex items-center gap-4 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 transition hover:bg-lime-300/15"
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

      <!-- Programmes regroupés -->
      <section>
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-white">
            Mes programmes
          </h2>

          <span class="text-xs text-slate-400">
            {{ groupedWorkouts.length }}
            {{ groupedWorkouts.length > 1 ? 'programmes' : 'programme' }}
          </span>
        </div>

        <div
          v-if="!groupedWorkouts.length"
          class="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center"
        >
          <Dumbbell
            :size="36"
            class="mx-auto mb-4 text-slate-500"
          />

          <h3 class="font-semibold text-white">
            Aucun programme pour le moment
          </h3>

          <p class="mt-2 text-sm text-slate-400">
            Tes séances terminées apparaîtront ici,
            regroupées par nom.
          </p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="group in groupedWorkouts"
            :key="group.key"
            class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <!-- Dernière séance du programme -->
            <NuxtLink
              :to="`/workouts/${group.latest.id}`"
              class="flex items-center gap-4 p-4 transition hover:bg-white/[0.04]"
            >
              <div class="rounded-xl bg-lime-300/10 p-3 text-lime-300">
                <Dumbbell :size="22" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-semibold text-white">
                    {{ group.name }}
                  </h3>

                  <span
                    class="rounded-full bg-lime-300/10 px-2 py-0.5 text-[10px] font-semibold text-lime-300"
                  >
                    {{ group.count }}
                    {{ group.count > 1 ? 'séances' : 'séance' }}
                  </span>
                </div>

                <p class="mt-1 text-xs text-slate-400">
                  Dernière : {{ formatDate(group.latest.startedAt) }}
                </p>

                <p class="mt-1 text-xs text-slate-500">
                  {{ group.latest.exercises.length }} exercices ·
                  {{ getSetCount(group.latest) }} séries
                </p>
              </div>

              <ChevronRight :size="20" class="text-slate-500" />
            </NuxtLink>

            <!-- Historique dépliable -->
            <div
              v-if="group.count > 1"
              class="border-t border-white/10"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
                :aria-expanded="isExpanded(group.key)"
                @click="toggleHistory(group.key)"
              >
                <span class="flex items-center gap-2">
                  <History :size="16" class="text-lime-300" />
                  {{
                    isExpanded(group.key)
                      ? "Masquer l'historique"
                      : `Voir les ${group.count} séances`
                  }}
                </span>

                <ChevronDown
                  :size="17"
                  class="transition-transform"
                  :class="isExpanded(group.key) ? 'rotate-180' : ''"
                />
              </button>

              <div
                v-if="isExpanded(group.key)"
                class="space-y-2 border-t border-white/10 px-4 pb-4 pt-3"
              >
                <NuxtLink
                  v-for="session in group.history"
                  :key="session.id"
                  :to="`/workouts/${session.id}`"
                  class="flex items-center gap-3 rounded-xl bg-[#141D29] p-3 transition hover:bg-white/10"
                >
                  <div class="rounded-lg bg-white/5 p-2 text-slate-400">
                    <CalendarDays :size="17" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-white">
                      {{ formatDate(session.startedAt) }}
                    </p>

                    <p class="mt-1 text-xs text-slate-500">
                      {{ session.exercises.length }} exercices ·
                      {{ getSetCount(session) }} séries
                    </p>
                  </div>

                  <span
                    v-if="session.id === group.latest.id"
                    class="text-[10px] font-semibold text-lime-300"
                  >
                    Dernière
                  </span>

                  <ChevronRight
                    :size="17"
                    class="shrink-0 text-slate-500"
                  />
                </NuxtLink>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>
