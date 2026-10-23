
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Play,
  RefreshCw,
  TrendingUp,
  UserRound,
  Users,
  Weight,
} from 'lucide-vue-next'

useHead({
  title: 'Accueil - Spot',
})

definePageMeta({
  middleware: 'auth',
})

type WorkoutSet = {
  id: string
  weightKg: string | number | null
  reps: number | null
  completed: boolean
}

type WorkoutExercise = {
  id: string
  sets: WorkoutSet[]
}

type Workout = {
  id: string
  name: string
  startedAt: string
  endedAt: string | null
  exercises: WorkoutExercise[]
}

type WorkoutsResponse = {
  workouts: Workout[]
}

const { user } = useAuth()

const apiBase = String(
  useRuntimeConfig().public.apiBase || '/api',
).replace(/\/$/, '')

const workouts = ref<Workout[]>([])
const loading = ref(true)
const errorMessage = ref('')

const firstName = computed(() => {
  const account = user.value as {
    firstName?: string
    username?: string
  } | null

  return account?.firstName || account?.username || 'athlète'
})

const initials = computed(() =>
  firstName.value.slice(0, 2).toUpperCase(),
)

const activeWorkout = computed(() =>
  workouts.value.find(workout => workout.endedAt === null) ?? null,
)

const completedWorkouts = computed(() =>
  workouts.value.filter(workout => workout.endedAt !== null),
)

const recentWorkouts = computed(() =>
  completedWorkouts.value.slice(0, 3),
)

const workoutCount = computed(() =>
  completedWorkouts.value.length,
)

function getWorkoutVolume(workout: Workout): number {
  return workout.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal, set) => {
      if (!set.completed) return setTotal

      const weight = Number(set.weightKg ?? 0)
      const reps = Number(set.reps ?? 0)

      if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
        return setTotal
      }

      return setTotal + weight * reps
    }, 0)
  }, 0)
}

const totalVolume = computed(() =>
  completedWorkouts.value.reduce(
    (total, workout) => total + getWorkoutVolume(workout),
    0,
  ),
)

function getWorkoutDuration(workout: Workout): number {
  if (!workout.endedAt) return 0

  const start = new Date(workout.startedAt).getTime()
  const end = new Date(workout.endedAt).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0
  }

  return Math.max(0, Math.round((end - start) / 60000))
}

const totalMinutes = computed(() =>
  completedWorkouts.value.reduce(
    (total, workout) => total + getWorkoutDuration(workout),
    0,
  ),
)

const formattedVolume = computed(() => {
  if (totalVolume.value >= 1000) {
    return `${(totalVolume.value / 1000).toLocaleString('fr-FR', {
      maximumFractionDigits: 1,
    })} t`
  }

  return `${Math.round(totalVolume.value).toLocaleString('fr-FR')} kg`
})

