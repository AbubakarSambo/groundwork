import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * WHETHER TO MENTION WHATSAPP AT ALL (U.3, Hafsah, 26 September). While WhatsApp is not switched on,
 * in Groundwork or through the organisation's own number, no screen mentions it. The server decides
 * (GET /auth/whatsapp); until it answers, and when it cannot, the answer is "off".
 */
export function useWhatsAppIsOn(): boolean {
  const signedIn = useAuthStore(s => s.isAuthenticated)
  const { data } = useQuery({
    queryKey: ['whatsapp-is-on'],
    queryFn: () => apiClient.get('/auth/whatsapp').then(r => !!(r.data.data ?? r.data)?.on),
    enabled: signedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return data === true
}
