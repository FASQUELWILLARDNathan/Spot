
<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
  Timer,
  AlarmClock,
  Play,
  SkipForward,
  Trophy,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

interface WorkoutSet {
  id?: string
  weightKg: number | string | null
  reps: number | null
  rpe: number | string | null
  completed: boolean
}

interface WorkoutExercise {
  id: string
  exerciseId: string
  position: number
  exercise: {
    id: string
    name: string
    muscleGroup: string
    equipment: string
  }
  sets: WorkoutSet[]
}

interface Workout {
  id: string
  name: string
  startedAt: string
  endedAt: string | null
  exercises: WorkoutExercise[]
}

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
}

interface EditableSet {
  weightKg: number | string | null
  reps: number | string | null
  rpe: number | string | null
  completed: boolean
}

interface EditableExercise {
  exerciseId: string
  name: string
  sets: EditableSet[]
}

interface NewPersonalRecord {
  exerciseId: string
  exerciseName: string
  type: 'MAX_WEIGHT' | 'MAX_VOLUME' | 'ESTIMATED_1RM'
  previousValue: number | null
  newValue: number
}

interface WorkoutSaveResponse {
  workout: Workout
  newRecords: NewPersonalRecord[]
}

type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'
type RestDuration = 60 | 90 | 120 | 180

const route = useRoute()
const router = useRouter()

const workoutId = computed(() => String(route.params.id))

const workout = ref<Workout | null>(null)
const name = ref('')
const exercises = ref<EditableExercise[]>([])

const loading = ref(true)
const saving = ref(false)
const finishing = ref(false)
const deleting = ref(false)
const error = ref('')
const success = ref('')
const newRecords = ref<NewPersonalRecord[]>([])

const showExercisePicker = ref(false)
const search = ref('')
const catalog = ref<Exercise[]>([])
const catalogLoading = ref(false)

const saveStatus = ref<SaveStatus>('saved')
const lastSavedAt = ref<Date | null>(null)

const now = ref(Date.now())
const restDuration = ref<RestDuration>(90)
const restEndsAt = ref<number | null>(null)

const isFinished = computed(() => Boolean(workout.value?.endedAt))

let saveTimer: ReturnType<typeof setTimeout> | null = null
let isHydrating = false
let saveQueue: Promise<void> = Promise.resolve()
let changeVersion = 0
let savedVersion = 0

let clockInterval: ReturnType<typeof setInterval> | null = null

const filteredCatalog = computed(() =>
  catalog.value.filter((exercise) =>
    exercise.name.toLocaleLowerCase('fr').includes(
      search.value.toLocaleLowerCase('fr'),
    ),
  ),
)

const totalSets = computed(() =>
  exercises.value.reduce((total, exercise) => total + exercise.sets.length, 0),
)

const completedSets = computed(() =>
  exercises.value.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => set.completed).length,
    0,
  ),
)

const restStorageKey = computed(
  () => `spot:rest:${workoutId.value}`,
)

const restDurationStorageKey = 'spot:rest-duration'


const MAX_WORKOUT_SECONDS = 3 * 60 * 60

const workoutElapsedSeconds = computed(() => {
  if (!workout.value?.startedAt) return 0

  const start = new Date(workout.value.startedAt).getTime()

  if (!Number.isFinite(start)) return 0

  const end = workout.value.endedAt
    ? new Date(workout.value.endedAt).getTime()
    : now.value

  const elapsed = Math.max(0, Math.floor((end - start) / 1000))

  return Math.min(elapsed, MAX_WORKOUT_SECONDS)
})

const workoutTimeExpired = computed(() => {
  if (!workout.value || isFinished.value) return false

  const start = new Date(workout.value.startedAt).getTime()

  return Number.isFinite(start)
    && now.value - start >= MAX_WORKOUT_SECONDS * 1000
})


const workoutElapsedLabel = computed(() =>
  formatDuration(workoutElapsedSeconds.value),
)