const formattedDuration = computed(() => {
  const hours = Math.floor(totalMinutes.value / 60)
  const minutes = totalMinutes.value % 60

  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes > 0 ? `${minutes} min` : ''}`.trim()
})

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining > 0
    ? `${hours} h ${remaining} min`
    : `${hours} h`
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<WorkoutsResponse>(
      `${apiBase}/workouts`,
      {
        credentials: 'include',
      },
    )

    workouts.value = response.workouts
  } catch (error) {
    const err = error as {
      data?: { error?: string }
    }

    errorMessage.value =
      err.data?.error || 'Impossible de charger les séances.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <main class="min-h-screen bg-[#0B1018] px-4 pb-28 pt-6 text-white sm:px-6">
    <div class="mx-auto max-w-5xl space-y-8">

      <!-- HEADER -->
      <header class="flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9F36A] text-[#0B1018]">
            <Dumbbell :size="23" />
          </div>

          <span class="text-2xl font-black tracking-tight">
            spot<span class="text-[#C9F36A]">.</span>
          </span>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <button
            type="button"
            aria-label="Actualiser"
            :disabled="loading"
            class="rounded-xl border border-white/10 p-3 text-slate-400 transition hover:text-white disabled:opacity-50"
            @click="loadDashboard"
          >
            <RefreshCw
              :size="19"
              :class="{ 'animate-spin': loading }"
            />
          </button>

          <NuxtLink
            to="/profile"
            aria-label="Mon profil"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-[#243140] text-sm font-bold text-[#C9F36A] transition hover:bg-[#304355]"
          >
            {{ initials }}
          </NuxtLink>
        </div>
      </header>

      <!-- WELCOME -->
      <section>
        <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C9F36A]">
          <Activity :size="15" />
          Tableau de bord
        </div>

        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
          Salut {{ firstName }} 👋
        </h1>

        <p class="mt-3 text-sm text-slate-400 sm:text-base">
          Prêt à te rapprocher de tes objectifs ?
        </p>
      </section>

      <!-- MAIN WORKOUT CARD -->
      <section class="relative overflow-hidden rounded-3xl bg-[#C9F36A] p-6 text-[#101820] sm:p-8">
        <div class="relative z-10 max-w-md">
          <div class="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3A4A24]">
            <Flame :size="17" />
            Ton entraînement
          </div>

          <h2 class="text-3xl font-black tracking-tight sm:text-4xl">
            {{ activeWorkout ? 'Une séance t’attend.' : 'C’est parti !' }}
          </h2>

          <p class="mt-3 text-sm text-[#3A4A24] sm:text-base">
            {{
              activeWorkout
                ? `Reprends ta séance « ${activeWorkout.name} ».`
                : 'Chaque répétition compte. À toi de jouer !'
            }}
          </p>

          <!-- Route à adapter à ton écran de création/reprise -->
          <NuxtLink
            :to="activeWorkout ? `/workouts/${activeWorkout.id}` : '/workouts/new'"
            class="mt-7 inline-flex items-center justify-center gap-3 rounded-xl bg-[#101820] px-6 py-4 text-sm font-bold text-[#C9F36A] transition hover:bg-[#253241]"
          >
            <Play :size="18" />
            {{ activeWorkout ? 'Reprendre la séance' : 'Démarrer une séance' }}
            <ArrowRight :size="18" />
          </NuxtLink>
        </div>

        <Dumbbell
          :size="180"
          class="pointer-events-none absolute -bottom-10 -right-10 rotate-[-25deg] text-[#101820]/10"
        />
      </section>

      <!-- STATS -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Tes performances</h2>
          <TrendingUp :size="21" class="text-[#C9F36A]" />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-[#19232F] p-5">
            <div class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#C9F36A]/10 text-[#C9F36A]">
              <Dumbbell :size="22" />
            </div>

            <p class="text-3xl font-bold">{{ workoutCount }}</p>
            <p class="mt-2 text-sm text-slate-400">Séances terminées</p>
          </div>

          <div class="rounded-2xl border border-white/10 bg-[#19232F] p-5">
            <div class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#C9F36A]/10 text-[#C9F36A]">
              <Weight :size="22" />
            </div>

            <p class="text-3xl font-bold">{{ formattedVolume }}</p>
            <p class="mt-2 text-sm text-slate-400">Volume soulevé</p>
          </div>

          <div class="rounded-2xl border border-white/10 bg-[#19232F] p-5">
            <div class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#C9F36A]/10 text-[#C9F36A]">
              <Clock3 :size="22" />
            </div>

            <p class="text-3xl font-bold">{{ formattedDuration }}</p>
            <p class="mt-2 text-sm text-slate-400">Temps d’entraînement</p>
          </div>
        </div>

        <p class="text-xs text-slate-500">
          Statistiques calculées sur les 50 dernières séances récupérées.
        </p>
      </section>

      <!-- RECENT WORKOUTS -->
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-xl font-bold">Activité récente</h2>

          <NuxtLink
            to="/workouts"
            class="flex items-center gap-1 text-sm font-semibold text-[#C9F36A] hover:underline"
          >
            Voir tout
            <ArrowRight :size="16" />
          </NuxtLink>
        </div>

        <div v-if="loading" class="rounded-2xl border border-white/10 bg-[#19232F] p-6 text-sm text-slate-400">
          Chargement de tes séances...
        </div>

        <div v-else-if="errorMessage" role="alert" class="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          {{ errorMessage }}
        </div>

        <div
          v-else-if="recentWorkouts.length === 0"
          class="rounded-2xl border border-white/10 bg-[#19232F] p-8 text-center"
        >
          <CalendarDays :size="34" class="mx-auto mb-4 text-[#C9F36A]" />
          <h3 class="font-semibold">Aucune séance terminée</h3>
          <p class="mt-2 text-sm text-slate-400">
            Termine ton premier entraînement pour le retrouver ici.
          </p>
        </div>

        <div v-else class="space-y-3">
          <NuxtLink
            v-for="workout in recentWorkouts"
            :key="workout.id"
            :to="`/workouts/${workout.id}`"
            class="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#19232F] p-4 transition hover:border-[#C9F36A]/30 hover:bg-[#202D3A]"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#293746] text-[#C9F36A]">
              <Dumbbell :size="23" />
            </div>

            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold">
                {{ workout.name }}
              </h3>

              <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span class="flex items-center gap-1">
                  <CalendarDays :size="13" />
                  {{ formatDate(workout.startedAt) }}
                </span>

                <span class="flex items-center gap-1">
                  <Clock3 :size="13" />
                  {{ formatDuration(getWorkoutDuration(workout)) }}
                </span>

                <span>
                  {{ workout.exercises.length }} exercices
                </span>
              </div>
            </div>

            <ChevronRight :size="20" class="shrink-0 text-slate-500" />
          </NuxtLink>
        </div>
      </section>

      <!-- QUICK ACCESS -->
      <section class="space-y-4">
        <h2 class="text-xl font-bold">Accès rapide</h2>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NuxtLink
            v-for="item in [
              { label: 'Mes groupes', to: '/groups', icon: Users },
              { label: 'Progression', to: '/progress', icon: TrendingUp },
              { label: 'Mes amis', to: '/friends', icon: Users },
              { label: 'Mon profil', to: '/profile', icon: UserRound },
              { label: 'Exercices', to: '/exercises', icon: Dumbbell}]",
            :key="item.label"
            :to="item.to"
            class="group flex min-h-32 flex-col justify-between rounded-2xl border border-white/10 bg-[#19232F] p-5 transition hover:border-[#C9F36A]/40 hover:bg-[#202D3A]"
          >
            <component
              :is="item.icon"
              :size="25"
              class="text-[#C9F36A]"
            />

            <div class="flex items-end justify-between gap-2">
              <span class="text-sm font-semibold">{{ item.label }}</span>
              <ChevronRight
                :size="16"
                class="shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-[#C9F36A]"
              />
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>
  </main>
</template>
