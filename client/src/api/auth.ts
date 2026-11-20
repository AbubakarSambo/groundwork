import { apiClient } from './client'
import type { User } from '@/types'

export interface MagicLinkResponse { message: string; email: string }
/** An emailed link signs in and goes on: no password step and no "Your email is confirmed" page after it (batch 2, group 6). */
export interface VerifyEmailResponse {
  accessToken: string
  user: User
  /** True when opening this link has just created the account (a waiting sign-up became real). */
  justCreated?: boolean
  /** Where they were going when they asked for this link, such as "/j/coamana-6rr7". Only a path in this app. */
  next?: string
}
/**
 * THE LINK HAS PROVED THE ADDRESS, BUT NOTHING IS MADE YET (U.3 review). An organisation lets this
 * address's domain join, or the invite link they came from could not take them, so "Where do you
 * work?" comes first. Answering calls verify-email again with the choice.
 */
export interface WhereDoYouWorkFirst {
  /** Their own address, which the link has just proved. */
  email?: string
  whereDoYouWork: { byDomain: { id: string; name: string; domain: string }[]; problem?: string }
}
/** `expired` is true only for a real, unused link of the asked kind that has run out. The server never
 *  sends `email` or `firstName` today: which address a link is for is a privacy decision for Hafsah. */
export interface ValidateTokenResponse { valid: boolean; expired?: boolean; email?: string; firstName?: string }


export interface WaitingAtTheDoor {
  id: string
  email: string
  name: string | null
  waitingSince: string
  /** Who added them. Named, because "somebody added them" is not something an admin can act on. */
  addedBy: string | null
  forCheckIn: string | null
  /**
   * Whether this person's own address belongs to the organisation (B-096). The heading above the
   * list used to say "People from outside <organisation>" no matter who was on it; Halima Yusuf,
   * on Msingi Foods' own address, was invited to a check-in and still read as if she were from
   * outside. Optional because an older server may not send it yet.
   */
  onTheOrganisationsOwnAddress?: boolean
}

/** "Fewer than 20" or "20 or more": what they chose, and the line they were shown. */
export type TeamSizeSaid = { said: 'fewer' | 'more'; line: number }

/** What "Where do you work?" offers (U.3). No head counts. */
export interface WhereCanIJoin {
  /** True only while the person belongs nowhere yet but an organisation just made for them (U.4 review). */
  nowhereYet?: boolean
  byDomain: { id: string; name: string; domain: string }[]
  asAGuest: { organisationName: string; checkInName: string; invitePath: string }[]
}

/** What the person waiting to be let in reads about their own request (U.3). */
export type MyWaiting =
  | { waiting: false }
  | {
      waiting: true
      organisationName: string
      askedAt: string
      /** Named only after a real invitation. */
      admin: { name: string; firstName: string } | null
      inviterFirstName: string | null
      canRemindFrom: string
      /** The true reason, when it is this: the plan has no free seat, not that this person is a stranger. */
      heldForASeat?: boolean
      /** The whole sentence the server chose for the true reason: no free seat, the organisation's own address, or from outside (B-096). */
      says?: string
    }

