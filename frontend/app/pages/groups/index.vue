
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Users, Plus, ChevronRight, X } from 'lucide-vue-next'

type Group = {
  id: string
  name: string
  description: string | null
  ownerId: string
  _count: {
    members: number
  }
}

type GroupInvitation = {
  id: string
  group: {
    id: string
    name: string
    description: string | null
  }
  sender: {
    username: string
  }
}

const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || 'http://localhost:4000')
  .replace(/\/$/, '')

const groups = ref<Group[]>([])
const loading = ref(true)
const creating = ref(false)
const showCreateModal = ref(false)
const errorMessage = ref('')

const name = ref('')
const description = ref('')

const invitations = ref<GroupInvitation[]>([])
const respondingId = ref<string | null>(null)

async function loadGroups() {
  loading.value = true

  try {
    const response = await $fetch<{ groups: Group[] }>(
      `${apiBase}/groups`,
      { credentials: 'include' },
    )

    groups.value = response.groups
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Impossible de charger les groupes.'
  } finally {
    loading.value = false
  }
}

async function createGroup() {
  if (creating.value || name.value.trim().length < 2) return

  creating.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ group: Group }>(
      `${apiBase}/groups`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          name: name.value.trim(),
          description: description.value.trim(),
        },
      },
    )

    showCreateModal.value = false
    name.value = ''
    description.value = ''

    await navigateTo(`/groups/${response.group.id}`)
  } catch (error: unknown) {
    const err = error as { data?: { error?: string } }
    errorMessage.value = err.data?.error || 'Impossible de créer le groupe.'
  } finally {
    creating.value = false
  }
}

async function loadInvitations() {
  try {
    const response = await $fetch<{
      invitations: GroupInvitation[]
    }>(`${apiBase}/groups/invitations/received`, {
      credentials: 'include',
    })

    invitations.value = response.invitations
  } catch {
    errorMessage.value = 'Impossible de charger les invitations.'
  }
}

async function respondToInvitation(
  invitationId: string,
  action: 'ACCEPT' | 'DECLINE',
) {
  if (respondingId.value) return
  respondingId.value = invitationId

  try {
    await $fetch(
      `${apiBase}/groups/invitations/${invitationId}/respond`,
      {
        method: 'POST',
        credentials: 'include',
        body: { action },
      },
    )

    await Promise.all([loadInvitations(), loadGroups()])
  } catch (error: unknown) {
    const err = error as { data?: { error?: string } }
    errorMessage.value =
      err.data?.error || "Impossible de traiter l'invitation."
  } finally {
    respondingId.value = null
  }
}

