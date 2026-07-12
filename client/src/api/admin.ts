import { apiClient } from './client'

export interface WhatsAppToggleState {
  credentialsConfigured: boolean
  adminEnabled: boolean
  live: boolean
}

export const adminApi = {
  getWhatsAppStatus: () =>
    apiClient.get<WhatsAppToggleState>('/admin/whatsapp').then(r => r.data),

  setWhatsAppEnabled: (enabled: boolean) =>
    apiClient.patch<WhatsAppToggleState>('/admin/whatsapp', { enabled }).then(r => r.data),
}
