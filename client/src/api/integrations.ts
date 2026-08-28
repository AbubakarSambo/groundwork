import { apiClient } from './client'

export interface Credential {
  id: string
  name: string
  clientId: string
  scopes: string[]
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

/** Only ever returned by `issue`. There is no path that reads a secret back. */
export interface IssuedCredential extends Omit<Credential, 'lastUsedAt' | 'revokedAt'> {
  clientSecret: string
}

export interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  rotatedAt: string | null
}

export interface WebhookDelivery {
  id: string
  eventId: string
  eventType: string
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD'
  attempts: number
  lastAttemptAt: string | null
  nextAttemptAt: string | null
  responseCode: number | null
  responseBody: string | null
  createdAt: string
  endpoint: { id: string; url: string }
}

export const integrationsApi = {
  // credentials
  listCredentials: () => apiClient.get<Credential[]>('/integrations/credentials').then(r => r.data),
  issueCredential: (name: string, scopes: string[]) =>
    apiClient.post<IssuedCredential>('/integrations/credentials', { name, scopes }).then(r => r.data),
  revokeCredential: (clientId: string) =>
    apiClient.delete<{ revoked: boolean }>(`/integrations/credentials/${clientId}`).then(r => r.data),

  // webhooks
  webhookEvents: () =>
    apiClient.get<{ available: string[]; notYetEmitted: string[] }>('/integrations/webhooks/events').then(r => r.data),
  listEndpoints: () => apiClient.get<WebhookEndpoint[]>('/integrations/webhooks/endpoints').then(r => r.data),
  registerEndpoint: (url: string, events: string[]) =>
    apiClient.post<WebhookEndpoint & { secret: string }>('/integrations/webhooks/endpoints', { url, events }).then(r => r.data),
  removeEndpoint: (id: string) =>
    apiClient.delete<{ removed: boolean }>(`/integrations/webhooks/endpoints/${id}`).then(r => r.data),
  rotateSecret: (id: string) =>
    apiClient.post<{ id: string; secret: string }>(`/integrations/webhooks/endpoints/${id}/rotate-secret`, {}).then(r => r.data),
  deliveries: (status?: string) =>
    apiClient.get<WebhookDelivery[]>(`/integrations/webhooks/deliveries${status ? `?status=${status}` : ''}`).then(r => r.data),
  replay: (id: string) =>
    apiClient.post<{ replayed: boolean; delivered: boolean }>(`/integrations/webhooks/deliveries/${id}/replay`, {}).then(r => r.data),
}
