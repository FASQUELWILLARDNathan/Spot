
<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import {
  Plus,
  Scale,
  Trash2,
  Pencil,
  X,
  LoaderCircle,
  Trophy,
  ChartNoAxesCombined,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
)

interface WeighIn {
  id: string
  weightKg: string
  bodyFatPct: string | null
  muscleMassKg: string | null
  bodyWaterPct: string | null
  measuredAt: string
  createdAt: string
}

interface WeighInsResponse {
  weighIns: WeighIn[]
}

type Period = '7d' | '30d' | '90d' | 'all'

const config = useRuntimeConfig()

const weighIns = ref<WeighIn[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const period = ref<Period>('30d')

const form = reactive({
  weightKg: '',
  bodyFatPct: '',
  muscleMassKg: '',
  bodyWaterPct: '',
  measuredAt: '',
})

function localDateTimeValue(date = new Date()) {
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  )

  return local.toISOString().slice(0, 16)
}

function resetForm() {
  editingId.value = null
  form.weightKg = ''
  form.bodyFatPct = ''
  form.muscleMassKg = ''
  form.bodyWaterPct = ''
  form.measuredAt = localDateTimeValue()
  formError.value = ''
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(item: WeighIn) {
  editingId.value = item.id
  form.weightKg = item.weightKg
  form.bodyFatPct = item.bodyFatPct ?? ''
  form.muscleMassKg = item.muscleMassKg ?? ''
  form.bodyWaterPct = item.bodyWaterPct ?? ''
  form.measuredAt = localDateTimeValue(new Date(item.measuredAt))
  formError.value = ''
  showForm.value = true
}

async function loadWeighIns() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch<WeighInsResponse>(
      `${config.public.apiBase}/weigh-ins`,
      { credentials: 'include' },
    )

    weighIns.value = response.weighIns
  }
  catch {
    error.value = "Impossible de charger tes pesées."
  }
  finally {
    loading.value = false
  }
}

async function saveWeighIn() {
  formError.value = ''

  if (!form.weightKg || !form.measuredAt) {
    formError.value = 'Le poids et la date sont obligatoires.'
    return
  }

  const optionalNumber = (value: string) =>
    value.trim() === '' ? null : Number(value)

  const body = {
    weightKg: Number(form.weightKg),
    bodyFatPct: optionalNumber(form.bodyFatPct),
    muscleMassKg: optionalNumber(form.muscleMassKg),
    bodyWaterPct: optionalNumber(form.bodyWaterPct),
    measuredAt: new Date(form.measuredAt).toISOString(),
  }

  saving.value = true

  try {
    if (editingId.value) {
      await $fetch(
        `${config.public.apiBase}/weigh-ins/${editingId.value}`,
        {
          method: 'PATCH',
          credentials: 'include',
          body,
        },
      )
    }
    else {
      await $fetch(`${config.public.apiBase}/weigh-ins`, {
        method: 'POST',
        credentials: 'include',
        body,
      })
    }

    showForm.value = false
    resetForm()
    await loadWeighIns()
  }
  catch (err: unknown) {
    formError.value =
      'Impossible d’enregistrer cette pesée. Vérifie les valeurs.'
  }
  finally {
    saving.value = false
  }
}

