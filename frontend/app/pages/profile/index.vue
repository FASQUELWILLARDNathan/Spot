
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft, Pencil, Save, X, Dumbbell,
  Users, Trophy, ShieldCheck, RefreshCw,
  LogOut
} from 'lucide-vue-next'

type FitnessGoal = 'GAIN_MUSCLE' | 'LOSE_WEIGHT' | 'MAINTAIN'

type ProfileResponse = {
  user: {
    id: string
    username: string
    firstName: string
    lastName: string
    createdAt: string
    profile: {
      bio: string | null
      heightCm: number | null
      startingWeightKg: number | null
      goal: FitnessGoal | null
    } | null
  }
  stats: {
    workoutCount: number
    friendCount: number
    recordCount: number
  }
  records: {
    exerciseId: string
    exerciseName: string
    estimatedOneRepMaxKg: number
  }[]
}

const apiBase = String(useRuntimeConfig().public.apiBase || '/api')
  .replace(/\/$/, '')

const data = ref<ProfileResponse | null>(null)
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const loggingOut = ref(false)

const form = ref({
  bio: '',
  heightCm: '',
  startingWeightKg: '',
  goal: '' as FitnessGoal | '',
})

const fullName = computed(() => {
  const user = data.value?.user
  if (!user) return ''
  return `${user.firstName} ${user.lastName}`.trim() || user.username
})

const initials = computed(() =>
  fullName.value.split(/\s+/).slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '').join(''),
)

const goalLabel = computed(() => {
  switch (data.value?.user.profile?.goal) {
    case 'GAIN_MUSCLE': return 'Prise de muscle'
    case 'LOSE_WEIGHT': return 'Perte de poids'
    case 'MAINTAIN': return 'Maintien'
    default: return 'Objectif non défini'
  }
})

function populateForm() {
  const profile = data.value?.user.profile
  form.value = {
    bio: profile?.bio ?? '',
    heightCm: profile?.heightCm?.toString() ?? '',
    startingWeightKg: profile?.startingWeightKg?.toString() ?? '',
    goal: profile?.goal ?? '',
  }
}

async function loadProfile() {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = await $fetch<ProfileResponse>(`${apiBase}/profile`, {
      credentials: 'include',
    })
    populateForm()
  } catch (error) {
    const err = error as { data?: { error?: string } }
    errorMessage.value = err.data?.error ?? 'Impossible de charger le profil.'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch(`${apiBase}/profile/edit`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        bio: form.value.bio.trim() || null,
        heightCm: form.value.heightCm === ''
          ? null : Number(form.value.heightCm),
        startingWeightKg: form.value.startingWeightKg === ''
          ? null : Number(form.value.startingWeightKg),
        goal: form.value.goal || null,
      },
    })

    editing.value = false
    await loadProfile()
    successMessage.value = 'Profil mis à jour !'
  } catch (error) {
    const err = error as { data?: { error?: string } }
    errorMessage.value = err.data?.error ?? 'Impossible de sauvegarder.'
  } finally {
    saving.value = false
  }
}

async function logout() {
  if (loggingOut.value) return

  loggingOut.value = true
  errorMessage.value = ''

  try {
    await $fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    await navigateTo('/login', { replace: true })
  } catch (error) {
    const err = error as {
      data?: { error?: string }
    }

    errorMessage.value =
      err.data?.error || 'Impossible de se déconnecter.'
  } finally {
    loggingOut.value = false
  }
}

function cancelEdit() {
  populateForm()
  editing.value = false
  errorMessage.value = ''
}

