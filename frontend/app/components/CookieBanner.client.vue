
<script setup lang="ts">
type Consent = {
  analytics: boolean
  savedAt: number
}

const STORAGE_KEY = 'spot-cookie-consent'
const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000

const visible = ref(false)

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Consent

    if (
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > SIX_MONTHS
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function saveConsent(analytics: boolean) {
  const consent: Consent = {
    analytics,
    savedAt: Date.now(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  visible.value = false

  window.dispatchEvent(
    new CustomEvent('spot:cookie-consent', { detail: consent }),
  )
}

function openPreferences() {
  visible.value = true
}

onMounted(() => {
  visible.value = !readConsent()
  window.addEventListener('spot:open-cookie-preferences', openPreferences)
})

onBeforeUnmount(() => {
  window.removeEventListener('spot:open-cookie-preferences', openPreferences)
})
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#141D29] p-5 text-white shadow-2xl sm:p-6"
    role="region"
    aria-label="Préférences de cookies"
  >
    <div class="mb-3 flex items-center gap-3">
      <span class="text-2xl" aria-hidden="true">🍪</span>
      <h2 class="text-lg font-bold">Vos préférences de cookies</h2>
    </div>

    <p class="mb-5 text-sm leading-6 text-slate-300">
      Spot utilise des cookies nécessaires à son fonctionnement.
      Avec votre accord, nous pourrons également utiliser des
      traceurs de mesure d'audience non essentiels.
      Vous pourrez modifier votre choix à tout moment.
      <NuxtLink to="/cookies" class="text-lime-300 underline">
        En savoir plus
      </NuxtLink>
    </p>

    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
        @click="saveConsent(false)"
      >
        Tout refuser
      </button>

      <button
        type="button"
        class="rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-[#0B1018] transition hover:bg-lime-200"
        @click="saveConsent(true)"
      >
        Tout accepter
      </button>
    </div>
  </div>
</template>