onMounted(() => {
  void loadGroups()
  void loadInvitations()
})
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8 pb-28 text-white">
    <div class="mb-8 flex items-center justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-semibold text-[#C9F36A]">
          SPOT SOCIAL
        </p>

        <h1 class="text-3xl font-bold">Mes groupes</h1>

        <p class="mt-2 text-sm text-slate-400">
          Progresse avec tes amis et compare vos performances.
        </p>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-3 font-semibold text-[#19232F] transition hover:brightness-110"
        @click="showCreateModal = true"
      >
        <Plus :size="18" />
        <span class="hidden sm:inline">Créer</span>
      </button>
    </div>

    <p v-if="errorMessage" role="alert" class="mb-5 text-sm text-red-400">
      {{ errorMessage }}
    </p>

    
    <!-- Invitations reçues -->
    <section
    v-if="invitations.length > 0"
    class="mb-8 rounded-2xl border border-[#C9F36A]/20 bg-[#19232F] p-5"
    >
    <div class="mb-5 flex items-center justify-between">
        <h2 class="text-lg font-semibold">
        Invitations reçues
        </h2>

        <span
        class="rounded-full bg-[#C9F36A]/15 px-3 py-1 text-xs font-bold text-[#C9F36A]"
        >
        {{ invitations.length }}
        </span>
    </div>

    <div
        v-for="invitation in invitations"
        :key="invitation.id"
        class="border-t border-white/10 py-4 first:border-t-0 first:pt-0 last:pb-0"
    >
        <div class="mb-3">
        <p class="font-semibold text-white">
            {{ invitation.group.name }}
        </p>

        <p class="mt-1 text-sm text-slate-400">
            Invitation envoyée par @{{ invitation.sender.username }}
        </p>

        <p
            v-if="invitation.group.description"
            class="mt-2 text-sm text-slate-400"
        >
            {{ invitation.group.description }}
        </p>
        </div>

        <div class="flex gap-3">
        <button
            type="button"
            :disabled="respondingId !== null"
            class="flex-1 rounded-xl bg-[#C9F36A] px-4 py-3 text-sm font-semibold text-[#19232F] transition hover:brightness-110 disabled:opacity-50"
            @click="respondToInvitation(invitation.id, 'ACCEPT')"
        >
            {{ respondingId === invitation.id ? 'Traitement...' : 'Accepter' }}
        </button>

        <button
            type="button"
            :disabled="respondingId !== null"
            class="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
            @click="respondToInvitation(invitation.id, 'DECLINE')"
        >
            Refuser
        </button>
        </div>
    </div>
    </section>

    
    <p v-if="loading" class="text-slate-400">
      Chargement des groupes...
    </p>

    <div
      v-else-if="groups.length === 0"
      class="rounded-2xl border border-white/10 bg-[#19232F] p-8 text-center"
    >
      <Users :size="40" class="mx-auto mb-4 text-[#C9F36A]" />

      <h2 class="text-xl font-semibold">Aucun groupe pour le moment</h2>

      <p class="mt-2 text-sm text-slate-400">
        Crée un groupe pour retrouver tes amis et suivre votre progression.
      </p>

      <button
        type="button"
        class="mt-6 rounded-xl bg-[#C9F36A] px-5 py-3 font-semibold text-[#19232F]"
        @click="showCreateModal = true"
      >
        Créer mon premier groupe
      </button>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="group in groups"
        :key="group.id"
        :to="`/groups/${group.id}`"
        class="group rounded-2xl border border-white/10 bg-[#19232F] p-5 transition hover:border-[#C9F36A]/50"
      >
        <div class="mb-4 flex items-center justify-between">
          <div class="rounded-xl bg-[#C9F36A]/10 p-3 text-[#C9F36A]">
            <Users :size="24" />
          </div>

          <ChevronRight
            :size="20"
            class="text-slate-400 transition group-hover:translate-x-1"
          />
        </div>

        <h2 class="text-lg font-bold">{{ group.name }}</h2>

        <p class="mt-2 line-clamp-2 text-sm text-slate-400">
          {{ group.description || 'Aucune description' }}
        </p>

        <p class="mt-5 text-sm font-medium text-[#C9F36A]">
          {{ group._count.members }}
          membre{{ group._count.members > 1 ? 's' : '' }}
        </p>
      </NuxtLink>
    </div>

    <!-- Fenêtre de création -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      @click.self="showCreateModal = false"
    >
      <form
        class="w-full max-w-md rounded-2xl border border-white/10 bg-[#19232F] p-6 shadow-2xl"
        @submit.prevent="createGroup"
      >
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-bold">Créer un groupe</h2>

          <button
            type="button"
            aria-label="Fermer"
            class="text-slate-400 hover:text-white"
            @click="showCreateModal = false"
          >
            <X :size="22" />
          </button>
        </div>

        <label for="group-name" class="mb-2 block text-sm font-medium">
          Nom du groupe
        </label>

        <input
          id="group-name"
          v-model="name"
          required
          minlength="2"
          maxlength="60"
          placeholder="Ex : Les monstres du bench"
          class="mb-5 w-full rounded-xl border border-white/10 bg-[#111923] px-4 py-3 outline-none focus:border-[#C9F36A]"
        >

        <label for="group-description" class="mb-2 block text-sm font-medium">
          Description (facultatif)
        </label>

        <textarea
          id="group-description"
          v-model="description"
          maxlength="300"
          rows="3"
          placeholder="Notre groupe de musculation..."
          class="mb-6 w-full resize-none rounded-xl border border-white/10 bg-[#111923] px-4 py-3 outline-none focus:border-[#C9F36A]"
        />

        <button
          type="submit"
          :disabled="creating || name.trim().length < 2"
          class="w-full rounded-xl bg-[#C9F36A] py-3 font-semibold text-[#19232F] disabled:opacity-50"
        >
          {{ creating ? 'Création...' : 'Créer le groupe' }}
        </button>
      </form>
    </div>
  </main>
</template>
