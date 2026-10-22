
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  Users,
  Trophy,
  ChartNoAxesColumn,
  TrendingUp,
  Dumbbell,
  Scale,
  UserRoundPlus,
  RefreshCw,
  LogOut,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-vue-next'

type PublicUser = {
  id: string
  username: string
  firstName: string
  lastName: string
}

type Member = {
  id: string
  role: 'OWNER' | 'MEMBER'
  user: PublicUser
}

type Group = {
  id: string
  name: string
  description: string | null
  ownerId?: string
  members: Member[]
}

type FriendEntry = {
  friendshipId: string
  user: PublicUser
}

type BodyPoint = {
  date: string
  weightKg: number
  bodyFatPct: number | null
  muscleMassKg: number | null
}

type MemberStats = {
  user: PublicUser
  body: {
    latestWeightKg: number | null
    weightChangeKg: number | null
    latestBodyFatPct: number | null
    latestMuscleMassKg: number | null
    latestBodyWaterPct: number | null
    history: BodyPoint[]
  }
  training: {
    workoutCount: number
    totalVolumeKg: number
    totalDurationMinutes: number
  }
}

type GroupStatsResponse = {
  group: { id: string; name: string }
  periodDays: number
  members: MemberStats[]
}

type RecordEntry = {
  userId: string
  username: string
  exerciseId: string
  exerciseName: string
  weightKg: number
  reps: number
  estimatedOneRepMaxKg: number
  performedAt: string | null
}

type ExerciseRecords = {
  exerciseId: string
  exerciseName: string
  leaderboard: RecordEntry[]
}

type RecordsResponse = {
  exercises: ExerciseRecords[]
}

type LeaderboardEntry = {
  user: PublicUser
  workoutCount: number
  totalVolumeKg: number
  totalDurationMinutes: number
}

type LeaderboardResponse = {
  days: number
  leaderboard: LeaderboardEntry[]
}

type LeaderboardMetric =
  | 'workoutCount'
  | 'totalVolumeKg'
  | 'totalDurationMinutes'

type Tab = 'progress' | 'records' | 'members' | 'leaderboard'
type Metric = 'weightKg' | 'muscleMassKg' | 'bodyFatPct'

const route = useRoute()
const apiBase = String(useRuntimeConfig().public.apiBase || '/api')
  .replace(/\/$/, '')

const group = ref<Group | null>(null)
const stats = ref<GroupStatsResponse | null>(null)
const records = ref<RecordsResponse | null>(null)
const friends = ref<FriendEntry[]>([])

const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const statsError = ref('')
const recordsError = ref('')
const inviteMessage = ref('')
const invitingId = ref<string | null>(null)
const invitedIds = ref<string[]>([])

const activeTab = ref<Tab>('progress')
const selectedMetric = ref<Metric>('weightKg')
const selectedDays = ref(90)
const selectedExerciseId = ref('')
const exerciseSearch = ref('')

const leaderboard = ref<LeaderboardResponse | null>(null)
const leaderboardLoading = ref(false)
const leaderboardError = ref('')

const leaderboardDays = ref<7 | 30>(7)
const leaderboardMetric = ref<LeaderboardMetric>('workoutCount')

const showGroupActionModal = ref(false)
const groupActionLoading = ref(false)
const groupActionError = ref('')

const currentUserId = ref<string | null>(null)

const isGroupOwner = computed(() =>
  !!group.value &&
  !!currentUserId.value &&
  (group.value.ownerId === currentUserId.value ||
    group.value.members.some(
      member =>
        member.role === 'OWNER' && member.user.id === currentUserId.value,
    )),
)

const memberColors = [
  '#C9F36A',
  '#60A5FA',
  '#FB923C',
  '#C084FC',
  '#F472B6',
  '#2DD4BF',
  '#FACC15',
  '#F87171',
]

const metricOptions: {
  value: Metric
  label: string
  unit: string
}[] = [
  { value: 'weightKg', label: 'Poids', unit: 'kg' },
  { value: 'muscleMassKg', label: 'Muscle', unit: 'kg' },
  { value: 'bodyFatPct', label: 'Masse grasse', unit: '%' },
]

const metricUnit = computed(
  () => metricOptions.find(m => m.value === selectedMetric.value)?.unit ?? 'kg',
)

const totalWorkouts = computed(() =>
  stats.value?.members.reduce(
    (sum, member) => sum + member.training.workoutCount,
    0,
  ) ?? 0,
)

const totalVolume = computed(() =>
  stats.value?.members.reduce(
    (sum, member) => sum + member.training.totalVolumeKg,
    0,
  ) ?? 0,
)