const restRemainingSeconds = computed(() => {
  if (restEndsAt.value === null) return 0

  return Math.max(
    0,
    Math.ceil((restEndsAt.value - now.value) / 1000),
  )
})

const restIsRunning = computed(
  () => restEndsAt.value !== null && restRemainingSeconds.value > 0,
)

const restRemainingLabel = computed(() =>
  formatDuration(restRemainingSeconds.value),
)

function toNullableNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null

  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

function emptySet(): EditableSet {
  return {
    weightKg: null,
    reps: null,
    rpe: null,
    completed: false,
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

function recordLabel(type: NewPersonalRecord['type']): string {
  switch (type) {
    case 'MAX_WEIGHT':
      return 'Record de charge'
    case 'MAX_VOLUME':
      return 'Record de volume'
    case 'ESTIMATED_1RM':
      return 'Record de 1RM estimé'
  }
}

function formatRecordValue(record: NewPersonalRecord): string {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(record.newValue)} kg`
}

function hydrateWorkout(data: Workout): void {
  isHydrating = true

  workout.value = data
  name.value = data.name

  exercises.value = data.exercises.map((item) => ({
    exerciseId: item.exerciseId,
    name: item.exercise.name,
    sets: item.sets.map((set) => ({
      weightKg: toNullableNumber(set.weightKg),
      reps: set.reps,
      rpe: toNullableNumber(set.rpe),
      completed: set.completed,
    })),
  }))

  isHydrating = false
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const pad = (value: number) =>
    String(value).padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`
  }

  return `${pad(minutes)}:${pad(remainingSeconds)}`
}

function warnBeforeLeave(event: BeforeUnloadEvent): void {
  if (
    saveStatus.value === 'pending' ||
    saveStatus.value === 'saving' ||
    saveStatus.value === 'error'
  ) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeLeave)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeLeave)
})

function startRest(): void {
  if (isFinished.value) return

  const end = Date.now() + restDuration.value * 1000

  restEndsAt.value = end
  now.value = Date.now()

  localStorage.setItem(restStorageKey.value, String(end))
}

function skipRest(): void {
  restEndsAt.value = null
  localStorage.removeItem(restStorageKey.value)
}

function setRestDuration(value: RestDuration): void {
  restDuration.value = value
  localStorage.setItem(restDurationStorageKey, String(value))
}

function restoreRestTimer(): void {
  const storedDuration = Number(
    localStorage.getItem(restDurationStorageKey),
  )

  if ([60, 90, 120, 180].includes(storedDuration)) {
    restDuration.value = storedDuration as RestDuration
  }

  const storedEnd = Number(
    localStorage.getItem(restStorageKey.value),
  )

  if (storedEnd > Date.now()) {
    restEndsAt.value = storedEnd
  } else {
    localStorage.removeItem(restStorageKey.value)
    restEndsAt.value = null
  }
}

function tickClocks(): void {
  now.value = Date.now()

  if (
    restEndsAt.value !== null &&
    now.value >= restEndsAt.value
  ) {
    skipRest()
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    tickClocks()
  }
}

onMounted(() => {
  restoreRestTimer()

  tickClocks()

  clockInterval = setInterval(tickClocks, 1000)

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange,
  )
})

onBeforeUnmount(() => {
  if (clockInterval !== null) {
    clearInterval(clockInterval)
    clockInterval = null
  }

  document.removeEventListener(
    'visibilitychange',
    handleVisibilityChange,
  )
})

async function loadWorkout(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<{ workout: Workout }>(
      `/api/workouts/${workoutId.value}`,
      { credentials: 'include' },
    )

    hydrateWorkout(response.workout)
  } catch {
    error.value = 'Impossible de charger cette séance.'
  } finally {
    loading.value = false
  }
}

async function loadCatalog(): Promise<void> {
  catalogLoading.value = true

  try {
    const response = await $fetch<{ exercises: Exercise[] }>(
      '/api/exercises',
      { credentials: 'include' },
    )

    catalog.value = response.exercises
  } catch {
    error.value = 'Impossible de charger les exercices.'
  } finally {
    catalogLoading.value = false
  }
}