async function deleteWeighIn(item: WeighIn) {
  if (!confirm('Supprimer définitivement cette pesée ?')) return

  try {
    await $fetch(
      `${config.public.apiBase}/weigh-ins/${item.id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    )

    await loadWeighIns()
  }
  catch {
    error.value = 'Impossible de supprimer cette pesée.'
  }
}

const sortedWeighIns = computed(() =>
  [...weighIns.value].sort(
    (a, b) =>
      new Date(a.measuredAt).getTime() -
      new Date(b.measuredAt).getTime(),
  ),
)

const filteredWeighIns = computed(() => {
  if (period.value === 'all') return sortedWeighIns.value

  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }[period.value]

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

  return sortedWeighIns.value.filter(
    item => new Date(item.measuredAt).getTime() >= cutoff,
  )
})

const latest = computed(() =>
  sortedWeighIns.value.at(-1) ?? null,
)

const first = computed(() =>
  sortedWeighIns.value[0] ?? null,
)

const weightChange = computed(() => {
  if (!latest.value || !first.value) return null

  return Number(latest.value.weightKg) -
    Number(first.value.weightKg)
})

const chartData = computed(() => ({
  labels: filteredWeighIns.value.map(item =>
    new Date(item.measuredAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    }),
  ),
  datasets: [{
    label: 'Poids (kg)',
    data: filteredWeighIns.value.map(item =>
      Number(item.weightKg),
    ),
    borderColor: '#C9F36A',
    backgroundColor: 'rgba(201, 243, 106, 0.12)',
    pointBackgroundColor: '#C9F36A',
    pointBorderColor: '#0B1018',
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.35,
    fill: true,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#19232F',
      titleColor: '#FFFFFF',
      bodyColor: '#C9F36A',
      padding: 12,
    },
  },
  scales: {
    x: {
      ticks: { color: '#94A3B8' },
      grid: { display: false },
    },
    y: {
      ticks: { color: '#94A3B8' },
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
    },
  },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

onMounted(() => {
  resetForm()
  loadWeighIns()
})
</script>

<template>
  <main class="min-h-dvh bg-[#0B1018] px-5 py-8 pb-28 text-white">
    <div class="mx-auto max-w-3xl space-y-7">
      <header class="flex items-start justify-between gap-4">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C9F36A]">
            Ma progression
          </p>
          <h1 class="text-3xl font-bold tracking-tight">
            Statistiques
          </h1>
          <p class="mt-2 text-sm text-slate-400">
            Suis l'évolution de ton corps au fil du temps.
          </p>
        </div>

        <button
          type="button"
          aria-label="Ajouter une pesée"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C9F36A] text-[#0B1018]"
          @click="openCreate"
        >
          <Plus :size="22" />
        </button>
      </header>

      
      <!-- Accès aux statistiques de musculation -->
      <section class="grid grid-cols-2 gap-3">
        <NuxtLink
          to="/records"
          class="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#19232F] p-5 transition hover:border-[#C9F36A]/40"
        >
          <Trophy :size="24" class="text-[#C9F36A]" />

          <div>
            <h2 class="font-bold text-white">
              Mes records
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Tous mes records personnels
            </p>
          </div>
        </NuxtLink>

        <NuxtLink
          to="/progress"
          class="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#19232F] p-5 transition hover:border-[#C9F36A]/40"
        >
          <ChartNoAxesCombined
            :size="24"
            class="text-[#C9F36A]"
          />

          <div>
            <h2 class="font-bold text-white">
              Ma progression
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Mes performances par exercice
            </p>
          </div>
        </NuxtLink>
      </section>


      <p v-if="error" role="alert" class="text-sm text-red-400">
        {{ error }}
      </p>

      <div v-if="loading" class="flex justify-center py-20">
        <LoaderCircle class="animate-spin text-[#C9F36A]" :size="30" />
      </div>

      <template v-else>
        <section class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-white/5 bg-[#19232F] p-5">
            <Scale :size="19" class="mb-4 text-[#C9F36A]" />
            <p class="mb-2 text-xs text-slate-400">
              Dernier poids
            </p>
            <p class="text-2xl font-bold">
              {{ latest ? Number(latest.weightKg).toLocaleString('fr-FR') : '—' }}
              <span v-if="latest" class="text-sm font-normal text-slate-400">kg</span>
            </p>
          </div>

          <div class="rounded-2xl border border-white/5 bg-[#19232F] p-5">
            <p class="mb-5 text-sm text-[#C9F36A]">
              Évolution totale
            </p>
            <p class="text-2xl font-bold">
              {{ weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` }}
              <span v-if="weightChange !== null" class="text-sm font-normal text-slate-400">kg</span>
            </p>
          </div>
        </section>

        <section class="rounded-2xl border border-white/5 bg-[#19232F] p-5">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-bold">
              Évolution du poids
            </h2>

            <div class="flex rounded-lg bg-[#0B1018] p-1">
              <button
                v-for="option in [
                  { value: '7d', label: '7J' },
                  { value: '30d', label: '30J' },
                  { value: '90d', label: '90J' },
                  { value: 'all', label: 'Tout' },
                ]"
                :key="option.value"
                type="button"
                class="rounded-md px-2.5 py-1.5 text-xs font-semibold transition"
                :class="period === option.value
                  ? 'bg-[#C9F36A] text-[#0B1018]'
                  : 'text-slate-400'"
                @click="period = option.value as Period"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <ClientOnly>
            <div v-if="filteredWeighIns.length" class="h-64">
              <Line :data="chartData" :options="chartOptions" />
            </div>
            <p v-else class="py-16 text-center text-sm text-slate-400">
              Aucune pesée sur cette période.
            </p>
          </ClientOnly>
        </section>

        <section>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">
              Historique
            </h2>
            <span class="text-xs text-slate-400">
              {{ weighIns.length }} pesée(s)
            </span>
          </div>

          <div v-if="!weighIns.length" class="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <Scale :size="30" class="mx-auto mb-3 text-slate-500" />
            <p class="mb-4 text-sm text-slate-400">
              Tu n'as pas encore enregistré de pesée.
            </p>
            <button
              type="button"
              class="rounded-xl bg-[#C9F36A] px-5 py-3 text-sm font-bold text-[#0B1018]"
              @click="openCreate"
            >
              Ajouter ma première pesée
            </button>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="item in [...sortedWeighIns].reverse()"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#19232F] p-4"
            >
              <div>
                <p class="text-sm font-semibold">
                  {{ Number(item.weightKg).toLocaleString('fr-FR') }} kg
                </p>
                <p class="mt-1 text-xs text-slate-400">
                  {{ formatDate(item.measuredAt) }}
                </p>
                <p v-if="item.bodyFatPct !== null" class="mt-1 text-xs text-slate-400">
                  Masse grasse : {{ item.bodyFatPct }} %
                </p>
              </div>

              <div class="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label="Modifier la pesée"
                  class="rounded-lg bg-white/5 p-2.5 text-slate-300 hover:text-white"
                  @click="openEdit(item)"
                >
                  <Pencil :size="17" />
                </button>

                <button
                  type="button"
                  aria-label="Supprimer la pesée"
                  class="rounded-lg bg-red-500/10 p-2.5 text-red-400 hover:bg-red-500/20"
                  @click="deleteWeighIn(item)"
                >
                  <Trash2 :size="17" />
                </button>
              </div>
            </article>
          </div>
        </section>
      </template>
    </div>

    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      @click.self="showForm = false"
    >
      <div class="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#19232F] p-6 text-white sm:rounded-3xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-bold">
            {{ editingId ? 'Modifier la pesée' : 'Nouvelle pesée' }}
          </h2>

          <button
            type="button"
            aria-label="Fermer"
            class="rounded-lg p-2 text-slate-400 hover:bg-white/10"
            @click="showForm = false"
          >
            <X :size="22" />
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="saveWeighIn">
          <div>
            <label for="weightKg" class="mb-2 block text-sm">
              Poids (kg) *
            </label>
            <input
              id="weightKg"
              v-model="form.weightKg"
              type="number"
              step="0.01"
              min="20"
              max="400"
              required
              class="w-full rounded-xl border border-slate-700 bg-[#0B1018] px-4 py-3 outline-none focus:border-[#C9F36A]"
            >
          </div>

          <div>
            <label for="measuredAt" class="mb-2 block text-sm">
              Date et heure *
            </label>
            <input
              id="measuredAt"
              v-model="form.measuredAt"
              type="datetime-local"
              required
              class="w-full rounded-xl border border-slate-700 bg-[#0B1018] px-4 py-3 outline-none focus:border-[#C9F36A]"
            >
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="field in [
                { key: 'bodyFatPct', label: 'Masse grasse (%)', max: 100 },
                { key: 'muscleMassKg', label: 'Masse musculaire (kg)', max: 400 },
                { key: 'bodyWaterPct', label: 'Eau corporelle (%)', max: 100 },
              ]"
              :key="field.key"
            >
              <label :for="field.key" class="mb-2 block text-xs text-slate-300">
                {{ field.label }}
              </label>
              <input
                :id="field.key"
                v-model="form[field.key as keyof typeof form]"
                type="number"
                step="0.01"
                min="0"
                :max="field.max"
                placeholder="Facultatif"
                class="w-full rounded-xl border border-slate-700 bg-[#0B1018] px-3 py-3 text-sm outline-none focus:border-[#C9F36A]"
              >
            </div>
          </div>

          <p v-if="formError" role="alert" class="text-sm text-red-400">
            {{ formError }}
          </p>

          <button
            type="submit"
            :disabled="saving"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-4 font-bold text-[#0B1018] disabled:opacity-60"
          >
            <LoaderCircle v-if="saving" :size="19" class="animate-spin" />
            {{ saving ? 'Enregistrement...' : 'Enregistrer la pesée' }}
          </button>
        </form>
      </div>
    </div>
  </main>
</template>
