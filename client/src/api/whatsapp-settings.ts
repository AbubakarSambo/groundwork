import { apiClient } from './client'

/**
 * GROUNDWORK'S OWN WHATSAPP NUMBER, AS GROUNDWORK STAFF SET IT (5 Oct 2026). Staff only: every route
 * is behind the platform-admin guard on the API. No secret ever comes back from these calls; each
 * secret reads "set" or "not set". See api/src/modules/whatsapp/groundworks-own-number.ts.
 */

export type OurField = { value: string | null; from: 'here' | 'server' | null; saying: string }
/** `from: 'here'` means it was saved in the back office, so it can be removed there. Never the secret. */
export type OurSecret = { state: 'set' | 'not set'; from: 'here' | 'server' | null; saying: string }

export interface OurWhatsAppSettings {
  fields: { displayNumber: OurField; phoneNumberId: OurField; businessAccountId: OurField }
  secrets: { accessToken: OurSecret; appSecret: OurSecret; verifyToken: OurSecret }
  canSaveSecrets: boolean
  canSaveSecretsSaying: string
  webhook: { address: string | null; path: string; saying: string }
  switch: { credentialsConfigured: boolean; adminEnabled: boolean; live: boolean; saying: string }
  saved?: string
}

export type OurSecretName = 'accessToken' | 'appSecret' | 'verifyToken'

export interface SaveOurWhatsAppSettings {
  displayNumber?: string
  phoneNumberId?: string
  businessAccountId?: string
  accessToken?: string
  appSecret?: string
  verifyToken?: string
  remove?: OurSecretName[]
}

export const whatsAppSettingsApi = {
  get: () => apiClient.get<OurWhatsAppSettings>('/admin/whatsapp/settings').then(r => r.data),
  save: (body: SaveOurWhatsAppSettings) => apiClient.put<OurWhatsAppSettings>('/admin/whatsapp/settings', body).then(r => r.data),
  connection: () => apiClient.get<{ connected: boolean; saying: string }>('/admin/whatsapp/settings/connection').then(r => r.data),
  sendTest: (to: string) => apiClient.post<{ sent: boolean; to: string; saying: string }>('/admin/whatsapp/settings/test', { to }).then(r => r.data),
}
