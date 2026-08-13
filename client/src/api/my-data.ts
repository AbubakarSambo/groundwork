import { apiClient } from './client'

/**
 * THE ANSWER TO "WHAT DO YOU HOLD ABOUT ME". W14-9.
 *
 * Both endpoints have existed since the GDPR work and neither had a caller. They are self-scoped by
 * construction - the user id comes off the token, never off a parameter - which is exactly what the
 * cross-organisation privacy audit I deleted was not.
 */
/** Read off the service's actual return, not off what the page wanted it to be. */
export interface MyData {
  userId: string
  email: string
  firstName: string
  lastName: string
  recordEntries: { id: string; type: string; text: string; createdAt: string }[]
  checkIns: { id: string; status: string; sessionNumber: number; completedAt: string | null; groundLabel: string }[]
  grounds: { id: string; label: string; scenario: string; status: string }[]
}

export const myDataApi = {
  get: () => apiClient.get<MyData>('/users/me/export').then(r => r.data),
  erase: () => apiClient.delete('/users/me/data').then(r => r.data),
}
