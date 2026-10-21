
<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Dumbbell,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'ABS'
  | 'FULL_BODY'

type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'CABLE'
  | 'BODYWEIGHT'
  | 'KETTLEBELL'
  | 'OTHER'

interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  createdById: string | null
}

interface WorkoutSet {
  weightKg: number | string | null
  reps: number | string | null
  rpe: number | string | null
  completed: boolean
}

interface SelectedExercise {
  exerciseId: string
  name: string
  muscleGroup: MuscleGroup
  sets: WorkoutSet[]
}

interface ApiError {
  data?: {
    error?: string
  }
}


interface WorkoutSummary {
  id: string
  name: string
  startedAt: string
  endedAt: string | null
}

interface PreviousWorkout {
  id: string
  name: string
  exercises: {
    exerciseId: string
    exercise: {
      id: string
      name: string
      muscleGroup: MuscleGroup
    }
    sets: {
      weightKg: number | string | null
      reps: number | null
      rpe: number | string | null
      completed: boolean
    }[]
  }[]
}

const router = useRouter()

const workoutName = ref('')
const selectedExercises = ref<SelectedExercise[]>([])

const catalog = ref<Exercise[]>([])
const catalogLoading = ref(false)
const creatingWorkout = ref(false)
const creatingExercise = ref(false)

const error = ref('')
const catalogError = ref('')

const showPicker = ref(false)
const showCustomForm = ref(false)

const search = ref('')
const muscleFilter = ref<MuscleGroup | 'ALL'>('ALL')

const customName = ref('')
const customMuscle = ref<MuscleGroup>('CHEST')
const customEquipment = ref<Equipment>('DUMBBELL')

const previousWorkouts = ref<WorkoutSummary[]>([])
const loadingPrevious = ref(false)
const loadingTemplateId = ref<string | null>(null)
const previousError = ref('')

const muscleGroups: { value: MuscleGroup; label: string }[] = [
  { value: 'CHEST', label: 'Pectoraux' },
  { value: 'BACK', label: 'Dos' },
  { value: 'SHOULDERS', label: 'Épaules' },
  { value: 'BICEPS', label: 'Biceps' },
  { value: 'TRICEPS', label: 'Triceps' },
  { value: 'QUADS', label: 'Quadriceps' },
  { value: 'HAMSTRINGS', label: 'Ischio-jambiers' },
  { value: 'GLUTES', label: 'Fessiers' },
  { value: 'CALVES', label: 'Mollets' },
  { value: 'ABS', label: 'Abdominaux' },
  { value: 'FULL_BODY', label: 'Full body' },
]

const equipments: { value: Equipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barre' },
  { value: 'DUMBBELL', label: 'Haltères' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'CABLE', label: 'Poulie' },
  { value: 'BODYWEIGHT', label: 'Poids du corps' },
  { value: 'KETTLEBELL', label: 'Kettlebell' },
  { value: 'OTHER', label: 'Autre' },
]

const filteredCatalog = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')

  return catalog.value.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLocaleLowerCase('fr')
      .includes(query)

    const matchesMuscle =
      muscleFilter.value === 'ALL' ||
      exercise.muscleGroup === muscleFilter.value

    return matchesSearch && matchesMuscle
  })
})

const totalSets = computed(() =>
  selectedExercises.value.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  ),
)

function muscleLabel(group: MuscleGroup): string {
  return muscleGroups.find((item) => item.value === group)?.label ?? group
}

function equipmentLabel(equipment: Equipment): string {
  return equipments.find((item) => item.value === equipment)?.label ?? equipment
}

function emptySet(): WorkoutSet {
  return {
    weightKg: null,
    reps: null,
    rpe: null,
    completed: false,
  }
}

