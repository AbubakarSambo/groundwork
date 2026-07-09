import { apiClient } from './client'
import type { User } from '@/types'

export interface MagicLinkResponse { message: string; email: string }
export interface VerifyEmailResponse { accessToken: string; user: User }
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

  entrySave: (email: string) =>
    apiClient.post<MagicLinkResponse>('/auth/entry-save', { email }).then(r => r.data),

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

  leaveOrg: () =>
    apiClient.post<{ left: boolean }>('/users/me/leave').then(r => r.data),
}
