
<script setup lang="ts">
import { ref, watch } from 'vue'
import { History, LoaderCircle } from 'lucide-vue-next'

interface PreviousSet {
  weightKg: number | null
  reps: number | null
  rpe: number | null
}

interface PreviousWorkout {
  workoutId: string
  workoutName: string
  date: string
  sets: PreviousSet[]
}

interface PreviousResponse {
  previousWorkout: PreviousWorkout | null
}

const props = defineProps<{
  workoutId: string
  exerciseId: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  reuse: [sets: PreviousSet[]]
}>()

const config = useRuntimeConfig()

const previous = ref<PreviousWorkout | null>(null)
const loading = ref(false)
const error = ref('')

let requestVersion = 0

watch(
  () => [props.workoutId, props.exerciseId],
  async () => {
    const version = ++requestVersion

    previous.value = null
    error.value = ''

    if (!props.workoutId || !props.exerciseId) return

    loading.value = true

    try {
      const response = await $fetch<PreviousResponse>(
        `${config.public.apiBase}/performances/previous/${props.workoutId}/${props.exerciseId}`,
        { credentials: 'include' },
      )

      if (version !== requestVersion) return

      previous.value = response.previousWorkout
    } catch {
      if (version !== requestVersion) return

      error.value = "Impossible de charger l'historique."
    } finally {
      if (version === requestVersion) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function reusePerformance(): void {
  if (props.disabled || !previous.value) return

  emit(
    'reuse',
    previous.value.sets.map((set) => ({
      weightKg: set.weightKg,
      reps: set.reps,
      rpe: set.rpe,
    })),
  )
}
</script>

<template>
  <div class="mb-4 rounded-xl border border-white/10 bg-[#0B1018] p-4">
    <div class="mb-3 flex items-center gap-2">
      <History :size="17" class="text-[#C9F36A]" />

      <h4 class="text-sm font-semibold text-white">
        Dernière performance
      </h4>
    </div>

    <div v-if="loading" class="flex justify-center py-3">
      <LoaderCircle
        :size="20"
        class="animate-spin text-[#C9F36A]"
      />
    </div>

    <p v-else-if="error" class="text-xs text-red-400">
      {{ error }}
    </p>

    <p
      v-else-if="!previous"
      class="text-xs text-slate-500"
    >
      Aucun historique pour cet exercice.
    </p>

    <template v-else>
      <div class="mb-3 flex items-center justify-between gap-2">
        <p class="truncate text-xs text-slate-400">
          {{ previous.workoutName }}
        </p>

        <span class="shrink-0 text-xs text-slate-500">
          {{ formatDate(previous.date) }}
        </span>
      </div>

      <!-- Affichage des anciennes séries -->
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="(set, index) in previous.sets"
          :key="index"
          class="rounded-lg bg-[#19232F] p-3 text-center"
        >
          <p class="mb-2 text-[10px] text-slate-500">
            Série {{ index + 1 }}
          </p>

          <p class="text-sm font-bold text-white">
            {{ set.weightKg ?? '—' }} kg
          </p>

          <p class="mt-1 text-xs text-[#C9F36A]">
            {{ set.reps ?? '—' }} reps
          </p>

          <p
            v-if="set.rpe !== null"
            class="mt-1 text-[10px] text-slate-500"
          >
            RPE {{ set.rpe }}
          </p>
        </div>
      </div>

      <!-- Bouton pour reprendre les performances -->
      <button
        v-if="!disabled && previous.sets.length > 0"
        type="button"
        class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-3 text-sm font-bold text-[#0B1018] transition hover:bg-lime-200"
        @click="reusePerformance"
      >
        <History :size="17" />
        Reprendre ces performances
      </button>
    </template>
  </div>
</template>
