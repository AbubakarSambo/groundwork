import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

const WARN_MS   = 29 * 60 * 1000
const LOGOUT_MS = 30 * 60 * 1000

export function useSessionTimeout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnToastId = useRef<string | number | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    function reset() {
      if (warnTimer.current)   clearTimeout(warnTimer.current)
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
      if (warnToastId.current) toast.dismiss(warnToastId.current)

      warnTimer.current = setTimeout(() => {
        warnToastId.current = toast.warning(
          'You will be signed out in 1 minute due to inactivity.',
          { duration: 60_000 },
        )
      }, WARN_MS)

      logoutTimer.current = setTimeout(() => {
        logout()
        navigate('/login')
        toast.info('Signed out due to inactivity.')
      }, LOGOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (warnTimer.current)   clearTimeout(warnTimer.current)
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
    }
  }, [isAuthenticated, logout, navigate])
}