async function openExercisePicker(): Promise<void> {
  showExercisePicker.value = true
  search.value = ''

  if (!catalog.value.length) {
    await loadCatalog()
  }
}

function addExercise(exercise: Exercise): void {
  exercises.value.push({
    exerciseId: exercise.id,
    name: exercise.name,
    sets: [emptySet()],
  })

  showExercisePicker.value = false
  success.value = ''
}

function removeExercise(index: number): void {
  exercises.value.splice(index, 1)
}

function addSet(exercise: EditableExercise): void {
  const previous = exercise.sets.at(-1)

  exercise.sets.push({
    weightKg: previous?.weightKg ?? null,
    reps: previous?.reps ?? null,
    rpe: previous?.rpe ?? null,
    completed: false,
  })
}


function reusePreviousPerformance(
  exercise: EditableExercise,
  previousSets: {
    weightKg: number | null
    reps: number | null
    rpe: number | null
  }[],
): void {
  if (isFinished.value || previousSets.length === 0) return

  const hasExistingData = exercise.sets.some(
    (set) =>
      set.completed ||
      (set.weightKg !== null && set.weightKg !== '') ||
      (set.reps !== null && set.reps !== '') ||
      (set.rpe !== null && set.rpe !== ''),
  )

  if (
    hasExistingData &&
    !window.confirm(
      'Remplacer les séries actuelles par celles de la dernière séance ?',
    )
  ) {
    return
  }

  exercise.sets = previousSets.map((set) => ({
    weightKg: set.weightKg,
    reps: set.reps,
    rpe: set.rpe,
    completed: false,
  }))

  success.value = 'Performances précédentes reprises.'
}

function removeSet(exercise: EditableExercise, index: number): void {
  exercise.sets.splice(index, 1)
}

function normalizeNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function buildPayload() {
  return {
    name: name.value.trim(),
    exercises: exercises.value.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: exercise.sets.map((set) => ({
        weightKg: normalizeNumber(set.weightKg),
        reps: normalizeNumber(set.reps),
        rpe: normalizeNumber(set.rpe),
        completed: set.completed,
      })),
    })),
  }
}

