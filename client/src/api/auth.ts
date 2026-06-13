import { apiClient } from './client'
import type { User } from '@/types'

export interface MagicLinkResponse { message: string; email: string }
export interface VerifyEmailResponse { accessToken: string; user: User }
export interface ValidateTokenResponse { valid: boolean; email?: string; firstName?: string }

export interface MagicLinkBody {
  organizationName: string
  firstName: string
  lastName: string
  email: string
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
}