const availableFriends = computed(() => {
  const memberIds = new Set(group.value?.members.map(m => m.user.id) ?? [])
  return friends.value.filter(f => !memberIds.has(f.user.id))
})

const filteredExercises = computed(() => {
  const query = exerciseSearch.value.trim().toLocaleLowerCase('fr')
  const all = records.value?.exercises ?? []

  return query
    ? all.filter(e => e.exerciseName.toLocaleLowerCase('fr').includes(query))
    : all
})

const selectedExercise = computed(() =>
  records.value?.exercises.find(
    e => e.exerciseId === selectedExerciseId.value,
  ) ?? null,
)

const selectedLeaderboard = computed(
  () => selectedExercise.value?.leaderboard ?? [],
)

const maxRecord = computed(() =>
  Math.max(
    1,
    ...selectedLeaderboard.value.map(r => r.estimatedOneRepMaxKg),
  ),
)

const chartSeries = computed(() => {
  const cutoff = Date.now() - selectedDays.value * 86400000

  return (stats.value?.members ?? [])
    .map((member, index) => ({
      user: member.user,
      color: memberColors[index % memberColors.length]!,
      points: member.body.history
        .filter(point => {
          const date = new Date(point.date).getTime()
          return Number.isFinite(date) && date >= cutoff
        })
        .map(point => ({
          date: new Date(point.date).getTime(),
          value: point[selectedMetric.value],
        }))
        .filter(
          (point): point is { date: number; value: number } =>
            point.value !== null &&
            Number.isFinite(point.value),
        )
        .sort((a, b) => a.date - b.date),
    }))
    .filter(series => series.points.length > 0)
})

const chartBounds = computed(() => {
  const values = chartSeries.value.flatMap(series =>
    series.points.map(point => point.value),
  )

  if (!values.length) {
    return { min: 0, max: 100 }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.12, 0.5)

  return {
    min: min - padding,
    max: max + padding,
  }
})

const chartStart = computed(() => {
  const dates = chartSeries.value.flatMap(series =>
    series.points.map(point => point.date),
  )

  return dates.length ? Math.min(...dates) : Date.now()
})

const chartEnd = computed(() => {
  const dates = chartSeries.value.flatMap(series =>
    series.points.map(point => point.date),
  )

  return dates.length ? Math.max(...dates) : Date.now()
})

const chartTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) =>
    chartBounds.value.max -
    (index / 4) * (chartBounds.value.max - chartBounds.value.min),
  ),
)

const rankedMembers = computed(() => {
  const entries = leaderboard.value?.leaderboard ?? []

  return [...entries].sort((a, b) =>
    b[leaderboardMetric.value] - a[leaderboardMetric.value] ||
    a.user.username.localeCompare(b.user.username),
  )
})

const maxLeaderboardValue = computed(() =>
  Math.max(
    1,
    ...rankedMembers.value.map(
      member => member[leaderboardMetric.value],
    ),
  ),
)

function chartX(date: number): number {
  const range = chartEnd.value - chartStart.value
  return range === 0 ? 350 : 48 + ((date - chartStart.value) / range) * 604
}

function chartY(value: number): number {
  const { min, max } = chartBounds.value
  return 22 + ((max - value) / (max - min)) * 228
}