onMounted(() => { void loadProfile() })
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8 pb-28 text-white">
    <NuxtLink to="/" class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
      <ArrowLeft :size="18" />
      Retour
    </NuxtLink>

    <div class="mb-7 flex items-center justify-between gap-3">
      <div>
        <p class="mb-1 text-sm font-semibold text-[#C9F36A]">SPOT / COMPTE</p>
        <h1 class="text-3xl font-bold">Mon profil</h1>
      </div>
      <button type="button" :disabled="loading" aria-label="Actualiser"
        class="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-white disabled:opacity-50"
        @click="loadProfile">
        <RefreshCw :size="19" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <p v-if="loading" class="text-slate-400">Chargement du profil...</p>

    <p v-else-if="errorMessage && !data" role="alert" class="text-red-400">
      {{ errorMessage }}
    </p>

    <template v-else-if="data">
      <section class="mb-5 rounded-2xl border border-white/10 bg-[#19232F] p-6">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#C9F36A] text-2xl font-bold text-[#111923]">
            {{ initials }}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="break-words text-xl font-bold">{{ fullName }}</h2>
            <p class="mt-1 text-sm text-slate-400">@{{ data.user.username }}</p>
            <p class="mt-2 text-xs font-semibold text-[#C9F36A]">{{ goalLabel }}</p>
          </div>
          <button type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-2.5 text-sm font-semibold text-[#19232F]"
            @click="editing = !editing; populateForm()">
            <Pencil :size="16" />
            Modifier
          </button>
        </div>

        <div v-if="!editing" class="mt-6 rounded-xl bg-[#111923] p-4">
          <p class="mb-2 text-xs font-semibold text-slate-400">BIOGRAPHIE</p>
          <p class="whitespace-pre-wrap text-sm">
            {{ data.user.profile?.bio || 'Aucune biographie pour le moment.' }}
          </p>
        </div>

        <form v-else class="mt-6 space-y-4" @submit.prevent="saveProfile">
          <div>
            <label for="profile-bio" class="mb-2 block text-sm text-slate-300">Biographie</label>
            <textarea id="profile-bio" v-model="form.bio" maxlength="160" rows="3"
              class="w-full rounded-xl border border-white/10 bg-[#111923] p-3 outline-none focus:border-[#C9F36A]"
              placeholder="Parle de toi..."></textarea>
            <p class="mt-1 text-right text-xs text-slate-500">{{ form.bio.length }}/160</p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="profile-height" class="mb-2 block text-sm text-slate-300">Taille (cm)</label>
              <input id="profile-height" v-model="form.heightCm" type="number" min="100" max="250"
                class="w-full rounded-xl border border-white/10 bg-[#111923] p-3 outline-none focus:border-[#C9F36A]">
            </div>
            <div>
              <label for="profile-weight" class="mb-2 block text-sm text-slate-300">Poids de départ (kg)</label>
              <input id="profile-weight" v-model="form.startingWeightKg" type="number" min="20" max="400" step="0.1"
                class="w-full rounded-xl border border-white/10 bg-[#111923] p-3 outline-none focus:border-[#C9F36A]">
            </div>
          </div>

          <div>
            <label for="profile-goal" class="mb-2 block text-sm text-slate-300">Objectif sportif</label>
            <select id="profile-goal" v-model="form.goal"
              class="w-full rounded-xl border border-white/10 bg-[#111923] p-3 outline-none focus:border-[#C9F36A]">
              <option value="">Non défini</option>
              <option value="GAIN_MUSCLE">Prise de muscle</option>
              <option value="LOSE_WEIGHT">Perte de poids</option>
              <option value="MAINTAIN">Maintien</option>
            </select>
          </div>

          <p v-if="errorMessage" role="alert" class="text-sm text-red-400">{{ errorMessage }}</p>

          <div class="flex gap-3">
            <button type="button" :disabled="saving"
              class="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm"
              @click="cancelEdit">
              <X :size="16" /> Annuler
            </button>
            <button type="submit" :disabled="saving"
              class="flex items-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-3 text-sm font-semibold text-[#19232F] disabled:opacity-50">
              <Save :size="16" />
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </section>

      <p v-if="successMessage" role="status" class="mb-5 text-sm text-[#C9F36A]">
        {{ successMessage }}
      </p>

      <section class="mb-5 grid grid-cols-3 gap-3">
        <div v-for="stat in [
          { label: 'Séances', value: data.stats.workoutCount, icon: Dumbbell },
          { label: 'Amis', value: data.stats.friendCount, icon: Users },
          { label: 'Records', value: data.stats.recordCount, icon: Trophy },
        ]" :key="stat.label"
          class="rounded-2xl border border-white/10 bg-[#19232F] p-3 sm:p-5">
          <component :is="stat.icon" :size="22" class="mb-3 text-[#C9F36A]" />
          <p class="text-2xl font-bold">{{ stat.value }}</p>
          <p class="text-xs text-slate-400 sm:text-sm">{{ stat.label }}</p>
        </div>
      </section>

      <section class="mb-5 rounded-2xl border border-white/10 bg-[#19232F] p-5">
        <h2 class="mb-5 flex items-center gap-2 text-lg font-semibold">
          <Trophy :size="20" class="text-[#C9F36A]" />
          Mes meilleurs records
        </h2>

        <p v-if="data.records.length === 0" class="text-sm text-slate-400">
          Aucun record disponible. Termine une séance pour enregistrer tes performances.
        </p>

        <div v-for="record in data.records" :key="record.exerciseId"
          class="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-0">
          <span class="text-sm">{{ record.exerciseName }}</span>
          <span class="shrink-0 font-semibold text-[#C9F36A]">
            {{ record.estimatedOneRepMaxKg }} kg
          </span>
        </div>
        <p v-if="data.records.length" class="mt-4 text-xs text-slate-500">
          Records exprimés en 1RM estimé (formule d'Epley).
        </p>
      </section>

      <NuxtLink to="/settings/privacy"
        class="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#19232F] p-5 transition hover:bg-[#253241]">
        <ShieldCheck :size="23" class="text-[#C9F36A]" />
        <div>
          <p class="font-semibold">Confidentialité</p>
          <p class="mt-1 text-xs text-slate-400">
            Gérer le partage de mes données corporelles dans les groupes
          </p>
        </div>
      </NuxtLink>
      <section class="mt-5 rounded-2xl border border-red-500/20 bg-[#19232F] p-5">
        <h2 class="mb-3 text-sm font-semibold text-slate-400">
            Session
        </h2>

        <button
            type="button"
            :disabled="loggingOut"
            class="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            @click="logout"
        >
            <LogOut :size="19" />
            {{ loggingOut ? 'Déconnexion...' : 'Se déconnecter' }}
        </button>
        </section>
    </template>
  </main>
</template>