function normalizeNumber(
  value: number | string | null,
): number | null {
  if (value === null || value === '') return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function loadCatalog(): Promise<void> {
  catalogLoading.value = true
  catalogError.value = ''

  try {
    const response = await $fetch<{ exercises: Exercise[] }>(
      '/api/exercises',
      { credentials: 'include' },
    )

    catalog.value = response.exercises
  } catch {
    catalogError.value = 'Impossible de charger les exercices.'
  } finally {
    catalogLoading.value = false
  }
}

async function openPicker(): Promise<void> {
  showPicker.value = true
  showCustomForm.value = false
  search.value = ''
  muscleFilter.value = 'ALL'

  if (!catalog.value.length) {
    await loadCatalog()
  }
}

function addExercise(exercise: Exercise): void {
  selectedExercises.value.push({
    exerciseId: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sets: [emptySet()],
  })

  showPicker.value = false
  showCustomForm.value = false
  error.value = ''
}

function removeExercise(index: number): void {
  selectedExercises.value.splice(index, 1)
}

function addSet(exercise: SelectedExercise): void {
  if (exercise.sets.length >= 30) return

  const previous = exercise.sets.at(-1)

  exercise.sets.push({
    weightKg: previous?.weightKg ?? null,
    reps: previous?.reps ?? null,
    rpe: previous?.rpe ?? null,
    completed: false,
  })
}

function removeSet(exercise: SelectedExercise, index: number): void {
  exercise.sets.splice(index, 1)
}

async function createCustomExercise(): Promise<void> {
  if (creatingExercise.value) return

  const name = customName.value.trim()

  if (name.length < 2) {
    catalogError.value = 'Le nom doit contenir au moins 2 caractères.'
    return
  }

  creatingExercise.value = true
  catalogError.value = ''

  try {
    const response = await $fetch<{ exercise: Exercise }>(
      '/api/exercises',
      {
        method: 'POST',
        credentials: 'include',
        body: {
          name,
          muscleGroup: customMuscle.value,
          equipment: customEquipment.value,
        },
      },
    )

    catalog.value.push(response.exercise)
    catalog.value.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

    addExercise(response.exercise)
    customName.value = ''
  } catch (err) {
    const apiError = err as ApiError

    catalogError.value =
      apiError.data?.error ??
      "Impossible de créer l'exercice."
  } finally {
    creatingExercise.value = false
  }
}


async function loadPreviousWorkouts(): Promise<void> {
  loadingPrevious.value = true
  previousError.value = ''

  try {
    const response = await $fetch<{
      workouts: WorkoutSummary[]
    }>('/api/workouts', {
      credentials: 'include',
    })

    // On privilégie les séances terminées :
    // elles représentent des entraînements déjà réalisés.
    previousWorkouts.value = response.workouts
      .filter((workout) => workout.endedAt !== null)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() -
          new Date(a.startedAt).getTime(),
      )
  } catch {
    previousError.value =
      'Impossible de charger tes anciennes séances.'
  } finally {
    loadingPrevious.value = false
  }
}


async function reuseWorkout(workoutId: string): Promise<void> {
  if (loadingTemplateId.value) return

  // Évite d'écraser accidentellement un formulaire déjà rempli.
  if (
    selectedExercises.value.length > 0 &&
    !window.confirm(
      'Remplacer les exercices actuellement ajoutés par ceux de cette séance ?',
    )
  ) {
    return
  }

  loadingTemplateId.value = workoutId
  previousError.value = ''
  error.value = ''

  try {
    const response = await $fetch<{
      workout: PreviousWorkout
    }>(`/api/workouts/${workoutId}`, {
      credentials: 'include',
    })

    const previous = response.workout

    const copiedExercises: SelectedExercise[] =
      previous.exercises.map((item) => ({
        exerciseId: item.exerciseId,
        name: item.exercise.name,
        muscleGroup: item.exercise.muscleGroup,

        // On conserve les charges et les répétitions,
        // mais aucune série ne doit être déjà validée.
        sets: item.sets.length
          ? item.sets.map((set) => ({
              weightKg: normalizeNumber(set.weightKg),
              reps: set.reps,
              rpe: normalizeNumber(set.rpe),
              completed: false,
            }))
          : [emptySet()],
      }))

    workoutName.value = previous.name
    selectedExercises.value = copiedExercises

    // On ne touche pas à l'ancienne séance.
    // Le nouveau workout sera créé uniquement quand
    // l'utilisateur cliquera sur "Démarrer la séance".
  } catch {
    previousError.value =
      'Impossible de récupérer cette séance.'
  } finally {
    loadingTemplateId.value = null
  }
}


