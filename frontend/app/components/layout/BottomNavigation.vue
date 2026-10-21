
<script setup lang="ts">
import {
  House,
  Dumbbell,
  ChartNoAxesColumn,
  Users,
  UserRound,
} from 'lucide-vue-next'

const route = useRoute()

const tabs = [
  { label: 'Accueil', to: '/', icon: House },
  { label: 'Séances', to: '/workouts', icon: Dumbbell },
  { label: 'Stats', to: '/stats', icon: ChartNoAxesColumn },
  { label: 'Amis', to: '/friends', icon: Users },
  { label: 'Profil', to: '/profile', icon: UserRound },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'

  if (path === '/stats') {
    return (
      route.path === '/stats' ||
      route.path.startsWith('/stats/') ||
      route.path === '/records' ||
      route.path.startsWith('/records/') ||
      route.path === '/progress' ||
      route.path.startsWith('/progress/')
    )
  }

  return route.path === path ||
    route.path.startsWith(`${path}/`)
}
</script>

<template>
  <nav
    aria-label="Navigation principale"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#19232F]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
  >
    <div class="mx-auto flex h-17 max-w-3xl items-center justify-around px-2">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        :aria-current="isActive(tab.to) ? 'page' : undefined"
        class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors"
        :class="isActive(tab.to)
          ? 'text-[#C9F36A]'
          : 'text-slate-400 hover:text-white'"
      >
        <component :is="tab.icon" :size="21" :stroke-width="2" />

        <span class="text-[10px] font-semibold">
          {{ tab.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>
