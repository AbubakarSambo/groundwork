import { apiClient } from './client'

/** The door in front of /ops and /admin. See api ops/the-back-office-has-a-door.ts. */
export interface BackOfficeDoor {
  /** On the back-office roster or a platform admin. Anybody else never sees the code screen. */
  staff: boolean
  open: boolean
  via: 'google' | 'otp' | null
  expiresAt: string | null
  codeInFlight: boolean
}

export const backOfficeApi = {
  status: () => apiClient.get<BackOfficeDoor>('/back-office/door', { skipForbiddenToast: true } as any).then(r => r.data),
  sendCode: () => apiClient.post<{ sent: boolean; to: string; expiresInMinutes: number }>('/back-office/door/code').then(r => r.data),
  verify: (code: string) => apiClient.post<{ open: boolean; via: string; expiresAt: string }>('/back-office/door/verify', { code }).then(r => r.data),
}