async function createWorkout(): Promise<void> {
  if (creatingWorkout.value) return

  const name = workoutName.value.trim()

  if (!name) {
    error.value = 'Donne un nom à ta séance.'
    return
  }

  if (!selectedExercises.value.length) {
    error.value = 'Ajoute au moins un exercice.'
    return
  }

  if (selectedExercises.value.length > 40) {
    error.value = 'Une séance ne peut pas dépasser 40 exercices.'
    return
  }

  const exercises = selectedExercises.value.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    sets: exercise.sets.map((set) => ({
      weightKg: normalizeNumber(set.weightKg),
      reps: normalizeNumber(set.reps),
      rpe: normalizeNumber(set.rpe),
      completed: set.completed,
    })),
  }))

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (
        (set.weightKg !== null && (set.weightKg < 0 || set.weightKg > 2000)) ||
        (set.reps !== null &&
          (!Number.isInteger(set.reps) || set.reps < 0 || set.reps > 1000)) ||
        (set.rpe !== null && (set.rpe < 1 || set.rpe > 10))
      ) {
        error.value = 'Vérifie les poids, répétitions et RPE saisis.'
        return
      }
    }
  }

  creatingWorkout.value = true
  error.value = ''

  try {
    const response = await $fetch<{ workout: { id: string } }>(
      '/api/workouts',
      {
        method: 'POST',
        credentials: 'include',
        body: { name, exercises },
      },
    )

    await router.push(`/workouts/${response.workout.id}`)
  } catch (err) {
    const apiError = err as ApiError

    error.value =
      apiError.data?.error ??
      "Impossible de créer la séance."
  } finally {
    creatingWorkout.value = false
  }
}

onMounted(() => {
  void loadCatalog()
  void loadPreviousWorkouts()
})
</script>

