
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

type PublicUser = {
  id: string
  username: string
  firstName: string
  lastName: string
}

type FriendEntry = {
  friendshipId: string
  user: PublicUser
}

type FriendsResponse = {
  friends: FriendEntry[]
  incoming: FriendEntry[]
  outgoing: FriendEntry[]
}

type SearchResponse = {
  users: PublicUser[]
}

const config = useRuntimeConfig()

// Adapte cette valeur si ton backend utilise un autre port.
// Exemple : NUXT_PUBLIC_API_BASE=http://localhost:4000
const apiBase = String(config.public.apiBase || 'http://localhost:4000')
  .replace(/\/$/, '')

const search = ref('')
const searchResults = ref<PublicUser[]>([])

const friends = ref<FriendEntry[]>([])
const incoming = ref<FriendEntry[]>([])
const outgoing = ref<FriendEntry[]>([])

const loading = ref(true)
const searching = ref(false)
const actionId = ref<string | null>(null)

const errorMessage = ref('')
const successMessage = ref('')

const activeTab = ref<'friends' | 'requests'>('friends')

let searchRequestId = 0

const friendshipByUserId = computed(() => {
  const entries = [
    ...friends.value.map(entry => ({
      ...entry,
      status: 'ACCEPTED' as const,
    })),
    ...incoming.value.map(entry => ({
      ...entry,
      status: 'INCOMING' as const,
    })),
    ...outgoing.value.map(entry => ({
      ...entry,
      status: 'OUTGOING' as const,
    })),
  ]

  return new Map(entries.map(entry => [entry.user.id, entry]))
})

const pendingCount = computed(() => incoming.value.length)

function displayName(user: PublicUser) {
  return `${user.firstName} ${user.lastName}`.trim() || user.username
}