function clearSaveTimer(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

function queueAutoSave(): void {
  if (!workout.value || isFinished.value) return

  clearSaveTimer()
  saveStatus.value = 'pending'

  saveTimer = setTimeout(() => {
    saveTimer = null
    void autoSave()
  }, 1500)
}

function toggleSetCompleted(set: EditableSet): void {
  const wasCompleted = set.completed

  set.completed = !wasCompleted

  if (!wasCompleted && set.completed) {
    startRest()
  }
}

async function autoSave(): Promise<void> {
  if (!workout.value || isFinished.value) return

  clearSaveTimer()

  const version = changeVersion
  const payload = buildPayload()

  // Chaque requête attend la précédente.
  const task = saveQueue.then(async () => {
    if (version <= savedVersion) return

    saveStatus.value = 'saving'

    try {
      const response = await $fetch<WorkoutSaveResponse>(
        `/api/workouts/${workoutId.value}`,
        {
            method: 'PATCH',
            credentials: 'include',
            body: payload,
        },
        )

        if (response.newRecords.length > 0) {
        newRecords.value = response.newRecords
      }

      savedVersion = version
      lastSavedAt.value = new Date()

      saveStatus.value =
        changeVersion === savedVersion ? 'saved' : 'pending'
    } catch {
      saveStatus.value = 'error'
      throw new Error('Échec de la sauvegarde automatique')
    }
  })

  // On garde une file utilisable même après un échec.
  saveQueue = task.catch(() => undefined)

  await task
}

watch(
  [name, exercises],
  () => {
    if (isHydrating || !workout.value || isFinished.value) return

    changeVersion++
    queueAutoSave()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  clearSaveTimer()
})


async function saveWorkout(): Promise<boolean> {
  if (isFinished.value || saving.value) return false

  if (!name.value.trim()) {
    error.value = 'Donne un nom à ta séance.'
    return false
  }

  saving.value = true
  error.value = ''

  try {
    clearSaveTimer()

    // Attend les sauvegardes déjà en cours.
    await saveQueue

    if (changeVersion > savedVersion) {
      await autoSave()
    }

    await saveQueue

    if (saveStatus.value === 'error') {
      error.value = 'La sauvegarde a échoué.'
      return false
    }

    success.value = 'Séance enregistrée.'
    return true
  } catch {
    error.value = 'Impossible d’enregistrer la séance.'
    return false
  } finally {
    saving.value = false
  }
}


async function finishWorkout(): Promise<void> {
  if (isFinished.value || finishing.value) return

  const saved = await saveWorkout()
  if (!saved) return

  finishing.value = true
  error.value = ''

  try {
    const response = await $fetch<{ workout: Workout }>(
      `/api/workouts/${workoutId.value}/finish`,
      {
        method: 'POST',
        credentials: 'include',
      },
    )

    hydrateWorkout(response.workout)
    success.value = 'Séance terminée !'
    skipRest()
  } catch {
    error.value = 'Impossible de terminer la séance.'
  } finally {
    finishing.value = false
  }
}

async function deleteWorkout(): Promise<void> {
  if (deleting.value) return

  if (!window.confirm('Supprimer définitivement cette séance ?')) return

  deleting.value = true
  error.value = ''

  try {
    await $fetch(`/api/workouts/${workoutId.value}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    await router.push('/workouts')
  } catch {
    error.value = 'Impossible de supprimer la séance.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadWorkout)
</script>

<template>
  <main class="mx-auto max-w-2xl px-5 pb-32 pt-7">
    <NuxtLink
      to="/workouts"
      class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft :size="18" />
      Mes séances
    </NuxtLink>

    <div
      v-if="loading"
      class="flex justify-center py-20 text-slate-400"
    >
      <LoaderCircle :size="30" class="animate-spin" />
    </div>

    <div v-else-if="!workout" class="rounded-2xl border border-white/10 p-6">
      <p class="text-white">
        {{ error || 'Séance introuvable.' }}
      </p>

      <button
        class="mt-4 text-sm font-semibold text-lime-300"
        @click="loadWorkout"
      >
        Réessayer
      </button>
    </div>

    <template v-else>
      <header class="mb-7">
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
          Spot / Séance
        </p>

        <input
          v-model="name"
          :disabled="isFinished"
          maxlength="100"
          class="w-full border-none bg-transparent p-0 text-3xl font-bold tracking-tight text-white outline-none disabled:opacity-100"
          placeholder="Nom de la séance"
        />

        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span class="inline-flex items-center gap-1.5">
            <Clock3 :size="14" />
            {{ formatDate(workout.startedAt) }}
          </span>

          <span
            class="rounded-full px-2.5 py-1 font-semibold"
            :class="
              isFinished
                ? 'bg-white/10 text-slate-300'
                : 'bg-lime-300/10 text-lime-300'
            "
          >
            {{ isFinished ? 'Terminée' : 'En cours' }}
          </span>
        </div>
      </header>

      
        <section
        v-if="workout"
        class="mb-6 space-y-4"
        >
        <div class="grid grid-cols-2 gap-3">
            <!-- Chronomètre de séance -->
            <div
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
            <div class="mb-3 flex items-center gap-2 text-slate-400">
                <Timer :size="17" class="text-lime-300" />
                <span class="text-xs font-medium">
                Durée de séance
                </span>
            </div>

            <p
                class="text-2xl font-bold tabular-nums tracking-tight text-white"
            >
                {{ workoutElapsedLabel }}
            </p>

            <p class="mt-2 text-xs text-slate-500">
                {{ isFinished ? 'Séance terminée' : 'En cours' }}
            </p>
            </div>

            <!-- Minuteur de repos -->
            <div
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
            <div class="mb-3 flex items-center gap-2 text-slate-400">
                <AlarmClock :size="17" class="text-lime-300" />
                <span class="text-xs font-medium">
                Repos
                </span>
            </div>

            <p
                class="text-2xl font-bold tabular-nums tracking-tight"
                :class="restIsRunning ? 'text-lime-300' : 'text-white'"
            >
                {{ restIsRunning ? restRemainingLabel : '00:00' }}
            </p>

            <p class="mt-2 text-xs text-slate-500">
                {{ restIsRunning ? 'Récupération en cours' : 'Prêt' }}
            </p>
            </div>
        </div>

        <!-- Contrôles du repos -->
        <div
            v-if="!isFinished"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
            <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-white">
                Temps de repos
            </h3>

            <span class="text-xs text-slate-500">
                Entre les séries
            </span>
            </div>

            <div class="mb-4 grid grid-cols-4 gap-2">
            <button
                v-for="duration in ([60, 90, 120, 180] as const)"
                :key="duration"
                type="button"
                class="rounded-xl border py-2.5 text-sm font-semibold transition"
                :class="
                restDuration === duration
                    ? 'border-lime-300 bg-lime-300/10 text-lime-300'
                    : 'border-white/10 bg-[#141D29] text-slate-400 hover:text-white'
                "
                @click="setRestDuration(duration)"
            >
                {{ duration }}s
            </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
            <button
                type="button"
                class="flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 font-semibold text-slate-950 hover:bg-lime-200"
                @click="startRest"
            >
                <Play :size="17" />
                {{ restIsRunning ? 'Relancer' : 'Démarrer' }}
            </button>

            <button
                type="button"
                :disabled="!restIsRunning"
                class="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40"
                @click="skipRest"
            >
                <SkipForward :size="17" />
                Passer
            </button>
            </div>
        </div>
        </section>


      <div
        v-if="!isFinished"
        class="mb-5 flex items-center gap-2 text-xs"
        >
        <LoaderCircle
            v-if="saveStatus === 'saving'"
            :size="14"
            class="animate-spin text-lime-300"
        />

        <Clock3
            v-else-if="saveStatus === 'pending'"
            :size="14"
            class="text-amber-300"
        />

        <Check
            v-else-if="saveStatus === 'saved'"
            :size="14"
            class="text-lime-300"
        />

        <X
            v-else
            :size="14"
            class="text-red-400"
        />

        <span
            :class="
            saveStatus === 'error'
                ? 'text-red-400'
                : saveStatus === 'saved'
                ? 'text-lime-300'
                : 'text-slate-400'
            "
        >
            {{
            saveStatus === 'saving'
                ? 'Enregistrement...'
                : saveStatus === 'pending'
                ? 'Modifications en attente...'
                : saveStatus === 'error'
                    ? 'Échec de la sauvegarde'
                    : 'Toutes les modifications sont enregistrées'
            }}
        </span>

        <button
            v-if="saveStatus === 'error'"
            type="button"
            class="ml-auto font-semibold text-lime-300 underline"
            @click="saveWorkout"
        >
            Réessayer
        </button>
        </div>

      <section class="mb-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm text-slate-400">Progression des séries</span>
          <span class="font-semibold text-lime-300">
            {{ completedSets }} / {{ totalSets }}
          </span>
        </div>

        <div class="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            class="h-full rounded-full bg-lime-300 transition-all"
            :style="{
              width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%`,
            }"
          />
        </div>

        <p class="mt-3 text-xs text-slate-500">
          {{ exercises.length }} exercices dans cette séance
        </p>
      </section>

      <div
        v-if="error"
        class="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
      >
        {{ error }}
      </div>

      <div
        v-if="success"
        class="mb-5 rounded-xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm text-lime-300"
      >
        {{ success }}
      </div>

      
        <!-- Nouveaux records personnels -->
        <section
        v-if="newRecords.length > 0"
        class="mb-6 overflow-hidden rounded-2xl border border-lime-300/30 bg-lime-300/10 p-5"
        aria-live="polite"
        >
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
            <div class="rounded-xl bg-lime-300/20 p-3 text-lime-300">
                <Trophy :size="24" />
            </div>

            <div>
                <h2 class="text-lg font-bold text-lime-300">
                Nouveau PR !
                </h2>

                <p class="mt-1 text-xs text-slate-300">
                Tu viens de battre un record personnel.
                </p>
            </div>
            </div>

            <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:text-white"
            aria-label="Fermer la notification"
            @click="newRecords = []"
            >
            <X :size="18" />
            </button>
        </div>

        <div class="mt-4 space-y-2">
            <div
            v-for="record in newRecords"
            :key="`${record.exerciseId}-${record.type}`"
            class="rounded-xl border border-white/10 bg-[#141D29] p-3"
            >
            <p class="text-sm font-semibold text-white">
                {{ record.exerciseName }}
            </p>

            <p class="mt-1 text-xs text-slate-400">
                {{ recordLabel(record.type) }}
            </p>

            <div class="mt-2 flex items-center gap-2">
                <span
                v-if="record.previousValue !== null"
                class="text-sm text-slate-500 line-through"
                >
                {{ record.previousValue }} kg
                </span>

                <span
                v-else
                class="text-xs text-slate-400"
                >
                Premier record
                </span>

                <span class="font-bold text-lime-300">
                {{ formatRecordValue(record) }}
                </span>
            </div>
            </div>
        </div>

        <NuxtLink
            to="/records"
            class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lime-300 hover:underline"
        >
            <Trophy :size="16" />
            Voir tous mes records
        </NuxtLink>
        </section>

      <section class="space-y-4">
        <article
          v-for="(exercise, exerciseIndex) in exercises"
          :key="exerciseIndex"
          class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
        >
          <div class="flex items-center justify-between gap-3 border-b border-white/10 p-4">
            <ExerciseHoldPreview
              :exercise-id="exercise.exerciseId"
              :name="exercise.name"
            />

            <button
              v-if="!isFinished"
              type="button"
              class="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
              aria-label="Supprimer l'exercice"
              @click="removeExercise(exerciseIndex)"
            >
              <Trash2 :size="18" />
            </button>
          </div>

          <div class="p-4">
            <PreviousPerformance
                :workout-id="workoutId"
                :exercise-id="exercise.exerciseId"
                :disabled="isFinished"
                @reuse="(sets) => reusePreviousPerformance(exercise, sets)"
            />

            <div class="mb-3 grid grid-cols-[32px_1fr_1fr_1fr_36px] gap-2 text-center text-[11px] font-semibold uppercase text-slate-500">
              <span>N°</span>
              <span>Kg</span>
              <span>Reps</span>
              <span>RPE</span>
              <span>OK</span>
            </div>

            <div
              v-for="(set, setIndex) in exercise.sets"
              :key="setIndex"
              class="mb-2 grid grid-cols-[32px_1fr_1fr_1fr_36px] items-center gap-2"
            >
              <span class="text-center text-sm font-semibold text-slate-400">
                {{ setIndex + 1 }}
              </span>

              <input
                v-model.number="set.weightKg"
                type="number"
                min="0"
                max="2000"
                step="0.5"
                :disabled="isFinished"
                placeholder="—"
                class="min-w-0 rounded-lg border border-white/10 bg-[#141D29] px-2 py-3 text-center text-sm text-white outline-none focus:border-lime-300 disabled:opacity-60"
              />

              <input
                v-model.number="set.reps"
                type="number"
                min="0"
                max="1000"
                step="1"
                :disabled="isFinished"
                placeholder="—"
                class="min-w-0 rounded-lg border border-white/10 bg-[#141D29] px-2 py-3 text-center text-sm text-white outline-none focus:border-lime-300 disabled:opacity-60"
              />

              <input
                v-model.number="set.rpe"
                type="number"
                min="1"
                max="10"
                step="0.5"
                :disabled="isFinished"
                placeholder="—"
                class="min-w-0 rounded-lg border border-white/10 bg-[#141D29] px-2 py-3 text-center text-sm text-white outline-none focus:border-lime-300 disabled:opacity-60"
              />

              <button
                type="button"
                :disabled="isFinished"
                class="flex h-10 w-9 items-center justify-center rounded-lg border transition disabled:cursor-default"
                :class="
                  set.completed
                    ? 'border-lime-300 bg-lime-300 text-slate-950'
                    : 'border-white/10 bg-[#141D29] text-slate-500'
                "
                :aria-label="`Valider la série ${setIndex + 1}`"
                @click="toggleSetCompleted(set)"
              >
                <Check v-if="set.completed" :size="18" />
              </button>
            </div>

            <div v-if="!isFinished" class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
                @click="addSet(exercise)"
              >
                <Plus :size="16" />
                Ajouter une série
              </button>

              <button
                v-if="exercise.sets.length"
                type="button"
                class="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-red-300"
                aria-label="Supprimer la dernière série"
                @click="removeSet(exercise, exercise.sets.length - 1)"
              >
                <Trash2 :size="17" />
              </button>
            </div>
          </div>
        </article>
      </section>

      <button
        v-if="!isFinished"
        type="button"
        class="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-lime-300/40 bg-lime-300/5 py-4 font-semibold text-lime-300 hover:bg-lime-300/10"
        @click="openExercisePicker"
      >
        <Plus :size="19" />
        Ajouter un exercice
      </button>

      <div v-if="!isFinished" class="mt-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          :disabled="saving || finishing"
          class="flex items-center justify-center gap-2 rounded-2xl border border-white/15 py-4 font-semibold text-white disabled:opacity-50"
          @click="saveWorkout"
        >
          <Save :size="18" />
          Enregistrer
        </button>

        <button
          type="button"
          :disabled="saving || finishing"
          class="flex items-center justify-center gap-2 rounded-2xl bg-lime-300 py-4 font-bold text-slate-950 disabled:opacity-50"
          @click="finishWorkout"
        >
          <LoaderCircle
            v-if="finishing"
            :size="18"
            class="animate-spin"
          />
          <Check v-else :size="18" />
          Terminer
        </button>
      </div>

      <button
        type="button"
        :disabled="deleting"
        class="mt-8 flex w-full items-center justify-center gap-2 py-3 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
        @click="deleteWorkout"
      >
        <Trash2 :size="16" />
        Supprimer cette séance
      </button>
    </template>

    <!-- Sélecteur d'exercices -->
    <div
      v-if="showExercisePicker"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
    >
      <div class="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-[#141D29] p-5 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-white">
            Choisir un exercice
          </h2>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:text-white"
            aria-label="Fermer"
            @click="showExercisePicker = false"
          >
            <X :size="20" />
          </button>
        </div>

        <input
          v-model="search"
          type="search"
          placeholder="Rechercher un exercice..."
          class="mb-4 w-full rounded-xl border border-white/10 bg-[#0B1018] px-4 py-3 text-sm text-white outline-none focus:border-lime-300"
        />

        <div class="space-y-2 overflow-y-auto">
          <div
            v-if="catalogLoading"
            class="py-10 text-center text-sm text-slate-400"
          >
            Chargement...
          </div>

          <button
            v-for="exercise in filteredCatalog"
            :key="exercise.id"
            type="button"
            class="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left hover:bg-white/10"
            @click="addExercise(exercise)"
          >
            <span class="text-sm font-medium text-white">
              {{ exercise.name }}
            </span>

            <Plus :size="18" class="text-lime-300" />
          </button>

          <p
            v-if="!catalogLoading && !filteredCatalog.length"
            class="py-8 text-center text-sm text-slate-400"
          >
            Aucun exercice trouvé.
          </p>
        </div>
      </div>
    </div>
  </main>
</template>