export const authApi = {
  /* No `requestMagicLink`. It called /auth/register-magic-link, which creates accounts, and its only
     caller was the resend on "Check your email", where it failed for every existing account and wiped
     a waiting sign-up's typed name. The resend goes through entrySave now. U.2. */

  memberSignin: (email: string) =>
    apiClient.post<MagicLinkResponse>('/auth/member-signin', { email }).then(r => r.data),

  /* With a choice only on "Where do you work?" before the account exists (U.3 review). */
  /* `passwordKey`: the key this browser was given with a password chosen at sign-up (the-password-key.ts). */
  verifyEmail: (token: string, choice?: { joinOrganizationId: string } | { createMyOwn: true }, passwordKey?: string) =>
    apiClient.post<VerifyEmailResponse | WhereDoYouWorkFirst>('/auth/verify-email', { token, ...(choice ?? {}), ...(passwordKey ? { passwordKey } : {}) }).then(r => r.data),

  setPassword: (token: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/set-password', { token, password }).then(r => r.data),

  resetPassword: (token: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/reset-password', { token, password }).then(r => r.data),

  me: () =>
    apiClient.get<User>('/auth/me').then(r => r.data),

  updateProfile: (body: {
    firstName?: string; lastName?: string; jobTitle?: string;
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
  /* `password` only when the person chose one at sign-up (U.2). The server uses it only for an
     address with no account, and answers the same either way. */
  /* `next`: where in the app they were going, such as an organisation's invite link. The server keeps
     it with the link and hands it back when the link is opened (U.3 review). */
  entrySave: (email: string, draft?: { payload?: Record<string, unknown>; history?: unknown[] }, hp?: string, password?: string, next?: string | null) =>
    apiClient.post<MagicLinkResponse & { draftToken?: string; passwordKey?: string; removedSays?: string }>('/auth/entry-save', { email, draft, ...(hp ? { _hp: hp } : {}), ...(password ? { password } : {}), ...(next ? { next } : {}) }).then(r => r.data),

  requestPasswordSetup: () =>
    apiClient.post<{ token: string }>('/auth/request-password-setup').then(r => r.data),

  login: (email: string, password: string) =>
    apiClient.post<VerifyEmailResponse>('/auth/login', { email, password }).then(r => r.data),

  /**
   * Whether a link from an email still works, before anybody types into the page it opened. The
   * server may say whose address the link is for (the reset page shows it); when it does not, the
   * page says nothing about the address.
   */
  validateToken: (token: string, type: 'PASSWORD_RESET' | 'PASSWORD_SETUP' | 'EMAIL_VERIFICATION') =>
    apiClient.get<ValidateTokenResponse>('/auth/validate-token', { params: { token, type } }).then(r => r.data),

  forgotPassword: (email: string) =>
    apiClient.post<MagicLinkResponse>('/auth/forgot-password', { email }).then(r => r.data),

  /**
   * Colleagues already in the organisation, for adding to a check-in without typing: id, name, role
   * and team, never an address (U.4). A guest gets only the people on their own check-ins here.
   */
  colleagues: () =>
    apiClient.get<{ id: string; name: string; role: string; team: string | null }[]>('/users/colleagues').then(r => (Array.isArray(r.data) ? r.data : [])),
  teamInvite: (email: string) =>
    apiClient.post<{ message: string }>('/auth/team-invite', { email }).then(r => r.data),

  setEmailNotifications: (enabled: boolean) =>
    apiClient.patch<User>('/auth/me', { emailNotifications: enabled }).then(r => r.data),

  setPhoneNumber: (phoneNumber: string | null) =>
    apiClient.patch<User>('/auth/me', { phoneNumber }).then(r => r.data),

  /** "Almost in" (U.3): my own request to be let into an organisation, if I am waiting. */
  myWaiting: () =>
    apiClient.get<MyWaiting>('/users/me/waiting').then(r => r.data),
  /** "Remind Grace". Once a day, enforced on the server. */
  remindAboutMyWaiting: () =>
    apiClient.post<{ reminded: true; canRemindFrom: string }>('/users/me/waiting/remind').then(r => r.data),

  leaveOrg: () =>
    apiClient.post<{ left: boolean }>('/users/me/leave').then(r => r.data),

  /**
   * An org is named from the email address when nobody was asked - and until
   * now nobody could correct it, though the name is on every page the team
   * sees. Admin only, server-enforced.
   */
  renameOrganization: (name: string, more?: { billingEmail?: string; teamSize?: TeamSizeSaid }) =>
    apiClient.patch<{ id: string; name: string }>('/users/organization', { name, ...(more ?? {}) }).then(r => r.data),

  /**
   * "CREATE AN ORGANISATION" (U.3). Makes it, makes you its owner, and returns a token scoped to it,
   * exactly like a switch. The server keeps the rule of one organisation of your own for now.
   */
  createOrganisation: (what: { name: string; billingEmail?: string; teamSize?: TeamSizeSaid }) =>
    apiClient
      .post<{ accessToken: string; user: any; organization: { id: string; name: string; slug: string } }>(
        '/auth/organizations',
        what,
      )
      .then(r => r.data),

  /**
   * WHO IS WAITING TO BE LET INTO THIS ORGANISATION.
   *
   * Adding an address to a check-in used to make it a member here the moment they accepted, with
   * no approval and nobody asked - and because a seat is any active user, on the bill at the same
   * time. Somebody from outside is queued now, holds no seat, and cannot check in until an admin
   * answers. This is that queue, and the answer.
   */
  whoIsWaiting: () =>
    apiClient.get<WaitingAtTheDoor[]>('/users/waiting').then(r => (Array.isArray(r.data) ? r.data : [])),

  /**
   * THE OTHER QUEUE AT THE SAME DOOR: people a lead has added to a check-in with no seat for them.
   * Separate from the one above on purpose - a membership request is a judgement about a person,
   * this is a purchase - and answered by making room rather than by saying yes.
   */
  /**
   * NIGHT NOTE ITEM 3 (B-129): A ROW CAN NOW BE A BARE INVITATION, NOT JUST A PARTICIPANT ON A
   * CHECK-IN WITH NO SEAT. `kind: 'INVITATION'` (id like `invite:<address>`) is one of the people
   * kept by a paste with no seat on the plan - never added to any check-in, so `forCheckIn` is
   * null for them. `saying` is the server's own sentence for the row, true for either kind; drawn
   * instead of a sentence this client would otherwise have to build itself and might get wrong for
   * a kind it does not know about.
   */
  waitingForASeat: () =>
    apiClient.get<{ id: string; email: string; name: string | null; addedBy: string | null; forCheckIn: string | null; waitingSince: string; saying: string; kind?: 'INVITATION' }[]>('/users/waiting/seats').then(r => (Array.isArray(r.data) ? r.data : [])),

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

  /** The organisation name suggested from an address at sign-up. The public-mail list is the server's. */
  nameFromAddress: (email: string) =>
    apiClient.get<{ name: string | null }>('/auth/name-from-address', { params: { email } }).then(r => r.data),

  /** "Where do you work?" (U.3): organisations to join by email domain, and invitations for this address. */
  whereCanIJoin: () =>
    apiClient.get<WhereCanIJoin>('/auth/where-can-i-join').then(r => r.data),
  /** "Join": by email domain. Returns a token scoped to it, like a switch. */
  joinByDomain: (organizationId: string) =>
    apiClient
      .post<{ accessToken: string; user: any; organization: { id: string; name: string; slug: string } }>('/auth/join-by-domain', { organizationId })
      .then(r => r.data),

  /** The organisations this person belongs to, with the active one marked. */
  myOrganizations: () =>
    apiClient
      .get<{ id: string; name: string; slug: string; role: string; active: boolean; joinedHow?: 'list' | 'domain' | 'link' | null }[]>(
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