function initials(user: PublicUser) {
  return displayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

async function apiFetch<T>(path: string, options: {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
} = {}): Promise<T> {
  return await $fetch<T>(`${apiBase}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    ...(options.body !== undefined ? { body: options.body } : {}),
  })
}

function getErrorMessage(error: unknown) {
  const fetchError = error as {
    data?: { error?: string }
    message?: string
  }

  return fetchError.data?.error || fetchError.message || 'Une erreur est survenue.'
}

function notifySuccess(message: string) {
  successMessage.value = message
  errorMessage.value = ''
}

function notifyError(error: unknown) {
  errorMessage.value = getErrorMessage(error)
  successMessage.value = ''
}

async function loadFriends() {
  try {
    const data = await apiFetch<FriendsResponse>('/friends')

    friends.value = data.friends
    incoming.value = data.incoming
    outgoing.value = data.outgoing
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
  }
}

async function searchUsers() {
  const query = search.value.trim()
  const requestId = ++searchRequestId

  if (query.length < 2) {
    searchResults.value = []
    searching.value = false
    return
  }

  searching.value = true

  try {
    const data = await apiFetch<SearchResponse>(
        `/friends/search?q=${encodeURIComponent(query)}`,
    )

    if (requestId === searchRequestId) {
      searchResults.value = data.users
    }
  } catch (error) {
    if (requestId === searchRequestId) {
      notifyError(error)
    }
  } finally {
    if (requestId === searchRequestId) {
      searching.value = false
    }
  }
}

async function sendRequest(user: PublicUser) {
  if (actionId.value) return

  actionId.value = user.id

  try {
    await apiFetch('/friends/requests', {
        method: 'POST',
        body: { receiverId: user.id },
    })

    await loadFriends()
    notifySuccess(`Demande envoyée à ${user.username}.`)
  } catch (error) {
    notifyError(error)
  } finally {
    actionId.value = null
  }
}

async function acceptRequest(entry: FriendEntry) {
  if (actionId.value) return

  actionId.value = entry.friendshipId

  try {
    await apiFetch(
      `/friends/requests/${entry.friendshipId}/accept`,
      { method: 'POST' },
    )

    await loadFriends()
    notifySuccess(`${entry.user.username} est maintenant ton ami.`)
  } catch (error) {
    notifyError(error)
  } finally {
    actionId.value = null
  }
}

async function removeFriendship(entry: FriendEntry) {
  if (actionId.value) return

  actionId.value = entry.friendshipId

  try {
    await apiFetch(`/friends/${entry.friendshipId}`, {
      method: 'DELETE',
    })

    await loadFriends()
    notifySuccess('Relation mise à jour.')
  } catch (error) {
    notifyError(error)
  } finally {
    actionId.value = null
  }
}

// Évite une requête à chaque caractère.
let searchTimeout: ReturnType<typeof setTimeout> | undefined

watch(search, () => {
  clearTimeout(searchTimeout)
  searchRequestId++
  searching.value = false

  if (search.value.trim().length < 2) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(() => {
    void searchUsers()
  }, 350)
})

onMounted(() => {
  void loadFriends()
})

onUnmounted(() => {
  clearTimeout(searchTimeout)
  searchRequestId++
})
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8 text-white">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-medium text-orange-400">
          SPOT SOCIAL
        </p>

        <h1 class="text-3xl font-bold tracking-tight">
          Mes amis
        </h1>

        <NuxtLink
            to="/groups"
            class="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#C9F36A]/30 bg-[#C9F36A]/10 px-4 py-3 text-sm font-semibold text-[#C9F36A] hover:bg-[#C9F36A]/20"
            >
            <span>Mes groupes</span>
            <span aria-hidden="true">→</span>
        </NuxtLink>

        <p class="mt-2 text-sm text-zinc-400">
          Retrouve tes amis et progressez ensemble.
        </p>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3">
        <p class="text-xs text-zinc-400">Amis</p>
        <p class="text-2xl font-bold">{{ friends.length }}</p>
      </div>
    </div>

    <div
      v-if="errorMessage"
      role="alert"
      class="mb-5 rounded-xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-300"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      role="status"
      class="mb-5 rounded-xl border border-green-800 bg-green-950/40 p-4 text-sm text-green-300"
    >
      {{ successMessage }}
    </div>

    <!-- Recherche -->
    <section class="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h2 class="mb-4 text-lg font-semibold">
        Rechercher un utilisateur
      </h2>

      <input
        v-model="search"
        type="search"
        maxlength="40"
        placeholder="Recherche par pseudo..."
        aria-label="Rechercher un utilisateur par pseudo"
        class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
      >

      <p class="mt-2 text-xs text-zinc-500">
        Saisis au moins 2 caractères.
      </p>

      <div v-if="searching" class="mt-4 text-sm text-zinc-400">
        Recherche en cours...
      </div>

      <div
        v-else-if="search.trim().length >= 2 && !searchResults.length"
        class="mt-4 text-sm text-zinc-400"
      >
        Aucun utilisateur trouvé.
      </div>

      <div v-else-if="searchResults.length" class="mt-4 space-y-2">
        <div
          v-for="user in searchResults"
          :key="user.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-semibold text-orange-400">
              {{ initials(user) }}
            </div>

            <div class="min-w-0">
              <p class="truncate font-medium">
                {{ displayName(user) }}
              </p>
              <p class="truncate text-sm text-zinc-400">
                @{{ user.username }}
              </p>
            </div>
          </div>

          <span
            v-if="friendshipByUserId.get(user.id)?.status === 'ACCEPTED'"
            class="text-sm text-green-400"
          >
            Déjà ami
          </span>

          <span
            v-else-if="friendshipByUserId.get(user.id)?.status === 'OUTGOING'"
            class="text-sm text-zinc-400"
          >
            Demande envoyée
          </span>

          <span
            v-else-if="friendshipByUserId.get(user.id)?.status === 'INCOMING'"
            class="text-sm text-orange-400"
          >
            Demande reçue
          </span>

          <button
            v-else
            type="button"
            :disabled="actionId !== null"
            class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            @click="sendRequest(user)"
          >
            {{ actionId === user.id ? 'Envoi...' : 'Ajouter' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Onglets -->
    <div class="mb-5 flex gap-2 border-b border-zinc-800 pb-3">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'friends'
          ? 'bg-orange-500 text-black'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'"
        @click="activeTab = 'friends'"
      >
        Amis ({{ friends.length }})
      </button>

      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'requests'
          ? 'bg-orange-500 text-black'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'"
        @click="activeTab = 'requests'"
      >
        Demandes
        <span v-if="pendingCount">({{ pendingCount }})</span>
      </button>
    </div>

    <p v-if="loading" class="text-sm text-zinc-400">
      Chargement...
    </p>

    <!-- Liste des amis -->
    <section v-else-if="activeTab === 'friends'" class="space-y-3">
      <div
        v-if="friends.length === 0"
        class="rounded-2xl border border-dashed border-zinc-700 p-10 text-center"
      >
        <p class="font-semibold">Pas encore d'amis</p>
        <p class="mt-2 text-sm text-zinc-400">
          Recherche un utilisateur pour lui envoyer une demande.
        </p>
      </div>

      <div
        v-for="entry in friends"
        :key="entry.friendshipId"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-semibold">
            {{ initials(entry.user) }}
          </div>

          <div>
            <p class="font-semibold">{{ displayName(entry.user) }}</p>
            <p class="text-sm text-zinc-400">@{{ entry.user.username }}</p>
          </div>
        </div>

        <button
          type="button"
          :disabled="actionId !== null"
          class="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950 disabled:opacity-50"
          @click="removeFriendship(entry)"
        >
          Supprimer
        </button>
      </div>
    </section>

    <!-- Demandes -->
    <section v-else class="space-y-6">
      <div>
        <h2 class="mb-3 font-semibold">
          Demandes reçues ({{ incoming.length }})
        </h2>

        <p v-if="incoming.length === 0" class="text-sm text-zinc-400">
          Aucune demande reçue.
        </p>

        <div
          v-for="entry in incoming"
          :key="entry.friendshipId"
          class="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <div>
            <p class="font-medium">{{ displayName(entry.user) }}</p>
            <p class="text-sm text-zinc-400">@{{ entry.user.username }}</p>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              :disabled="actionId !== null"
              class="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              @click="acceptRequest(entry)"
            >
              Accepter
            </button>

            <button
              type="button"
              :disabled="actionId !== null"
              class="rounded-lg border border-zinc-700 px-3 py-2 text-sm disabled:opacity-50"
              @click="removeFriendship(entry)"
            >
              Refuser
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 class="mb-3 font-semibold">
          Demandes envoyées ({{ outgoing.length }})
        </h2>

        <p v-if="outgoing.length === 0" class="text-sm text-zinc-400">
          Aucune demande en attente.
        </p>

        <div
          v-for="entry in outgoing"
          :key="entry.friendshipId"
          class="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <div>
            <p class="font-medium">{{ displayName(entry.user) }}</p>
            <p class="text-sm text-zinc-400">@{{ entry.user.username }}</p>
          </div>

          <button
            type="button"
            :disabled="actionId !== null"
            class="rounded-lg border border-zinc-700 px-3 py-2 text-sm disabled:opacity-50"
            @click="removeFriendship(entry)"
          >
            Annuler
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
