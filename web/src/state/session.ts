import { createResource, createRoot, createSignal } from 'solid-js'
import { api } from '../api/client.ts'
import type { AuthStatus, Profile } from '../api/types.ts'

const guestStatus: AuthStatus = { registered: false, username: null }

export const session = createRoot(() => {
  const [status, { mutate: setStatus, refetch: refetchStatus }] = createResource<AuthStatus>(async () => {
    try {
      return await api.authStatus()
    } catch {
      return guestStatus
    }
  })
  const [caps] = createResource(async () => {
    try {
      return await api.capabilities()
    } catch {
      return { ai: false }
    }
  })
  const [profileKey, setProfileKey] = createSignal(0)
  const [profile, { mutate: setProfile }] = createResource<Profile | null, [boolean, number]>(
    () => [status()?.registered === true, profileKey()] as [boolean, number],
    async ([registered]) => {
      if (!registered) {
        return null
      }
      return api.profile()
    },
  )

  return {
    loaded: () => status.state !== 'pending' && status.state !== 'unresolved',
    registered: () => status()?.registered === true,
    username: () => status()?.username ?? null,
    aiEnabled: () => caps()?.ai === true,
    profile,
    profileLoaded: () => (status()?.registered === true ? profile.state === 'ready' : true),
    hasProfile: (): boolean | undefined => {
      if (status()?.registered !== true) {
        return undefined
      }
      return profile.state === 'ready' ? profile() != null : undefined
    },
    setStatus,
    refetchStatus,
    setProfile,
    reloadProfile: () => setProfileKey((value) => value + 1),
  }
})

export async function signedIn(username: string): Promise<void> {
  session.setStatus({ registered: true, username })
  session.reloadProfile()
}

export function signedOut(): void {
  session.setStatus(guestStatus)
  session.setProfile(null)
}
