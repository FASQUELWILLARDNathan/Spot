
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Dumbbell, Info, LoaderCircle, X } from 'lucide-vue-next'

const props = defineProps<{
  exerciseId: string
  name: string
}>()

interface ExerciseDetails {
  id: string
  name: string
  descriptionFr: string | null
  instructionSteps: string[]
  animationUrl: string | null
  imageUrl: string | null
  targetMuscle: string | null
  secondaryMuscles: string[]
  equipment: string
}

type CatalogExercise = {
  datasetId: string
  name: string
  descriptionFr: string | null
  instructionSteps: string[]
  animationUrl: string | null
  imageUrl: string | null
  targetMuscle: string | null
  secondaryMuscles: string[]
  equipment: string
}

const isOpen = ref(false)
const loading = ref(false)
const error = ref('')
const details = ref<ExerciseDetails | null>(null)

let timer: ReturnType<typeof setTimeout> | null = null
let startX = 0
let startY = 0
let activePointerId: number | null = null
let requestVersion = 0

const catalog = useState<CatalogExercise[] | null>(
  'spot-exercise-catalog',
  () => null,
)

function cancelHold() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  activePointerId = null
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function openPreview() {
  cancelHold()
  isOpen.value = true
  void loadDetails()
}

function startHold(event: PointerEvent) {
  if (isOpen.value) return

  // Souris : uniquement le survol.
  // Tactile : uniquement un appui avec le doigt.
  if (event.pointerType === 'mouse' && event.type !== 'pointerenter') {
    return
  }

  if (event.pointerType !== 'mouse' && event.type !== 'pointerdown') {
    return
  }

  cancelHold()

  activePointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY

  timer = setTimeout(() => {
    openPreview()
  }, 2000)
}

function moveHold(event: PointerEvent) {
  // Sur PC, bouger légèrement la souris ne doit rien annuler.
  if (event.pointerType === 'mouse') return

  if (activePointerId !== event.pointerId) return

  const distance = Math.hypot(
    event.clientX - startX,
    event.clientY - startY,
  )

  if (distance > 12) {
    cancelHold()
  }
}

function handlePointerLeave(event: PointerEvent) {
  // On annule quand la souris quitte réellement l'exercice.
  if (event.pointerType === 'mouse') {
    cancelHold()
  }
}

async function loadDetails() {
  if (details.value) return

  const version = ++requestVersion
  loading.value = true
  error.value = ''

  try {
    // 1. Récupérer les informations depuis le backend
    let apiExercise: ExerciseDetails | null = null

    try {
      const response = await $fetch<{ exercise: ExerciseDetails }>(
        `/api/exercises/${encodeURIComponent(props.exerciseId)}`,
        { credentials: 'include' },
      )

      apiExercise = response.exercise
    } catch (err) {
      console.warn('API exercice indisponible :', err)
    }

    // 2. Charger le catalogue contenant les GIF
    if (!catalog.value) {
      catalog.value = await $fetch<CatalogExercise[]>(
        '/exercises/catalog.json',
      )
    }

    // 3. Chercher l'exercice correspondant
    const matchingExercise = catalog.value.find(
      (item) =>
        normalizeName(item.name) === normalizeName(props.name),
    )

    if (version !== requestVersion) return

    // 4. Fusionner les informations
    if (matchingExercise || apiExercise) {
      details.value = {
        ...apiExercise,
        id: props.exerciseId,
        name: props.name,

        descriptionFr:
          matchingExercise?.descriptionFr ??
          apiExercise?.descriptionFr ??
          null,

        instructionSteps:
          matchingExercise?.instructionSteps ??
          apiExercise?.instructionSteps ??
          [],

        animationUrl:
          matchingExercise?.animationUrl ??
          apiExercise?.animationUrl ??
          null,

        imageUrl:
          matchingExercise?.imageUrl ??
          apiExercise?.imageUrl ??
          null,

        targetMuscle:
          matchingExercise?.targetMuscle ??
          apiExercise?.targetMuscle ??
          null,

        secondaryMuscles:
          matchingExercise?.secondaryMuscles ??
          apiExercise?.secondaryMuscles ??
          [],

        equipment:
          matchingExercise?.equipment ??
          apiExercise?.equipment ??
          '',
      } as ExerciseDetails
    } else {
      error.value = 'Exercice introuvable dans le catalogue.'
    }
  } catch (err) {
    console.error('Erreur chargement exercice :', err)

    if (version === requestVersion) {
      error.value = 'Impossible de charger les explications.'
    }
  } finally {
    if (version === requestVersion) {
      loading.value = false
    }
  }
}

