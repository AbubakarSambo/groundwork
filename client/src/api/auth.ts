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

export interface WaitingAtTheDoor {
  id: string
  email: string
  name: string | null
  waitingSince: string
  /** Who added them. Named, because "somebody added them" is not something an admin can act on. */
  addedBy: string | null
  forCheckIn: string | null
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
    orgName?: string; orgEmail?: string; orgSlug?: string; companyStage?: string;
  }) => apiClient.patch<User>('/auth/me', body).then(r => r.data),

  /**
   * `inviteUser` USED TO SIT HERE - THE SECOND OF TWO WAYS TO ADD A COLLEAGUE. W-UX-C.
   *
   * It posted to `POST /users`, which CREATES the account directly from a name and an address. The
   * one the product actually uses is `teamInvite` (`POST /auth/team-invite`), which emails a link and
   * lets the person set up their own account - and that is the better of the two on consent grounds,
   * not just on usage: nobody should have a Groundwork account made for them without being asked.
   *
   * Nothing has ever called this one. The server route stays.
   */

  // draft = the server-side copy of the anonymous session (transcript +
  // commit metadata), written the moment the email is given so the commit no
  // longer depends on which browser opens the magic link.
  /* `hp` is the honeypot — see components/gw/a-field-nobody-can-see.tsx. Sent as `_hp`, which is
     the name the two older endpoints already use. */
  entrySave: (email: string, draft?: { payload?: Record<string, unknown>; history?: unknown[] }, hp?: string) =>
    apiClient.post<MagicLinkResponse & { draftToken?: string }>('/auth/entry-save', { email, draft, ...(hp ? { _hp: hp } : {}) }).then(r => r.data),

  requestPasswordSetup: () =>
    apiClient.post<{ token: string }>('/auth/request-password-setup').then(r => r.data),

  login: (email: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/login', { email, password }).then(r => r.data),

  forgotPassword: (email: string) =>
    apiClient.post<MagicLinkResponse>('/auth/forgot-password', { email }).then(r => r.data),

  /** Colleagues already in the organisation: name and address, for adding to a check-in without typing. */
  colleagues: () =>
    apiClient.get<{ email: string; name: string | null }[]>('/users/colleagues').then(r => r.data),
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
   * WHO IS WAITING TO BE LET INTO THIS ORGANISATION.
   *
   * Adding an address to a check-in used to make it a member here the moment they accepted, with
   * no approval and nobody asked - and because a seat is any active user, on the bill at the same
   * time. Somebody from outside is queued now, holds no seat, and cannot check in until an admin
   * answers. This is that queue, and the answer.
   */
  whoIsWaiting: () =>
    apiClient.get<WaitingAtTheDoor[]>('/users/waiting').then(r => r.data),

  /**
   * THE OTHER QUEUE AT THE SAME DOOR: people a lead has added to a check-in with no seat for them.
   * Separate from the one above on purpose - a membership request is a judgement about a person,
   * this is a purchase - and answered by making room rather than by saying yes.
   */
  waitingForASeat: () =>
    apiClient.get<{ id: string; email: string; addedBy: string | null; forCheckIn: string | null; waitingSince: string; saying: string }[]>('/users/waiting/seats').then(r => r.data),

  sendTheHeldInvitations: () =>
    apiClient.post<{ sent: number; stillWaiting: number }>('/users/waiting/seats/release', {}).then(r => r.data),

  letThemIn: (id: string) =>
    apiClient.post<{ approved: boolean; email: string }>(`/users/waiting/${id}/approve`, {}).then(r => r.data),

  doNotLetThemIn: (id: string, reason?: string) =>
    apiClient.post<{ declined: boolean; email: string }>(`/users/waiting/${id}/decline`, { reason }).then(r => r.data),

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
   * THE DOOR OUT OF SOMEBODY ELSE'S ORGANISATION.
   *
   * Somebody whose address was on a roster is joined to that organisation when they verify. Right
   * for an employee, wrong for a respondent or a contact who signed up to use Groundwork for their
   * own work - and with one membership there was nothing to switch to. Returns a token scoped to
   * the new workspace, exactly like a switch, because that is what it ends with.
   */
  startMyOwnWorkspace: () =>
    apiClient
      .post<{ accessToken: string; user: any; organization: { id: string; name: string; slug: string } }>(
        '/auth/start-my-own-workspace',
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
