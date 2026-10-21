
<script setup lang="ts">
import {
  Trophy,
  Dumbbell,
  TrendingUp,
  Layers3,
  RefreshCw,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

interface Performance {
  weightKg: number
  reps: number
  performedAt: string
  workoutId: string
  workoutName: string
}

interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  equipment: string
  totalSets: number
  maxWeight: Performance
  maxVolume: Performance & {
    volumeKg: number
  }
  estimatedOneRepMax:
    | (Performance & { estimatedKg: number })
    | null
}

const records = ref<PersonalRecord[]>([])
const loading = ref(true)
const error = ref('')

function formatKg(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)
}

async function loadRecords(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<{
      records: PersonalRecord[]
    }>('/api/records', {
      credentials: 'include',
    })

    records.value = response.records
  } catch {
    error.value = 'Impossible de charger les records.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-28">
    <NuxtLink
      to="/"
      class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft :size="18" />
      Accueil
    </NuxtLink>
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-lime-300">
          Spot / Progression
        </p>

        <h1 class="mt-2 text-3xl font-bold text-white">
          Mes records
        </h1>

        <p class="mt-2 text-sm text-slate-400">
          Tes meilleures performances détectées automatiquement.
        </p>
      </div>

      <button
        type="button"
        class="rounded-xl border border-white/10 p-3 text-slate-300 hover:bg-white/5"
        aria-label="Actualiser les records"
        :disabled="loading"
        @click="loadRecords"
      >
        <RefreshCw :size="19" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <p v-if="loading" class="text-sm text-slate-400">
      Chargement de tes records...
    </p>

    <p
      v-else-if="error"
      class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
    >
      {{ error }}
    </p>

    <div
      v-else-if="records.length === 0"
      class="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
    >
      <Trophy :size="36" class="mx-auto text-lime-300" />

      <h2 class="mt-4 text-lg font-semibold text-white">
        Aucun record pour le moment
      </h2>

      <p class="mt-2 text-sm text-slate-400">
        Valide des séries avec un poids et des répétitions
        pendant tes séances pour voir tes premiers records.
      </p>

      <NuxtLink
        to="/workouts/new"
        class="mt-5 inline-block rounded-xl bg-lime-300 px-5 py-3 font-semibold text-slate-950"
      >
        Créer une séance
      </NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-400">
          {{ records.length }} exercices avec des performances
        </p>
      </div>

      <article
        v-for="record in records"
        :key="record.exerciseId"
        class="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-lime-300/10 p-3 text-lime-300">
            <Dumbbell :size="21" />
          </div>

          <div>
            <h2 class="font-semibold text-white">
              {{ record.exerciseName }}
            </h2>

            <p class="text-xs text-slate-400">
              {{ record.totalSets }} séries enregistrées
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-slate-800/70 p-4">
            <div class="flex items-center gap-2 text-slate-400">
              <Trophy :size="15" />
              <span class="text-xs">Charge maximale</span>
            </div>

            <p class="mt-2 text-2xl font-bold text-white">
              {{ formatKg(record.maxWeight.weightKg) }}
              <span class="text-sm text-slate-400">kg</span>
            </p>

            <p class="mt-1 text-xs text-slate-400">
              {{ record.maxWeight.reps }} répétitions
            </p>
          </div>

          <div class="rounded-xl bg-slate-800/70 p-4">
            <div class="flex items-center gap-2 text-slate-400">
              <TrendingUp :size="15" />
              <span class="text-xs">1RM estimé</span>
            </div>

            <p class="mt-2 text-2xl font-bold text-white">
              <template v-if="record.estimatedOneRepMax">
                {{ formatKg(record.estimatedOneRepMax.estimatedKg) }}
                <span class="text-sm text-slate-400">kg</span>
              </template>
              <template v-else>—</template>
            </p>

            <p class="mt-1 text-xs text-slate-400">
              Estimation théorique
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-white/10 pt-3">
          <div class="flex items-center gap-2 text-slate-400">
            <Layers3 :size="16" />
            <span class="text-sm">Meilleur volume sur une série</span>
          </div>

          <span class="text-sm font-semibold text-white">
            {{ formatKg(record.maxVolume.volumeKg) }} kg
          </span>
        </div>
      </article>
    </div>
  </main>
</template>
