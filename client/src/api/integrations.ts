import { apiClient } from './client'

export interface Credential {
  id: string
  name: string
  clientId: string
  /** The system this speaks for. The roster is keyed on it, so a replacement must carry the same. */
  sourceSystem: string
  scopes: string[]
  lastUsedAt: string | null
  revokedAt: string | null
  /** Set by Replace. Until the old one is revoked, both work. */
  replacedByClientId: string | null
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

export interface ImportJobSummary {
  id: string
  sourceSystem: string
  kind: string
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'ABANDONED'
  total: number
  succeeded: number
  failed: number
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface ImportFailure {
  /** Zero-based position in the batch as it was sent. */
  index: number
  externalId: string | null
  message: string
}

export interface ImportDetail extends Omit<ImportJobSummary, 'id' | 'kind'> {
  jobId: string
  failures: ImportFailure[]
  detectionQuietUntil: string | null
}

export interface WhatsAppConnection {
  phoneNumberId: string
  businessAccountId: string | null
  displayNumber: string | null
  verifyToken: string
  enabled: boolean
  connectedAt: string
  lastInboundAt: string | null
  lastOutboundAt: string | null
  tokenEndsWith: string
}

export const integrationsApi = {
  /* The organisation's own WhatsApp number. Secrets go in and are never read back. */
  whatsapp: () =>
    apiClient.get<{ connection: WhatsAppConnection | null; webhookPath: string }>('/integrations/whatsapp').then(r => r.data),
  connectWhatsapp: (body: { phoneNumberId: string; businessAccountId?: string; displayNumber?: string; accessToken?: string; appSecret?: string }) =>
    apiClient.put<{ connection: WhatsAppConnection; webhookPath: string }>('/integrations/whatsapp', body).then(r => r.data),
  setWhatsappEnabled: (enabled: boolean) =>
    apiClient.post<{ connection: WhatsAppConnection }>('/integrations/whatsapp/enabled', { enabled }).then(r => r.data),
  testWhatsapp: (to: string) =>
    apiClient.post<{ sent: boolean }>('/integrations/whatsapp/test', { to }).then(r => r.data),
  disconnectWhatsapp: () =>
    apiClient.delete<{ disconnected: boolean }>('/integrations/whatsapp').then(r => r.data),
  // credentials
  /** Whether this organisation has been let in, and what is left if not. */
  myApiAccess: () =>
    apiClient
      .get<{
        status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN' | null
        whatFor: string | null
        requestedAt: string | null
        decidedAt: string | null
        note: string | null
        approved: boolean
        says: string
      }>('/integrations/credentials/access-request')
      .then(r => r.data),

  askForApiAccess: (whatFor: string, acceptedTerms: boolean) =>
    apiClient.post('/integrations/credentials/access-request', { whatFor, acceptedTerms }).then(r => r.data),

  /** The terms accepted at the point of asking. Versioned. */
  apiTerms: () =>
    apiClient.get<{ version: string; title: string; says: string; terms: { heading: string; body: string }[] }>('/integrations/credentials/terms').then(r => r.data),

  /** A one-hour path to the API reference. Refused until access is approved. */
  docsLink: () =>
    apiClient.get<{ path: string; expiresInMinutes: number }>('/integrations/credentials/docs-link').then(r => r.data),

  listCredentials: () => apiClient.get<Credential[]>('/integrations/credentials').then(r => r.data),
  issueCredential: (name: string, scopes: string[]) =>
    apiClient.post<IssuedCredential>('/integrations/credentials', { name, scopes }).then(r => r.data),
  /**
   * Replacing one is what rotating actually is: issue, deploy, revoke. The successor carries the
   * original's source system, so the roster stays one roster — which typing the same name by hand
   * did not guarantee.
   */
  replaceCredential: (clientId: string) =>
    apiClient
      .post<IssuedCredential & { replaces: string; says: string }>(`/integrations/credentials/${clientId}/replace`, {})
      .then(r => r.data),

  revokeCredential: (clientId: string) =>
    apiClient.delete<{ revoked: boolean }>(`/integrations/credentials/${clientId}`).then(r => r.data),

  // imports
  listImports: () =>
    apiClient.get<{ jobs: ImportJobSummary[]; detectionQuietUntil: string | null }>('/integrations/imports').then(r => r.data),
  importDetail: (jobId: string) =>
    apiClient.get<ImportDetail>(`/integrations/imports/${jobId}`).then(r => r.data),

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
  /** Back on, after an endpoint was switched off for being unreachable (the notice mail says so). */
  reactivateEndpoint: (id: string) =>
    apiClient.post<{ id: string; active: boolean }>(`/integrations/webhooks/endpoints/${id}/reactivate`, {}).then(r => r.data),
  deliveries: (status?: string) =>
    apiClient.get<WebhookDelivery[]>(`/integrations/webhooks/deliveries${status ? `?status=${status}` : ''}`).then(r => r.data),
  replay: (id: string) =>
    apiClient.post<{ replayed: boolean; delivered: boolean }>(`/integrations/webhooks/deliveries/${id}/replay`, {}).then(r => r.data),
}