<template>
  <main class="mx-auto max-w-2xl px-5 pb-32 pt-7">
    <NuxtLink
      to="/workouts"
      class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
    >
      <ArrowLeft :size="18" />
      Mes séances
    </NuxtLink>

    <header class="mb-7">
      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
        Spot / Entraînements
      </p>

      <h1 class="text-3xl font-bold tracking-tight text-white">
        Nouvelle séance
      </h1>

      <p class="mt-2 text-sm text-slate-400">
        Prépare ton entraînement et ajoute tes exercices.
      </p>
    </header>

    
    <section class="mb-8">
    <div class="mb-4">
        <h2 class="text-lg font-semibold text-white">
        Reprendre une séance
        </h2>

        <p class="mt-1 text-sm text-slate-400">
        Réutilise les exercices et les charges d'un entraînement précédent.
        </p>
    </div>

    <div
        v-if="loadingPrevious"
        class="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400"
    >
        <LoaderCircle
        :size="22"
        class="mx-auto mb-2 animate-spin"
        />
        Chargement des séances...
    </div>

    <div
        v-else-if="previousError"
        class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
    >
        {{ previousError }}

        <button
        type="button"
        class="ml-2 font-semibold underline"
        @click="loadPreviousWorkouts"
        >
        Réessayer
        </button>
    </div>

    <div
        v-else-if="!previousWorkouts.length"
        class="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400"
    >
        Tu n'as pas encore de séance terminée à réutiliser.
        Tu peux créer ta première séance juste en dessous.
    </div>

    <div v-else class="space-y-2">
        <button
        v-for="previous in previousWorkouts"
        :key="previous.id"
        type="button"
        :disabled="loadingTemplateId !== null"
        class="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-lime-300/40 hover:bg-white/[0.06] disabled:opacity-50"
        @click="reuseWorkout(previous.id)"
        >
        <div class="flex min-w-0 items-center gap-3">
            <div class="rounded-xl bg-lime-300/10 p-3 text-lime-300">
            <Dumbbell :size="20" />
            </div>

            <div class="min-w-0">
            <p class="truncate font-semibold text-white">
                {{ previous.name }}
            </p>

            <p class="mt-1 text-xs text-slate-400">
                {{
                new Date(previous.startedAt).toLocaleDateString(
                    'fr-FR',
                    {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    },
                )
                }}
            </p>
            </div>
        </div>

        <LoaderCircle
            v-if="loadingTemplateId === previous.id"
            :size="19"
            class="shrink-0 animate-spin text-lime-300"
        />

        <Plus
            v-else
            :size="19"
            class="shrink-0 text-lime-300"
        />
        </button>
    </div>

    <div class="my-7 flex items-center gap-3">
        <div class="h-px flex-1 bg-white/10" />
        <span class="text-xs font-medium uppercase tracking-widest text-slate-500">
        Ou créer une séance
        </span>
        <div class="h-px flex-1 bg-white/10" />
    </div>
    </section>


    <section class="mb-6">
      <label
        for="workout-name"
        class="mb-2 block text-sm font-semibold text-slate-200"
      >
        Nom de la séance
      </label>

      <input
        id="workout-name"
        v-model="workoutName"
        type="text"
        maxlength="100"
        placeholder="Ex. Push Day, Pull Day, Legs..."
        class="w-full rounded-2xl border border-white/10 bg-[#141D29] px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-lime-300"
      />
    </section>

    <section class="mb-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">
          Exercices
        </h2>

        <span class="text-xs text-slate-400">
          {{ selectedExercises.length }} exercices · {{ totalSets }} séries
        </span>
      </div>

      <div
        v-if="!selectedExercises.length"
        class="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center"
      >
        <Dumbbell
          :size="36"
          class="mx-auto mb-4 text-slate-500"
        />

        <h3 class="font-semibold text-white">
          Aucun exercice ajouté
        </h3>

        <p class="mt-2 text-sm text-slate-400">
          Choisis un exercice dans le catalogue ou crée le tien.
        </p>
      </div>

      <div class="space-y-4">
        <article
          v-for="(exercise, exerciseIndex) in selectedExercises"
          :key="exerciseIndex"
          class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
        >
          <div class="flex items-center justify-between gap-3 border-b border-white/10 p-4">
            <div class="flex min-w-0 items-center gap-3">
              <div class="rounded-xl bg-lime-300/10 p-2.5 text-lime-300">
                <Dumbbell :size="19" />
              </div>

              <div class="min-w-0">
                <h3 class="truncate font-semibold text-white">
                  {{ exercise.name }}
                </h3>

                <p class="mt-1 text-xs text-slate-400">
                  {{ muscleLabel(exercise.muscleGroup) }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
              aria-label="Supprimer l'exercice"
              @click="removeExercise(exerciseIndex)"
            >
              <Trash2 :size="18" />
            </button>
          </div>

          <div class="p-4">
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
                placeholder="—"
                class="min-w-0 rounded-lg border border-white/10 bg-[#141D29] px-2 py-3 text-center text-sm text-white outline-none focus:border-lime-300"
              />

              <input
                v-model.number="set.reps"
                type="number"
                min="0"
                max="1000"
                step="1"
                placeholder="—"
                class="min-w-0 rounded-lg border border-white/10 bg-[#141D29] px-2 py-3 text-center text-sm text-white outline-none focus:border-lime-300"
              />

              <input
                v-model.number="set.rpe"
                type="number"
                min="1"
                max="10"
                step="0.5"
                placeholder="—"
                class="min-w-0 rounded-lg border border-white/10 bg-[#141D29] px-2 py-3 text-center text-sm text-white outline-none focus:border-lime-300"
              />

              <button
                type="button"
                class="flex h-10 w-9 items-center justify-center rounded-lg border transition"
                :class="
                  set.completed
                    ? 'border-lime-300 bg-lime-300 text-slate-950'
                    : 'border-white/10 bg-[#141D29] text-slate-500'
                "
                :aria-label="`Valider la série ${setIndex + 1}`"
                @click="set.completed = !set.completed"
              >
                <Check v-if="set.completed" :size="18" />
              </button>
            </div>

            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                :disabled="exercise.sets.length >= 30"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
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
      </div>

      <button
        type="button"
        :disabled="selectedExercises.length >= 40"
        class="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-lime-300/40 bg-lime-300/5 py-4 font-semibold text-lime-300 hover:bg-lime-300/10 disabled:opacity-50"
        @click="openPicker"
      >
        <Plus :size="19" />
        Ajouter un exercice
      </button>
    </section>

    <div
      v-if="error"
      class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
    >
      {{ error }}
    </div>

    <button
      type="button"
      :disabled="creatingWorkout"
      class="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 px-5 py-4 font-bold text-slate-950 transition hover:bg-lime-200 disabled:opacity-50"
      @click="createWorkout"
    >
      <LoaderCircle
        v-if="creatingWorkout"
        :size="20"
        class="animate-spin"
      />
      <Dumbbell v-else :size="20" />
      Démarrer la séance
    </button>

    <p class="mt-3 text-center text-xs text-slate-500">
      Ta séance sera enregistrée et tu pourras la reprendre plus tard.
    </p>

    <!-- Sélecteur d'exercices -->
    <div
      v-if="showPicker"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
    >
      <div class="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-[#141D29] p-5 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-white">
            {{ showCustomForm ? 'Créer un exercice' : 'Choisir un exercice' }}
          </h2>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:text-white"
            aria-label="Fermer"
            @click="showPicker = false"
          >
            <X :size="20" />
          </button>
        </div>

        <!-- Création d'un exercice personnalisé -->
        <div v-if="showCustomForm" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm text-slate-300">
              Nom de l'exercice
            </label>

            <input
              v-model="customName"
              maxlength="100"
              placeholder="Ex. Curl marteau poulie basse"
              class="w-full rounded-xl border border-white/10 bg-[#0B1018] px-4 py-3 text-white outline-none focus:border-lime-300"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">
              Groupe musculaire
            </label>

            <select
              v-model="customMuscle"
              class="w-full rounded-xl border border-white/10 bg-[#0B1018] px-4 py-3 text-white outline-none focus:border-lime-300"
            >
              <option
                v-for="group in muscleGroups"
                :key="group.value"
                :value="group.value"
              >
                {{ group.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">
              Équipement
            </label>

            <select
              v-model="customEquipment"
              class="w-full rounded-xl border border-white/10 bg-[#0B1018] px-4 py-3 text-white outline-none focus:border-lime-300"
            >
              <option
                v-for="equipment in equipments"
                :key="equipment.value"
                :value="equipment.value"
              >
                {{ equipment.label }}
              </option>
            </select>
          </div>

          <p
            v-if="catalogError"
            class="text-sm text-red-300"
          >
            {{ catalogError }}
          </p>

          <button
            type="button"
            :disabled="creatingExercise || customName.trim().length < 2"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-3.5 font-bold text-slate-950 disabled:opacity-50"
            @click="createCustomExercise"
          >
            <LoaderCircle
              v-if="creatingExercise"
              :size="18"
              class="animate-spin"
            />
            <Plus v-else :size="18" />
            Créer et ajouter
          </button>

          <button
            type="button"
            class="w-full py-2 text-sm text-slate-400"
            @click="showCustomForm = false"
          >
            Retour au catalogue
          </button>
        </div>

        <!-- Catalogue -->
        <template v-else>
          <div class="relative mb-3">
            <Search
              :size="18"
              class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              v-model="search"
              type="search"
              placeholder="Rechercher un exercice..."
              class="w-full rounded-xl border border-white/10 bg-[#0B1018] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-lime-300"
            />
          </div>

          <div class="relative mb-4">
            <select
              v-model="muscleFilter"
              class="w-full appearance-none rounded-xl border border-white/10 bg-[#0B1018] px-4 py-3 text-sm text-white outline-none focus:border-lime-300"
            >
              <option value="ALL">Tous les muscles</option>

              <option
                v-for="group in muscleGroups"
                :key="group.value"
                :value="group.value"
              >
                {{ group.label }}
              </option>
            </select>

            <ChevronDown
              :size="17"
              class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
            <div
              v-if="catalogLoading"
              class="py-10 text-center text-slate-400"
            >
              <LoaderCircle
                :size="25"
                class="mx-auto animate-spin"
              />
            </div>

            <p
              v-else-if="catalogError"
              class="py-8 text-center text-sm text-red-300"
            >
              {{ catalogError }}
            </p>

            <button
              v-for="exercise in catalogLoading ? [] : filteredCatalog"
              :key="exercise.id"
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              @click="addExercise(exercise)"
            >
              <div class="min-w-0">
                <p class="font-medium text-white">
                  {{ exercise.name }}
                </p>

                <p class="mt-1 text-xs text-slate-400">
                  {{ muscleLabel(exercise.muscleGroup) }} ·
                  {{ equipmentLabel(exercise.equipment) }}
                  <span v-if="exercise.createdById" class="text-lime-300">
                    · Personnel
                  </span>
                </p>
              </div>

              <Plus :size="19" class="shrink-0 text-lime-300" />
            </button>

            <p
              v-if="!catalogLoading && !catalogError && !filteredCatalog.length"
              class="py-8 text-center text-sm text-slate-400"
            >
              Aucun exercice trouvé.
            </p>
          </div>

          <button
            type="button"
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-lime-300/30 bg-lime-300/10 py-3.5 font-semibold text-lime-300"
            @click="showCustomForm = true; catalogError = ''"
          >
            <Plus :size="18" />
            Créer mon propre exercice
          </button>
        </template>
      </div>
    </div>
  </main>
</template>
