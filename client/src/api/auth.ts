import { apiClient } from './client'
import type { User } from '@/types'

export interface MagicLinkResponse { message: string; email: string }
/**
 * `needsPassword` is optional on the type because older responses will not carry it, and a missing
 * flag must read as "no password step needed" rather than sending everybody to set one. The server
 * computes it in `buildAuthResponse`, so every door returns it.
 */
export interface VerifyEmailResponse { accessToken: string; user: User; needsPassword?: boolean; passwordSetupToken?: string }
export interface ValidateTokenResponse { valid: boolean; email?: string; firstName?: string }

export interface MagicLinkBody {
  email: string
  organizationName?: string
  firstName?: string
  lastName?: string
}

export const authApi = {
  requestMagicLink: (body: MagicLinkBody) =>
    apiClient.post<MagicLinkResponse>('/auth/register-magic-link', body).then(r => r.data),

  memberSignin: (email: string) =>
    apiClient.post<MagicLinkResponse>('/auth/member-signin', { email }).then(r => r.data),

  verifyEmail: (token: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/verify-email', { token }).then(r => r.data),

  setPassword: (token: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/set-password', { token, password }).then(r => r.data),

  resetPassword: (token: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/reset-password', { token, password }).then(r => r.data),

  me: () =>
    apiClient.get<User>('/auth/me').then(r => r.data),

  updateProfile: (body: {
    firstName?: string; lastName?: string; jobTitle?: string;
    orgName?: string; orgSlug?: string; companyStage?: string;
  }) => apiClient.patch<User>('/auth/me', body).then(r => r.data),

  inviteUser: (body: { firstName: string; lastName: string; email: string }) =>
    apiClient.post<User>('/users', body).then(r => r.data),

  // draft = the server-side copy of the anonymous session (transcript +
  // commit metadata), written the moment the email is given so the commit no
  // longer depends on which browser opens the magic link.
  entrySave: (email: string, draft?: { payload?: Record<string, unknown>; history?: unknown[] }) =>
    apiClient.post<MagicLinkResponse & { draftToken?: string }>('/auth/entry-save', { email, draft }).then(r => r.data),

  requestPasswordSetup: () =>
    apiClient.post<{ token: string }>('/auth/request-password-setup').then(r => r.data),

  login: (email: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/login', { email, password }).then(r => r.data),

  forgotPassword: (email: string) =>
    apiClient.post<MagicLinkResponse>('/auth/forgot-password', { email }).then(r => r.data),

  teamInvite: (email: string) =>
    apiClient.post<{ message: string }>('/auth/team-invite', { email }).then(r => r.data),

  setEmailNotifications: (enabled: boolean) =>
    apiClient.patch<User>('/auth/me', { emailNotifications: enabled }).then(r => r.data),

  setPhoneNumber: (phoneNumber: string | null) =>
    apiClient.patch<User>('/auth/me', { phoneNumber }).then(r => r.data),

  leaveOrg: () =>
    apiClient.post<{ left: boolean }>('/users/me/leave').then(r => r.data),

  /**
   * An org is named from the email address when nobody was asked - and until
   * now nobody could correct it, though the name is on every page the team
   * sees. Admin only, server-enforced.
   */
  renameOrganization: (name: string) =>
    apiClient.patch<{ id: string; name: string }>('/users/organization', { name }).then(r => r.data),

  /**
   * Which sign-in methods this deployment can actually complete.
   *
   * Google sign-in is fully built on both sides but inert until
   * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set on the server - and the
   * server is the only side that knows. Asking means the button appears the
   * moment credentials are provisioned, with no client change, and never appears
   * while pressing it would land someone on a Google error page.
   */
  methods: () =>
    apiClient.get<{ magicLink: boolean; google: boolean }>('/auth/methods').then(r => r.data),

  /** Trade the one-time OAuth code from the redirect for a real JWT. */
  googleExchange: (code: string) =>
    apiClient.get<{ accessToken: string }>(`/auth/google/exchange?code=${encodeURIComponent(code)}`).then(r => r.data),

  /** The organisations this person belongs to, with the active one marked. */
  myOrganizations: () =>
    apiClient
      .get<{ id: string; name: string; slug: string; role: string; active: boolean }[]>(
        '/auth/my-organizations',
        { skipForbiddenToast: true, skipNotFoundToast: true },
      )
      .then(r => r.data),

  /**
   * Switch the active organisation. Returns a NEW token - every org-scoped query
   * reads the org off the token, so the old one still points at the old org.
   */
  switchOrganization: (organizationId: string) =>
    apiClient
      .post<{ accessToken: string; user: any; organization: { id: string; name: string; slug: string } }>(
        '/auth/switch-organization',
        { organizationId },
      )
      .then(r => r.data),
}
