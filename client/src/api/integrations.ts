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

/** Where we tell you: a Slack or Teams incoming webhook. The address is write-only and never comes back. */
export interface WorkspaceNotifier {
  kind: 'SLACK' | 'TEAMS'
  channelSaid: string | null
  enabled: boolean
  lastPostedAt: string | null
  lastError: string | null
}

/** The embedded panel's configuration, without its signing secret (that is returned once, on setup). */
export interface RetentionPolicy {
  turnRetentionDays: number
  /** False while the organisation runs on the default and has never chosen. */
  set: boolean
  floor: number
  ceiling: number
  default: number
}

export interface EmbedConfig {
  allowedDomains: string[]
  placement: 'floating' | 'anchor' | string
  outOfScopeDepartments: string[]
  frameAncestors?: string
  createdAt?: string
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
  /** When Meta's handshake answered, or else when the first message came in through the address (U.18). */
  webhookProvenAt?: string | null
  tokenEndsWith: string
  /**
   * THE ORGANISATION'S OWN KEYS, SEALED, AND SOMETIMES UNREADABLE (6 October, answers-from-engine.md,
   * "an organisation's own WhatsApp number, when its keys cannot be opened"). The access token and
   * app secret are kept sealed; if the server's own key that seals them is changed or removed, they
   * cannot be opened any more. `keysNeedTypingAgain` is true in that case, and nothing is sent from
   * the number until the admin types the token and the app secret in again. `keysNeedTypingAgainSays`
   * is the served sentence, to show word for word.
   */
  keysNeedTypingAgain?: boolean
  keysNeedTypingAgainSays?: string | null
}

/** The counts on the Connections page (U.18). Counts only, and admins only, on the server. */
export interface ConnectionsAtAGlance {
  whatsapp: { people: number; checkInsThisMonth: number; failedThisWeek: number } | null
  figures: { fromYourProduct: boolean }
}

export const integrationsApi = {
  atAGlance: () => apiClient.get<ConnectionsAtAGlance>('/integrations/connections').then(r => r.data),
  /* The organisation's own WhatsApp number. Secrets go in and are never read back. */
  whatsapp: () =>
    apiClient.get<{ connection: WhatsAppConnection | null; webhookPath: string }>('/integrations/whatsapp').then(r => r.data),
  connectWhatsapp: (body: { phoneNumberId: string; businessAccountId?: string; displayNumber?: string; accessToken?: string; appSecret?: string }) =>
    apiClient.put<{ connection: WhatsAppConnection; webhookPath: string }>('/integrations/whatsapp', body).then(r => r.data),
  setWhatsappEnabled: (enabled: boolean) =>
    apiClient.post<{ connection: WhatsAppConnection }>('/integrations/whatsapp/enabled', { enabled }).then(r => r.data),
  testWhatsapp: (to: string) =>
    apiClient.post<{ sent: boolean }>('/integrations/whatsapp/test', { to }).then(r => r.data),

  /* Which of our template names Meta approved under THIS organisation's own app. Their app, their
     approval; the send path reads what is recorded here. */
  whatsappTemplates: (approved: string[]) =>
    apiClient.post<{ approved: string[] }>('/integrations/whatsapp/templates', { approved }).then(r => r.data),
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
  /** `deprecated` maps an old event name to the one to subscribe to instead (B13). */
  webhookEvents: () =>
    apiClient.get<{ available: string[]; notYetEmitted: string[]; deprecated?: Record<string, string> }>('/integrations/webhooks/events').then(r => r.data),
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
  /* Where we tell you. Routes existed with no caller; a notice engine with five live call sites read an
     empty table for every organisation because nothing could write a row. */
  workspaceNotifiers: () => apiClient.get<WorkspaceNotifier[]>('/integrations/workspace').then(r => r.data),
  connectWorkspace: (kind: 'slack' | 'teams', url: string, channelSaid?: string) =>
    apiClient.post<{ kind: string; channelSaid: string | null; enabled: boolean }>(`/integrations/workspace/${kind}`, { url, channelSaid }).then(r => r.data),
  testWorkspace: (kind: 'slack' | 'teams') =>
    apiClient.post<{ posted: boolean; because?: string }>(`/integrations/workspace/${kind}/test`, {}).then(r => r.data),
  turnWorkspace: (kind: 'slack' | 'teams', on: boolean) =>
    apiClient.post(`/integrations/workspace/${kind}/${on ? 'on' : 'off'}`, {}).then(r => r.data),
  disconnectWorkspace: (kind: 'slack' | 'teams') =>
    apiClient.delete(`/integrations/workspace/${kind}`).then(r => r.data),
  /* How long a departed person's raw turns are kept. Read on every departure; writable here (B12). */
  retention: () => apiClient.get<RetentionPolicy>('/org/retention').then(r => r.data),
  setRetention: (turnRetentionDays: number) =>
    apiClient.patch<RetentionPolicy>('/org/retention', { turnRetentionDays }).then(r => r.data),
  /* Embed the panel. Over 1,300 lines of served loader, panel and signing scheme, reachable only by a database write. */
  embedConfig: () => apiClient.get<EmbedConfig | null>('/integrations/embed').then(r => r.data),
  setUpEmbed: (body: { allowedDomains: string[]; placement: 'floating' | 'anchor'; outOfScopeDepartments: string[] }) =>
    apiClient.post<EmbedConfig & { signingSecret: string }>('/integrations/embed', body).then(r => r.data),
  deliveries: (status?: string) =>
    apiClient.get<WebhookDelivery[]>(`/integrations/webhooks/deliveries${status ? `?status=${status}` : ''}`).then(r => r.data),
  replay: (id: string) =>
    apiClient.post<{ replayed: boolean; delivered: boolean }>(`/integrations/webhooks/deliveries/${id}/replay`, {}).then(r => r.data),
}
