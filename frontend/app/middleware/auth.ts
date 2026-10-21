
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { user, initialized, fetchUser } = useAuth()

  if (!initialized.value) {
    await fetchUser()
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  const profile = user.value.profile

  const needsOnboarding =
    profile?.heightCm == null ||
    profile?.startingWeightKg == null ||
    profile?.goal == null

  if (needsOnboarding && to.path !== '/onboarding') {
    return navigateTo('/onboarding')
  }

  if (!needsOnboarding && to.path === '/onboarding') {
    return navigateTo('/')
  }
})