function closePreview() {
  isOpen.value = false
  cancelHold()
}

onBeforeUnmount(() => {
  cancelHold()
  requestVersion++
})
</script>

<template>
  <div
    class="min-w-0 flex-1 select-none touch-pan-y"
    @pointerenter="startHold"
    @pointerdown="startHold"
    @pointermove="moveHold"
    @pointerleave="handlePointerLeave"
    @pointerup="event => {
        if (event.pointerType !== 'mouse') cancelHold()
    }"
    @pointercancel="cancelHold"
    @contextmenu.prevent
    >
    <div class="flex min-w-0 items-center gap-3">
      <div class="rounded-xl bg-lime-300/10 p-2.5 text-lime-300">
        <Dumbbell :size="19" />
      </div>

      <div class="min-w-0 flex-1">
        <h2 class="truncate font-semibold text-white">
          {{ name }}
        </h2>
        <p class="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <Info :size="12" />
          Survol ou appui long : 2 s
        </p>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center"
      @click.self="closePreview"
    >
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="`Informations sur ${name}`"
        class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#141D29] p-5 text-white shadow-2xl"
        @keydown.esc="closePreview"
      >
        <div class="mb-5 flex items-start justify-between gap-3">
          <div>
            <p class="mb-1 text-xs font-bold uppercase tracking-widest text-lime-300">
              Guide de l'exercice
            </p>
            <h2 class="text-xl font-bold">{{ name }}</h2>
          </div>

          <button
            type="button"
            class="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-white/10"
            aria-label="Fermer"
            @click="closePreview"
          >
            <X :size="20" />
          </button>
        </div>

        <div v-if="loading" class="flex justify-center py-16">
          <LoaderCircle :size="28" class="animate-spin text-lime-300" />
        </div>

        <div v-else-if="error" class="space-y-3 py-8 text-center">
          <p class="text-sm text-red-300">{{ error }}</p>
          <button
            class="text-sm font-semibold text-lime-300"
            @click="loadDetails"
          >
            Réessayer
          </button>
        </div>

        <template v-else-if="details">
          <div
            class="mb-5 flex min-h-48 items-center justify-center overflow-hidden rounded-2xl bg-[#0B1018] p-4"
          >
            <img
              v-if="details.animationUrl || details.imageUrl"
              :src="details.animationUrl || details.imageUrl || ''"
              :alt="`Démonstration de ${name}`"
              class="max-h-64 max-w-full object-contain"
            />

            <div v-else class="text-center">
              <Dumbbell
                :size="40"
                class="mx-auto mb-3 text-lime-300"
              />
              <p class="text-xs text-slate-400">
                Animation bientôt disponible
              </p>
            </div>
          </div>

          <div class="mb-5 grid grid-cols-2 gap-3">
            <div class="rounded-xl bg-white/5 p-3">
              <p class="text-xs text-slate-400">Muscle ciblé</p>
              <p class="mt-1 text-sm font-semibold">
                {{ details.targetMuscle || 'Non renseigné' }}
              </p>
            </div>

            <div class="rounded-xl bg-white/5 p-3">
              <p class="text-xs text-slate-400">Équipement</p>
              <p class="mt-1 text-sm font-semibold">
                {{ details.equipment }}
              </p>
            </div>
          </div>

          <h3 class="mb-3 font-bold">Comment réaliser l'exercice ?</h3>

          <ol
            v-if="details.instructionSteps?.length"
            class="mb-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-300"
          >
            <li
              v-for="(step, index) in details.instructionSteps"
              :key="index"
            >
              {{ step }}
            </li>
          </ol>

          <p
            v-else-if="details.descriptionFr"
            class="mb-5 whitespace-pre-line text-sm leading-relaxed text-slate-300"
          >
            {{ details.descriptionFr }}
          </p>

          <p v-else class="mb-5 text-sm text-slate-400">
            Aucune explication disponible pour cet exercice.
          </p>

          <div v-if="details.secondaryMuscles?.length" class="mb-5">
            <h3 class="mb-3 font-bold">Muscles secondaires</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="muscle in details.secondaryMuscles"
                :key="muscle"
                class="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300"
              >
                {{ muscle }}
              </span>
            </div>
          </div>
        </template>

        <button
          type="button"
          class="mt-2 w-full rounded-xl bg-lime-300 py-3.5 font-bold text-slate-950 hover:bg-lime-200"
          @click="closePreview"
        >
          Compris !
        </button>
      </section>
    </div>
  </Teleport>
</template>
