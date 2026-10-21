
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Dumbbell,
  LoaderCircle,
  RefreshCw,
  Trophy,
} from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js'

definePageMeta({
  middleware: 'auth',
})

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
}

interface ProgressEntry {
  workoutId: string
  workoutName: string
  date: string
  endedAt: string | null
  totalSets: number
  totalReps: number
  maxWeightKg: number
  totalVolumeKg: number
  estimatedOneRepMaxKg: number | null
}

interface ExerciseProgress {
  exercise: Exercise
  history: ProgressEntry[]
  summary: {
    sessions: number
    totalSets: number
    personalBestWeightKg: number
    personalBestEstimatedOneRepMaxKg: number
  }
}

type Metric =
  | 'maxWeightKg'
  | 'totalVolumeKg'
  | 'estimatedOneRepMaxKg'

const catalog = ref<Exercise[]>([])
const selectedExerciseId = ref('')
const progress = ref<ExerciseProgress | null>(null)

const loadingCatalog = ref(true)
const loadingProgress = ref(false)
const error = ref('')

const search = ref('')
const metric = ref<Metric>('maxWeightKg')

// Empêche une ancienne réponse réseau d'écraser
// le résultat d'un exercice sélectionné plus récemment.
let requestVersion = 0

const metrics: {
  id: Metric
  label: string
  unit: string
}[] = [
  {
    id: 'maxWeightKg',
    label: 'Charge maximale',
    unit: 'kg',
  },
  {
    id: 'totalVolumeKg',
    label: 'Volume par séance',
    unit: 'kg',
  },
  {
    id: 'estimatedOneRepMaxKg',
    label: '1RM estimé',
    unit: 'kg',
  },
]

const filteredExercises = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')

  if (!query) return catalog.value

  return catalog.value.filter((exercise) =>
    exercise.name.toLocaleLowerCase('fr').includes(query),
  )
})

const history = computed(() => progress.value?.history ?? [])

const selectedMetric = computed(() =>
  metrics.find((item) => item.id === metric.value) ?? metrics[0]!,
)

const latestEntry = computed(() => history.value.at(-1) ?? null)

const bestVolume = computed(() =>
  Math.max(0, ...history.value.map(
    (item) => item.totalVolumeKg,
  )),
)

const chartData = computed<ChartData<'line'>>(() => ({
  labels: history.value.map((item) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(item.date)),
  ),
  datasets: [
    {
      label: selectedMetric.value.label,
      data: history.value.map((item) => item[metric.value]),
      borderColor: '#bef264',
      backgroundColor: 'rgba(190, 242, 100, 0.10)',
      pointBackgroundColor: '#bef264',
      pointBorderColor: '#bef264',
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      spanGaps: false,
    },
  ],
}))

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.parsed.y

          return value === null
            ? 'Aucune estimation'
            : `${value.toLocaleString('fr-FR')} kg`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
        maxRotation: 0,
        autoSkip: true,
      },
      grid: {
        color: 'rgba(255,255,255,0.04)',
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        color: 'rgba(255,255,255,0.07)',
      },
    },
  },
}