function chartPath(points: { date: number; value: number }[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${chartX(point.date).toFixed(2)} ${chartY(point.value).toFixed(2)}`,
    )
    .join(' ')
}

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
  }).format(value)
}

function formatDate(value: string | number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function displayName(user: PublicUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.username
}

function initials(user: PublicUser): string {
  return displayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

function memberColor(userId: string): string {
  const index = stats.value?.members.findIndex(
    member => member.user.id === userId,
  ) ?? -1

  return memberColors[Math.max(0, index) % memberColors.length]!
}

function errorText(error: unknown, fallback: string): string {
  const err = error as { data?: { error?: string } }
  return err.data?.error || fallback
}

function leaderboardValue(member: LeaderboardEntry): string {
  if (leaderboardMetric.value === 'workoutCount') {
    return `${member.workoutCount} séance${member.workoutCount > 1 ? 's' : ''}`
  }

  if (leaderboardMetric.value === 'totalVolumeKg') {
    return `${formatNumber(member.totalVolumeKg / 1000)} t`
  }

  return `${member.totalDurationMinutes} min`
}

async function loadGroup() {
  const response = await $fetch<{ group: Group }>(
    `${apiBase}/groups/${route.params.id}`,
    { credentials: 'include' },
  )
  group.value = response.group
}

async function loadStats() {
  statsError.value = ''

  try {
    stats.value = await $fetch<GroupStatsResponse>(
      `${apiBase}/groups/${route.params.id}/stats`,
      { credentials: 'include' },
    )
  } catch (error) {
    statsError.value = errorText(
      error,
      'Impossible de charger les statistiques.',
    )
  }
}

async function loadRecords() {
  recordsError.value = ''

  try {
    records.value = await $fetch<RecordsResponse>(
      `${apiBase}/groups/${route.params.id}/records`,
      { credentials: 'include' },
    )
  } catch (error) {
    recordsError.value = errorText(
      error,
      'Impossible de charger les records.',
    )
  }
}

async function loadFriends() {
  try {
    const response = await $fetch<{ friends: FriendEntry[] }>(
      `${apiBase}/friends`,
      { credentials: 'include' },
    )
    friends.value = response.friends
  } catch {
    // Les statistiques restent accessibles si la liste d'amis échoue.
  }
}

async function loadAll() {
  loading.value = true
  errorMessage.value = ''

  try {
    await loadGroup()
    await Promise.all([
        loadStats(),
        loadRecords(),
        loadFriends(),
        loadLeaderboard(),
        loadCurrentUser(),
    ])
  } catch (error) {
    errorMessage.value = errorText(
      error,
      'Groupe introuvable ou accès non autorisé.',
    )
    group.value = null
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  if (refreshing.value) return
  refreshing.value = true

  try {
    await Promise.all([
        loadGroup(),
        loadStats(),
        loadRecords(),
        loadLeaderboard(),
    ])
  } catch (error) {
    errorMessage.value = errorText(
      error,
      'Impossible de rafraîchir le groupe.',
    )
  } finally {
    refreshing.value = false
  }
}

async function inviteFriend(userId: string) {
  if (!group.value || invitingId.value) return

  invitingId.value = userId
  inviteMessage.value = ''

  try {
    await $fetch(
      `${apiBase}/groups/${group.value.id}/invitations`,
      {
        method: 'POST',
        credentials: 'include',
        body: { receiverId: userId },
      },
    )

    invitedIds.value = [...invitedIds.value, userId]
    inviteMessage.value = 'Invitation envoyée !'
  } catch (error) {
    inviteMessage.value = errorText(
      error,
      "Impossible d'envoyer l'invitation.",
    )
  } finally {
    invitingId.value = null
  }
}

async function loadLeaderboard() {
  leaderboardLoading.value = true
  leaderboardError.value = ''

  try {
    leaderboard.value = await $fetch<LeaderboardResponse>(
      `${apiBase}/groups/${route.params.id}/leaderboard`,
      {
        credentials: 'include',
        query: {
          days: leaderboardDays.value,
        },
      },
    )
  } catch (error) {
    leaderboardError.value = errorText(
      error,
      'Impossible de charger le classement.',
    )
  } finally {
    leaderboardLoading.value = false
  }
}

async function loadCurrentUser() {
  try {
    // À adapter si ton endpoint de session est différent.
    const response = await $fetch<{
      user: { id: string }
    }>(`${apiBase}/auth/me`, {
      credentials: 'include',
    })

    currentUserId.value = response.user.id
  } catch {
    currentUserId.value = null
  }
}

async function performGroupAction() {
  if (!group.value || groupActionLoading.value || !currentUserId.value) {
    return
  }

  groupActionLoading.value = true
  groupActionError.value = ''

  try {
    const endpoint = isGroupOwner.value
      ? `${apiBase}/groups/${group.value.id}`
      : `${apiBase}/groups/${group.value.id}/leave`

    await $fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include',
    })

    showGroupActionModal.value = false

    await navigateTo('/groups')
  } catch (error) {
    groupActionError.value = errorText(
      error,
      isGroupOwner.value
        ? 'Impossible de supprimer le groupe.'
        : 'Impossible de quitter le groupe.',
    )
  } finally {
    groupActionLoading.value = false
  }
}

watch(filteredExercises, exercises => {
  if (!exercises.some(e => e.exerciseId === selectedExerciseId.value)) {
    selectedExerciseId.value = exercises[0]?.exerciseId ?? ''
  }
}, { immediate: true })

watch(
  () => route.params.id,
  () => {
    group.value = null
    stats.value = null
    records.value = null
    leaderboard.value = null
    invitedIds.value = []
    void loadAll()
  },
)

watch(leaderboardDays, () => {
  void loadLeaderboard()
})

onMounted(() => {
  void loadAll()
})
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8 pb-28 text-white">
    <NuxtLink
      to="/groups"
      class="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft :size="18" />
      Retour aux groupes
    </NuxtLink>

    <p v-if="loading" class="text-slate-400">
      Chargement du groupe...
    </p>

    <p v-else-if="errorMessage && !group" role="alert" class="text-red-400">
      {{ errorMessage }}
    </p>

    <template v-else-if="group">
      <header class="mb-7">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-sm font-semibold tracking-wide text-[#C9F36A]">
            SPOT SOCIAL / GROUPE PRIVÉ
          </p>

          <button
            type="button"
            :disabled="refreshing"
            aria-label="Actualiser les statistiques"
            class="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:text-white disabled:opacity-50"
            @click="refreshAll"
          >
            <RefreshCw :size="18" :class="{ 'animate-spin': refreshing }" />
          </button>
        </div>

        <h1 class="text-3xl font-bold">{{ group.name }}</h1>

        <p class="mt-2 text-sm text-slate-400">
          {{ group.description || 'Progressez ensemble sur Spot.' }}
        </p>
        
        <div v-if="currentUserId" class="mt-5">
            <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
                :class="
                isGroupOwner
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border-white/10 bg-[#19232F] text-slate-300 hover:border-red-500/30 hover:text-red-400'
                "
                @click="groupActionError = ''; showGroupActionModal = true"
            >
                <Trash2 v-if="isGroupOwner" :size="17" />
                <LogOut v-else :size="17" />

                {{ isGroupOwner ? 'Supprimer le groupe' : 'Quitter le groupe' }}
            </button>
        </div>
      </header>

      <!-- Résumé -->
      <div class="mb-7 grid grid-cols-3 gap-3">
        <div class="rounded-2xl border border-white/10 bg-[#19232F] p-3 sm:p-5">
          <Users class="mb-3 text-[#C9F36A]" :size="22" />
          <p class="text-2xl font-bold">{{ group.members.length }}</p>
          <p class="text-xs text-slate-400 sm:text-sm">Membres</p>
        </div>

        <div class="rounded-2xl border border-white/10 bg-[#19232F] p-3 sm:p-5">
          <ChartNoAxesColumn class="mb-3 text-[#C9F36A]" :size="22" />
          <p class="text-2xl font-bold">{{ totalWorkouts }}</p>
          <p class="text-xs text-slate-400 sm:text-sm">Séances / an</p>
        </div>

        <div class="rounded-2xl border border-white/10 bg-[#19232F] p-3 sm:p-5">
          <Trophy class="mb-3 text-[#C9F36A]" :size="22" />
          <p class="text-2xl font-bold">
            {{ records?.exercises.length ?? 0 }}
          </p>
          <p class="text-xs text-slate-400 sm:text-sm">Exercices avec PR</p>
        </div>
      </div>

      <!-- Onglets -->
      <div class="mb-6 flex gap-2 rounded-2xl border border-white/10 bg-[#19232F] p-1.5">
        <button
          v-for="tab in [
            { id: 'progress', label: 'Progression' },
            { id: 'records', label: 'Records' },
            { id: 'members', label: 'Membres' },
            { id: 'leaderboard', label: 'Classement' },
          ]"
          :key="tab.id"
          type="button"
          class="min-w-0 flex-1 rounded-xl px-2 py-3 text-xs font-semibold transition sm:text-sm"
          :class="
            activeTab === tab.id
              ? 'bg-[#C9F36A] text-[#19232F]'
              : 'text-slate-400 hover:text-white'
          "
          @click="activeTab = tab.id as Tab"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- PROGRESSION -->
      <div v-if="activeTab === 'progress'" class="space-y-6">
        <p v-if="statsError" role="alert" class="text-sm text-red-400">
          {{ statsError }}
        </p>

        <template v-if="stats">
          <!-- Graphique -->
          <section class="rounded-2xl border border-white/10 bg-[#19232F] p-4 sm:p-6">
            <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Évolution corporelle</h2>
                <p class="mt-1 text-xs text-slate-400">
                  Comparaison des membres ayant des mesures
                </p>
              </div>

              <select
                v-model="selectedDays"
                aria-label="Période"
                class="rounded-xl border border-white/10 bg-[#111923] px-3 py-2 text-sm outline-none focus:border-[#C9F36A]"
              >
                <option :value="30">30 jours</option>
                <option :value="90">90 jours</option>
                <option :value="180">180 jours</option>
                <option :value="365">1 an</option>
              </select>
            </div>

            <div class="mb-5 flex flex-wrap gap-2">
              <button
                v-for="metric in metricOptions"
                :key="metric.value"
                type="button"
                class="rounded-lg px-3 py-2 text-xs font-semibold transition"
                :class="
                  selectedMetric === metric.value
                    ? 'bg-[#C9F36A] text-[#19232F]'
                    : 'bg-[#111923] text-slate-400 hover:text-white'
                "
                @click="selectedMetric = metric.value"
              >
                {{ metric.label }}
              </button>
            </div>

            <div v-if="chartSeries.length === 0" class="py-14 text-center">
              <Scale :size="36" class="mx-auto mb-3 text-slate-500" />
              <p class="font-medium">Aucune mesure sur cette période</p>
              <p class="mt-2 text-sm text-slate-400">
                Les membres doivent enregistrer leurs mesures dans Spot.
              </p>
            </div>

            <template v-else>
              <div class="overflow-x-auto">
                <svg
                  viewBox="0 0 700 300"
                  role="img"
                  :aria-label="`Graphique de ${metricOptions.find(m => m.value === selectedMetric)?.label} sur ${selectedDays} jours`"
                  class="min-w-[340px] w-full"
                >
                  <g v-for="(tick, index) in chartTicks" :key="index">
                    <line
                      x1="48"
                      x2="652"
                      :y1="22 + index * 57"
                      :y2="22 + index * 57"
                      stroke="#334155"
                      stroke-dasharray="4 6"
                    />
                    <text
                      x="40"
                      :y="26 + index * 57"
                      fill="#94A3B8"
                      font-size="12"
                      text-anchor="end"
                    >
                      {{ formatNumber(tick) }}
                    </text>
                  </g>

                  <path
                    v-for="series in chartSeries"
                    :key="series.user.id"
                    :d="chartPath(series.points)"
                    fill="none"
                    :stroke="series.color"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  <g
                    v-for="series in chartSeries"
                    :key="`${series.user.id}-points`"
                  >
                    <circle
                      v-for="(point, index) in series.points"
                      :key="index"
                      :cx="chartX(point.date)"
                      :cy="chartY(point.value)"
                      r="3.5"
                      :fill="series.color"
                    >
                      <title>
                        {{ series.user.username }} :
                        {{ formatNumber(point.value) }} {{ metricUnit }}
                        — {{ formatDate(point.date) }}
                      </title>
                    </circle>
                  </g>

                  <text x="48" y="285" fill="#94A3B8" font-size="12">
                    {{ formatDate(chartStart) }}
                  </text>
                  <text
                    x="652"
                    y="285"
                    fill="#94A3B8"
                    font-size="12"
                    text-anchor="end"
                  >
                    {{ formatDate(chartEnd) }}
                  </text>
                </svg>
              </div>

              <div class="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                <div
                  v-for="series in chartSeries"
                  :key="series.user.id"
                  class="flex items-center gap-2 text-xs text-slate-300"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: series.color }"
                  />
                  @{{ series.user.username }}
                </div>
              </div>
            </template>
          </section>

          <!-- Statistiques de chaque membre -->
          <section>
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">Statistiques des membres</h2>
              <span class="text-xs text-slate-400">
                {{ stats.periodDays }} derniers jours
              </span>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <article
                v-for="(member, index) in stats.members"
                :key="member.user.id"
                class="rounded-2xl border border-white/10 bg-[#19232F] p-5"
              >
                <div class="mb-5 flex items-center gap-3">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-[#111923]"
                    :style="{
                      backgroundColor:
                        memberColors[index % memberColors.length],
                    }"
                  >
                    {{ initials(member.user) }}
                  </div>

                  <div class="min-w-0">
                    <p class="truncate font-semibold">
                      {{ displayName(member.user) }}
                    </p>
                    <p class="truncate text-xs text-slate-400">
                      @{{ member.user.username }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-xl bg-[#111923] p-3">
                    <p class="mb-1 text-xs text-slate-400">Poids actuel</p>
                    <p class="text-xl font-bold">
                      {{
                        member.body.latestWeightKg === null
                          ? '—'
                          : `${formatNumber(member.body.latestWeightKg)} kg`
                      }}
                    </p>
                  </div>

                  <div class="rounded-xl bg-[#111923] p-3">
                    <p class="mb-1 text-xs text-slate-400">Évolution du poids</p>
                    <p class="text-xl font-bold">
                      {{
                        member.body.weightChangeKg === null
                          ? '—'
                          : `${member.body.weightChangeKg > 0 ? '+' : ''}${formatNumber(member.body.weightChangeKg)} kg`
                      }}
                    </p>
                  </div>

                  <div class="rounded-xl bg-[#111923] p-3">
                    <p class="mb-1 text-xs text-slate-400">Masse musculaire</p>
                    <p class="text-lg font-bold">
                      {{
                        member.body.latestMuscleMassKg === null
                          ? '—'
                          : `${formatNumber(member.body.latestMuscleMassKg)} kg`
                      }}
                    </p>
                  </div>

                  <div class="rounded-xl bg-[#111923] p-3">
                    <p class="mb-1 text-xs text-slate-400">Masse grasse</p>
                    <p class="text-lg font-bold">
                      {{
                        member.body.latestBodyFatPct === null
                          ? '—'
                          : `${formatNumber(member.body.latestBodyFatPct)} %`
                      }}
                    </p>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <p class="text-2xl font-bold text-[#C9F36A]">
                      {{ member.training.workoutCount }}
                    </p>
                    <p class="text-xs text-slate-400">Séances terminées</p>
                  </div>

                  <div>
                    <p class="text-2xl font-bold text-[#C9F36A]">
                      {{ formatNumber(member.training.totalVolumeKg / 1000) }} t
                    </p>
                    <p class="text-xs text-slate-400">Volume soulevé</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <p class="text-xs leading-relaxed text-slate-500">
            Les mesures corporelles sont déclarées par les utilisateurs.
            Le volume correspond à la somme des charges multipliées par les répétitions.
            Les statistiques d'entraînement couvrent les 365 derniers jours.
          </p>
        </template>
      </div>

      <!-- RECORDS -->
      <div v-else-if="activeTab === 'records'" class="space-y-5">
        <p v-if="recordsError" role="alert" class="text-sm text-red-400">
          {{ recordsError }}
        </p>

        <template v-if="records">
          <section class="rounded-2xl border border-white/10 bg-[#19232F] p-5">
            <div class="mb-4 flex items-center gap-3">
              <Trophy :size="23" class="text-[#C9F36A]" />
              <div>
                <h2 class="text-lg font-semibold">Classement des records</h2>
                <p class="text-xs text-slate-400">
                  Compare les performances par exercice
                </p>
              </div>
            </div>

            <template v-if="records.exercises.length">
              <label
                for="exercise-search"
                class="mb-2 block text-sm text-slate-400"
              >
                Rechercher un exercice
              </label>

              <input
                id="exercise-search"
                v-model="exerciseSearch"
                type="search"
                placeholder="Ex : développé couché"
                class="mb-4 w-full rounded-xl border border-white/10 bg-[#111923] px-4 py-3 text-sm outline-none focus:border-[#C9F36A]"
              >

              <label
                for="exercise-select"
                class="mb-2 block text-sm text-slate-400"
              >
                Exercice
              </label>

              <select
                id="exercise-select"
                v-model="selectedExerciseId"
                class="w-full rounded-xl border border-white/10 bg-[#111923] px-4 py-3 text-sm outline-none focus:border-[#C9F36A]"
              >
                <option
                  v-for="exercise in filteredExercises"
                  :key="exercise.exerciseId"
                  :value="exercise.exerciseId"
                >
                  {{ exercise.exerciseName }}
                </option>
              </select>

              <p
                v-if="filteredExercises.length === 0"
                class="mt-3 text-sm text-slate-400"
              >
                Aucun exercice ne correspond à ta recherche.
              </p>
            </template>

            <p v-else class="py-8 text-center text-sm text-slate-400">
              Aucun record disponible. Termine une séance avec des séries
              enregistrées pour apparaître dans le classement.
            </p>
          </section>

          <section
            v-if="selectedExercise"
            class="rounded-2xl border border-white/10 bg-[#19232F] p-5"
          >
            <h3 class="mb-1 text-lg font-semibold">
              {{ selectedExercise.exerciseName }}
            </h3>
            <p class="mb-6 text-xs text-slate-400">
              Classement par 1RM estimé
            </p>

            <div
              v-for="(record, index) in selectedLeaderboard"
              :key="record.userId"
              class="border-b border-white/10 py-4 first:pt-0 last:border-0 last:pb-0"
            >
              <div class="mb-3 flex items-center gap-3">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  :class="
                    index === 0
                      ? 'bg-[#C9F36A] text-[#19232F]'
                      : 'bg-[#111923] text-slate-300'
                  "
                >
                  {{ index + 1 }}
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold">
                    @{{ record.username }}
                  </p>
                  <p class="text-xs text-slate-400">
                    {{ formatNumber(record.weightKg) }} kg ×
                    {{ record.reps }} reps
                    <span v-if="record.performedAt">
                      · {{ formatDate(record.performedAt) }}
                    </span>
                  </p>
                </div>

                <div class="text-right">
                  <p class="text-xl font-bold text-[#C9F36A]">
                    {{ formatNumber(record.estimatedOneRepMaxKg) }}
                  </p>
                  <p class="text-xs text-slate-400">kg estimés</p>
                </div>
              </div>

              <div class="h-2 overflow-hidden rounded-full bg-[#111923]">
                <div
                  class="h-full rounded-full bg-[#C9F36A] transition-all"
                  :style="{
                    width: `${(record.estimatedOneRepMaxKg / maxRecord) * 100}%`,
                  }"
                />
              </div>
            </div>
          </section>

          <p class="text-xs leading-relaxed text-slate-500">
            Le 1RM est estimé à partir des séries enregistrées selon
            la formule d'Epley. Il ne représente pas nécessairement
            une charge réellement soulevée sur une répétition.
            Les exercices différents ne sont pas fusionnés.
          </p>
        </template>
      </div>

      
        <!-- CLASSEMENT -->
        <div
        v-else-if="activeTab === 'leaderboard'"
        class="space-y-5"
        >
        <section
            class="rounded-2xl border border-white/10 bg-[#19232F] p-5 sm:p-6"
        >
            <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
                <div class="mb-2 flex items-center gap-2">
                <Trophy :size="23" class="text-[#C9F36A]" />
                <h2 class="text-xl font-bold">Classement du groupe</h2>
                </div>

                <p class="text-sm text-slate-400">
                Compare tes performances avec celles de tes amis.
                </p>
            </div>

            <div class="flex rounded-xl bg-[#111923] p-1">
                <button
                v-for="days in [7, 30] as const"
                :key="days"
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-semibold transition"
                :class="
                    leaderboardDays === days
                    ? 'bg-[#C9F36A] text-[#19232F]'
                    : 'text-slate-400 hover:text-white'
                "
                @click="leaderboardDays = days"
                >
                {{ days }} jours
                </button>
            </div>
            </div>

            <div class="mb-6 grid grid-cols-3 gap-2">
            <button
                v-for="metric in [
                { id: 'workoutCount', label: 'Séances' },
                { id: 'totalVolumeKg', label: 'Volume' },
                { id: 'totalDurationMinutes', label: 'Durée' },
                ]"
                :key="metric.id"
                type="button"
                class="rounded-xl border px-2 py-3 text-xs font-semibold transition sm:text-sm"
                :class="
                leaderboardMetric === metric.id
                    ? 'border-[#C9F36A] bg-[#C9F36A]/10 text-[#C9F36A]'
                    : 'border-white/10 bg-[#111923] text-slate-400 hover:text-white'
                "
                @click="leaderboardMetric = metric.id as LeaderboardMetric"
            >
                {{ metric.label }}
            </button>
            </div>

            <p
            v-if="leaderboardLoading"
            class="py-8 text-center text-sm text-slate-400"
            >
            Chargement du classement...
            </p>

            <p
            v-else-if="leaderboardError"
            role="alert"
            class="py-6 text-sm text-red-400"
            >
            {{ leaderboardError }}
            </p>

            <p
            v-else-if="rankedMembers.length === 0"
            class="py-8 text-center text-sm text-slate-400"
            >
            Aucun membre à afficher.
            </p>

            <div v-else class="space-y-3">
            <div
                v-for="(member, index) in rankedMembers"
                :key="member.user.id"
                class="rounded-xl border border-white/10 bg-[#111923] p-4"
            >
                <div class="mb-3 flex items-center gap-3">
                <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold"
                    :class="
                    index === 0
                        ? 'bg-[#C9F36A] text-[#19232F]'
                        : 'bg-[#253241] text-white'
                    "
                >
                    {{ index + 1 }}
                </div>

                <div class="min-w-0 flex-1">
                    <p class="truncate font-semibold">
                    {{ displayName(member.user) }}
                    </p>
                    <p class="truncate text-xs text-slate-400">
                    @{{ member.user.username }}
                    </p>
                </div>

                <div class="text-right">
                    <p class="font-bold text-[#C9F36A]">
                    {{ leaderboardValue(member) }}
                    </p>
                </div>
                </div>

                <div class="h-2 overflow-hidden rounded-full bg-[#253241]">
                <div
                    class="h-full rounded-full bg-[#C9F36A] transition-all"
                    :style="{
                    width: `${
                        member[leaderboardMetric] /
                        maxLeaderboardValue * 100
                    }%`,
                    }"
                />
                </div>
            </div>
            </div>
        </section>

        <p class="text-xs leading-relaxed text-slate-500">
            Les classements prennent en compte les séances terminées
            sur les {{ leaderboardDays }} derniers jours.
            Le volume correspond au poids multiplié par les répétitions
            des séries validées.
        </p>
        </div>


      <!-- MEMBRES -->
      <div v-else-if="activeTab === 'members'" class="space-y-5">
        <section class="rounded-2xl border border-white/10 bg-[#19232F] p-5">
          <h2 class="mb-5 text-lg font-semibold">
            Membres du groupe
          </h2>

          <div
            v-for="member in group.members"
            :key="member.id"
            class="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-0"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111923] font-semibold text-[#C9F36A]">
                {{ initials(member.user) }}
              </div>

              <div class="min-w-0">
                <p class="truncate font-medium">
                  {{ displayName(member.user) }}
                </p>
                <p class="truncate text-sm text-slate-400">
                  @{{ member.user.username }}
                </p>
              </div>
            </div>

            <span
              v-if="member.role === 'OWNER'"
              class="shrink-0 rounded-full bg-[#C9F36A]/10 px-3 py-1 text-xs font-semibold text-[#C9F36A]"
            >
              Créateur
            </span>
          </div>
        </section>

        <section
          v-if="isGroupOwner"
        >
          <div class="mb-4 flex items-center gap-2">
            <UserRoundPlus :size="21" class="text-[#C9F36A]" />
            <h2 class="text-lg font-semibold">Inviter un ami</h2>
          </div>

          <p
            v-if="inviteMessage"
            role="status"
            class="mb-4 text-sm text-[#C9F36A]"
          >
            {{ inviteMessage }}
          </p>

          <p
            v-if="availableFriends.length === 0"
            class="text-sm text-slate-400"
          >
            Aucun ami disponible à inviter.
          </p>

          <div
            v-for="friend in availableFriends"
            :key="friend.friendshipId"
            class="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-0"
          >
            <div class="min-w-0">
              <p class="truncate font-medium">
                {{ displayName(friend.user) }}
              </p>
              <p class="truncate text-sm text-slate-400">
                @{{ friend.user.username }}
              </p>
            </div>

            <button
              type="button"
              :disabled="invitingId !== null || invitedIds.includes(friend.user.id)"
              class="shrink-0 rounded-xl bg-[#C9F36A] px-4 py-2 text-sm font-semibold text-[#19232F] disabled:opacity-50"
              @click="inviteFriend(friend.user.id)"
            >
              {{
                invitingId === friend.user.id
                  ? 'Envoi...'
                  : invitedIds.includes(friend.user.id)
                    ? 'Invité'
                    : 'Inviter'
              }}
            </button>
          </div>
        </section>
      </div>
    </template>
    
    <!-- Confirmation : quitter ou supprimer le groupe -->
    <div
    v-if="showGroupActionModal && group"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    @click.self="!groupActionLoading && (showGroupActionModal = false)"
    >
    <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-action-title"
        class="w-full max-w-md rounded-2xl border border-white/10 bg-[#19232F] p-6 shadow-2xl"
    >
        <div class="mb-5 flex items-start justify-between gap-3">
        <div class="rounded-xl bg-red-500/10 p-3">
            <AlertTriangle :size="24" class="text-red-400" />
        </div>

        <button
            type="button"
            aria-label="Fermer"
            :disabled="groupActionLoading"
            class="text-slate-400 hover:text-white disabled:opacity-50"
            @click="showGroupActionModal = false"
        >
            <X :size="22" />
        </button>
        </div>

        <h2 id="group-action-title" class="text-xl font-bold">
        {{
            isGroupOwner
            ? 'Supprimer définitivement le groupe ?'
            : 'Quitter ce groupe ?'
        }}
        </h2>

        <p class="mt-3 text-sm leading-relaxed text-slate-400">
        <template v-if="isGroupOwner">
            Le groupe <strong class="text-white">{{ group.name }}</strong>
            sera définitivement supprimé. Tous ses membres perdront
            l'accès au groupe et ses invitations seront annulées.
        </template>

        <template v-else>
            Tu vas quitter
            <strong class="text-white">{{ group.name }}</strong>.
            Tu ne pourras plus consulter ses statistiques ni ses classements.
            Tu devras être réinvité pour le rejoindre.
        </template>
        </p>

        <p class="mt-3 text-xs text-slate-500">
        Tes séances, tes pesées et tes records personnels
        ne seront pas supprimés.
        </p>

        <p
        v-if="groupActionError"
        role="alert"
        class="mt-4 text-sm text-red-400"
        >
        {{ groupActionError }}
        </p>

        <div class="mt-7 flex gap-3">
        <button
            type="button"
            :disabled="groupActionLoading"
            class="flex-1 rounded-xl border border-white/10 px-4 py-3 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
            @click="showGroupActionModal = false"
        >
            Annuler
        </button>

        <button
            type="button"
            :disabled="groupActionLoading"
            class="flex-1 rounded-xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            @click="performGroupAction"
        >
            {{
            groupActionLoading
                ? 'Patiente...'
                : isGroupOwner
                ? 'Supprimer'
                : 'Quitter'
            }}
        </button>
        </div>
    </div>
    </div>

  </main>
</template>
