
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Users,
  Scale,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-vue-next'

type PrivacyResponse = {
  shareBodyStatsWithGroups: boolean
}

type ProfileResponse = {
  user: {
    profile: {
      shareBodyStatsWithGroups: boolean
    } | null
  }
}

const apiBase = String(
  useRuntimeConfig().public.apiBase || '/api',
).replace(/\/$/, '')

const loading = ref(true)
const saving = ref(false)
const shareBodyStats = ref(false)
const originalValue = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function loadPrivacy() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await $fetch<ProfileResponse>(
      `${apiBase}/profile`,
      { credentials: 'include' },
    )

    const enabled =
      response.user.profile?.shareBodyStatsWithGroups ?? false

    shareBodyStats.value = enabled
    originalValue.value = enabled
  } catch (error) {
    const err = error as {
      data?: { error?: string }
    }

    errorMessage.value =
      err.data?.error || 'Impossible de charger les paramètres.'
  } finally {
    loading.value = false
  }
}

async function savePrivacy() {
  if (saving.value || loading.value) return

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch<PrivacyResponse>(
      `${apiBase}/profile/privacy`,
      {
        method: 'PATCH',
        credentials: 'include',
        body: {
          shareBodyStatsWithGroups: shareBodyStats.value,
        },
      },
    )

    originalValue.value = shareBodyStats.value
    successMessage.value = 'Préférences enregistrées.'
  } catch (error) {
    const err = error as {
      data?: { error?: string }
    }

    errorMessage.value =
      err.data?.error || 'Impossible d’enregistrer les préférences.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadPrivacy()
})
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8 pb-28 text-white">
    <NuxtLink
      to="/profile"
      class="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft :size="18" />
      Retour au profil
    </NuxtLink>

    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-semibold text-[#C9F36A]">
          SPOT / PARAMÈTRES
        </p>

        <h1 class="text-3xl font-bold">
          Confidentialité
        </h1>

        <p class="mt-3 text-sm leading-relaxed text-slate-400">
          Contrôle les informations que tu souhaites
          partager avec les autres membres de Spot.
        </p>
      </div>

      <div class="rounded-2xl bg-[#C9F36A]/10 p-3">
        <ShieldCheck :size="28" class="text-[#C9F36A]" />
      </div>
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#19232F] p-6 text-slate-400"
    >
      <RefreshCw :size="20" class="animate-spin" />
      Chargement des préférences...
    </div>

    <template v-else>
      <section class="mb-5 rounded-2xl border border-white/10 bg-[#19232F] p-5 sm:p-6">
        <div class="mb-6 flex items-center gap-3">
          <div class="rounded-xl bg-[#C9F36A]/10 p-3">
            <Users :size="22" class="text-[#C9F36A]" />
          </div>

          <div>
            <h2 class="text-lg font-semibold">
              Partage avec mes groupes
            </h2>
            <p class="text-xs text-slate-400">
              Visibilité des données corporelles
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-[#111923] p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 gap-3">
              <Scale
                :size="21"
                class="mt-0.5 shrink-0 text-[#C9F36A]"
              />

              <div>
                <label
                  for="share-body-stats"
                  class="block cursor-pointer font-semibold"
                >
                  Partager mes données corporelles
                </label>

                <p class="mt-2 text-sm leading-relaxed text-slate-400">
                  Autoriser les membres de mes groupes à
                  consulter mes statistiques corporelles
                  dans les espaces de groupe qui les affichent.
                </p>
              </div>
            </div>

            <input
              id="share-body-stats"
              v-model="shareBodyStats"
              type="checkbox"
              role="switch"
              :aria-checked="shareBodyStats"
              class="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#C9F36A]"
            />
          </div>

          <div class="mt-4 border-t border-white/10 pt-4">
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              :class="shareBodyStats
                ? 'bg-[#C9F36A]/10 text-[#C9F36A]'
                : 'bg-white/5 text-slate-400'"
            >
              <CheckCircle2 v-if="shareBodyStats" :size="14" />
              <LockKeyhole v-else :size="14" />

              {{ shareBodyStats ? 'Partage activé' : 'Données privées' }}
            </span>
          </div>
        </div>
      </section>

      <section class="mb-6 rounded-2xl border border-white/10 bg-[#19232F] p-5">
        <div class="flex items-start gap-3">
          <LockKeyhole
            :size="21"
            class="mt-0.5 shrink-0 text-[#C9F36A]"
          />

          <div>
            <h2 class="font-semibold">
              Tes données, ton choix
            </h2>

            <p class="mt-2 text-sm leading-relaxed text-slate-400">
              Le partage est désactivé par défaut.
              Tu peux modifier ce choix à tout moment.
              Ce réglage concerne uniquement les données
              corporelles partagées dans tes groupes.
            </p>
          </div>
        </div>
      </section>

      <p
        v-if="errorMessage"
        role="alert"
        class="mb-4 flex items-center gap-2 text-sm text-red-400"
      >
        <AlertTriangle :size="17" />
        {{ errorMessage }}
      </p>

      <p
        v-if="successMessage"
        role="status"
        class="mb-4 flex items-center gap-2 text-sm text-[#C9F36A]"
      >
        <CheckCircle2 :size="17" />
        {{ successMessage }}
      </p>

      <button
        type="button"
        :disabled="saving || shareBodyStats === originalValue"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9F36A] px-5 py-4 font-semibold text-[#111923] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        @click="savePrivacy"
      >
        <Save :size="19" />
        {{ saving ? 'Enregistrement...' : 'Enregistrer mes préférences' }}
      </button>
    </template>
  </main>
</template>