function formatNumber(value: number | null): string {
  if (value === null) return '—'

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

async function loadCatalog(): Promise<void> {
  loadingCatalog.value = true
  error.value = ''

  try {
    const response = await $fetch<{ exercises: Exercise[] }>(
      '/api/exercises',
      { credentials: 'include' },
    )

    catalog.value = response.exercises

    if (!selectedExerciseId.value && catalog.value.length > 0) {
      selectedExerciseId.value = catalog.value[0]!.id
      await loadProgress()
    }
  } catch {
    error.value = 'Impossible de charger les exercices.'
  } finally {
    loadingCatalog.value = false
  }
}

async function loadProgress(): Promise<void> {
  const exerciseId = selectedExerciseId.value
  const version = ++requestVersion

  if (!exerciseId) {
    progress.value = null
    return
  }

  loadingProgress.value = true
  error.value = ''
  progress.value = null

  try {
    const response = await $fetch<ExerciseProgress>(
      `/api/progress/${exerciseId}`,
      { credentials: 'include' },
    )

    if (version !== requestVersion) return

    progress.value = response
  } catch {
    if (version !== requestVersion) return

    error.value = 'Impossible de charger la progression.'
  } finally {
    if (version === requestVersion) {
      loadingProgress.value = false
    }
  }
}

function selectExercise(exerciseId: string): void {
  if (selectedExerciseId.value === exerciseId) return

  selectedExerciseId.value = exerciseId
  void loadProgress()
}

onMounted(loadCatalog)
</script>

<template>
  <main class="mx-auto max-w-3xl px-5 pb-32 pt-7">
    <NuxtLink
      to="/"
      class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft :size="18" />
      Accueil
    </NuxtLink>

    <header class="mb-8">
      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
        Spot / Statistiques
      </p>

      <div class="flex items-center gap-3">
        <ChartNoAxesCombined
          :size="30"
          class="text-lime-300"
        />

        <h1 class="text-3xl font-bold tracking-tight text-white">
          Ma progression
        </h1>
      </div>

      <p class="mt-3 text-sm text-slate-400">
        Suis tes performances et ton évolution exercice par exercice.
      </p>
    </header>

    <!-- Sélection de l'exercice -->
    <section
      class="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 class="mb-3 text-sm font-semibold text-white">
        Choisir un exercice
      </h2>

      <input
        v-model="search"
        type="search"
        placeholder="Rechercher un exercice..."
        class="mb-3 w-full rounded-xl border border-white/10 bg-[#141D29] px-4 py-3 text-sm text-white outline-none focus:border-lime-300"
      />

      <div
        v-if="loadingCatalog"
        class="flex justify-center py-5"
      >
        <LoaderCircle
          :size="24"
          class="animate-spin text-lime-300"
        />
      </div>

      <div
        v-else
        class="max-h-48 space-y-2 overflow-y-auto"
      >
        <button
          v-for="exercise in filteredExercises"
          :key="exercise.id"
          type="button"
          class="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition"
          :class="
            selectedExerciseId === exercise.id
              ? 'border-lime-300 bg-lime-300/10 text-lime-300'
              : 'border-white/10 bg-[#141D29] text-slate-300 hover:text-white'
          "
          @click="selectExercise(exercise.id)"
        >
          <span class="truncate">
            {{ exercise.name }}
          </span>

          <Dumbbell :size="16" class="shrink-0" />
        </button>

        <p
          v-if="!filteredExercises.length"
          class="py-4 text-center text-sm text-slate-500"
        >
          Aucun exercice trouvé.
        </p>
      </div>
    </section>

    <div
      v-if="error"
      class="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
    >
      {{ error }}
    </div>

    <div
      v-if="loadingProgress"
      class="flex justify-center py-16"
    >
      <LoaderCircle
        :size="30"
        class="animate-spin text-lime-300"
      />
    </div>

    <template v-else-if="progress">
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <p class="text-xs text-slate-500">
            Exercice sélectionné
          </p>

          <h2 class="text-xl font-bold text-white">
            {{ progress.exercise.name }}
          </h2>
        </div>

        <button
          type="button"
          class="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-lime-300"
          aria-label="Actualiser la progression"
          @click="loadProgress"
        >
          <RefreshCw :size="18" />
        </button>
      </div>

      <!-- Statistiques -->
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p class="text-xs text-slate-400">
            Record de charge
          </p>

          <p class="mt-2 text-2xl font-bold text-white">
            {{ formatNumber(progress.summary.personalBestWeightKg) }}
            <span class="text-sm text-slate-400">kg</span>
          </p>
        </div>

        <div
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p class="text-xs text-slate-400">
            Record 1RM estimé
          </p>

          <p class="mt-2 text-2xl font-bold text-white">
            {{
              progress.summary.personalBestEstimatedOneRepMaxKg > 0
                ? formatNumber(progress.summary.personalBestEstimatedOneRepMaxKg)
                : '—'
            }}
            <span class="text-sm text-slate-400">kg</span>
          </p>
        </div>

        <div
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p class="text-xs text-slate-400">
            Meilleur volume
          </p>

          <p class="mt-2 text-2xl font-bold text-white">
            {{ formatNumber(bestVolume) }}
            <span class="text-sm text-slate-400">kg</span>
          </p>
        </div>
      </div>

      <!-- Graphique -->
      <section
        class="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div class="mb-5 flex items-center justify-between gap-3">
          <h3 class="font-semibold text-white">
            Évolution
          </h3>

          <Trophy :size="18" class="text-lime-300" />
        </div>

        <div class="mb-5 grid grid-cols-3 gap-2">
          <button
            v-for="item in metrics"
            :key="item.id"
            type="button"
            class="rounded-xl border px-2 py-3 text-xs font-semibold transition"
            :class="
              metric === item.id
                ? 'border-lime-300 bg-lime-300/10 text-lime-300'
                : 'border-white/10 text-slate-400 hover:text-white'
            "
            @click="metric = item.id"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="history.length" class="h-72">
          <ClientOnly>
            <Line
              :data="chartData"
              :options="chartOptions"
            />
          </ClientOnly>
        </div>

        <p
          v-else
          class="py-12 text-center text-sm text-slate-500"
        >
          Valide des séries pour voir ta progression.
        </p>

        <p class="mt-4 text-xs text-slate-500">
          Chaque point correspond à une séance avec au moins
          une série validée.
        </p>
      </section>

      <!-- Historique -->
      <section
        class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h3 class="mb-5 font-semibold text-white">
          Historique des performances
        </h3>

        <div
          v-if="!history.length"
          class="py-8 text-center text-sm text-slate-500"
        >
          Aucune performance enregistrée.
        </div>

        <div v-else class="space-y-3">
          <NuxtLink
            v-for="entry in [...history].reverse()"
            :key="entry.workoutId"
            :to="`/workouts/${entry.workoutId}`"
            class="block rounded-xl border border-white/10 bg-[#141D29] p-4 transition hover:border-lime-300/40"
          >
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-white">
                  {{ entry.workoutName }}
                </p>

                <p class="mt-1 text-xs text-slate-500">
                  {{ formatDate(entry.date) }}
                </p>
              </div>

              <span
                class="rounded-full px-2 py-1 text-[11px]"
                :class="
                  entry.endedAt
                    ? 'bg-white/10 text-slate-300'
                    : 'bg-lime-300/10 text-lime-300'
                "
              >
                {{ entry.endedAt ? 'Terminée' : 'En cours' }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2 text-center">
              <div>
                <p class="text-[11px] text-slate-500">
                  Charge max
                </p>
                <p class="mt-1 text-sm font-semibold text-white">
                  {{ formatNumber(entry.maxWeightKg) }} kg
                </p>
              </div>

              <div>
                <p class="text-[11px] text-slate-500">
                  Volume
                </p>
                <p class="mt-1 text-sm font-semibold text-white">
                  {{ formatNumber(entry.totalVolumeKg) }} kg
                </p>
              </div>

              <div>
                <p class="text-[11px] text-slate-500">
                  1RM estimé
                </p>
                <p class="mt-1 text-sm font-semibold text-white">
                  {{ formatNumber(entry.estimatedOneRepMaxKg) }} kg
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <p class="mt-5 text-center text-xs text-slate-500">
        {{ progress.summary.sessions }} séances ·
        {{ progress.summary.totalSets }} séries validées
      </p>
    </template>
  </main>
</template>
