import { useAuth } from './useAuth'
import { useProfile } from './useProfile'

export function useRole() {
  const { user } = useAuth()
  const { profile } = useProfile(user)

  const role = profile?.role ?? 'salesperson'

  return {
    role,
    isManager: role === 'manager',
    isSalesperson: role === 'salesperson',
  }
}
