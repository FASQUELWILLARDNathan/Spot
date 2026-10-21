
interface SpotProfile {
  id: string
  heightCm: number | null
  startingWeightKg: string | null
  goal: 'GAIN_MUSCLE' | 'LOSE_WEIGHT' | 'MAINTAIN' | null
}

interface SpotUser {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  createdAt: string
  profile: SpotProfile | null
}

interface AuthResponse {
  user: SpotUser
}

interface RegisterData {
  email: string
  username: string
  password: string
  firstName: string
  lastName: string
}

interface LoginData {
  email: string
  password: string
}

export function useAuth() {
  const user = useState<SpotUser | null>('auth-user', () => null)
  const loading = useState('auth-loading', () => false)
  const config = useRuntimeConfig()
  const initialized = useState('auth-initialized', () => false)

  async function register(data: RegisterData) {
    const response = await $fetch<AuthResponse>(
      `${config.public.apiBase}/auth/register`,
      {
        method: 'POST',
        body: data,
        credentials: 'include',
      },
    )

    user.value = response.user
    initialized.value = true
    return response.user
  }

  async function login(data: LoginData) {
    const response = await $fetch<AuthResponse>(
      `${config.public.apiBase}/auth/login`,
      {
        method: 'POST',
        body: data,
        credentials: 'include',
      },
    )

    user.value = response.user
    initialized.value = true
    return response.user
  }

  
async function fetchUser() {
  try {
    const response = await $fetch<AuthResponse>(
      `${config.public.apiBase}/auth/me`,
      {
        credentials: 'include',
      },
    )

    user.value = response.user
    return response.user
  }
  catch {
    user.value = null
    return null
  }
  finally {
    initialized.value = true
  }
}


  async function logout() {
    await $fetch(`${config.public.apiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    user.value = null
    initialized.value = true
    await navigateTo('/login')
  }

  return { user, loading, initialized, register, login, fetchUser, logout }
}
