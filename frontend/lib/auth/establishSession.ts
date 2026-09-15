import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/authStore'
import { userProfileFromAccessToken } from '@/lib/auth/jwtUser'

function setAuthCookies(accessToken: string, role: string) {
  document.cookie = `auth-token=${accessToken}; path=/; max-age=86400`
  document.cookie = `auth-role=${role}; path=/; max-age=86400`
}

/**
 * Persists tokens and loads full profile from `/auth/profile`.
 * Call after login/register once `accessToken` + `refreshToken` are known.
 */
export async function establishSession(accessToken: string, refreshToken: string) {
  const { setAuth, setUser } = useAuthStore.getState()
  const mini = userProfileFromAccessToken(accessToken)
  setAuth(accessToken, refreshToken, mini)

  try {
    const prof = await authApi.getProfile()
    if (prof.success && prof.data) {
      setUser(prof.data)
    }
  } catch {
    /* keep JWT-based minimal profile */
  }

  const role = useAuthStore.getState().user?.roles?.includes('Admin') ? 'Admin' : 'User'
  setAuthCookies(accessToken, role)
}
