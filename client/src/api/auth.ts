import { apiClient } from './client'
import type { User } from '@/types'

export interface AuthResponse { accessToken: string; user: User }

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (data: { organizationName: string; firstName: string; lastName: string; email: string; password: string }) =>
    apiClient.post('/auth/register', data).then((r) => r.data),
  verifyEmail: (token: string) =>
    apiClient.post<AuthResponse>('/auth/verify-email', { token }).then((r) => r.data),
  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }).then((r) => r.data),
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  setPassword: (token: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/set-password', { token, password }).then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }).then((r) => r.data),
  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),
  validateOrgCode: (code: string) =>
    apiClient.get<{ valid: boolean; orgName: string }>(`/auth/org/${code}`).then((r) => r.data),
  setPin: (data: { pin: string; orgCode: string }) =>
    apiClient.post<AuthResponse>('/auth/set-pin', data).then((r) => r.data),
  pinLogin: (data: { pin: string; orgCode: string }) =>
    apiClient.post<AuthResponse>('/auth/pin-login', data).then((r) => r.data),
  createOrg: (data: { name: string; type: string }) =>
    apiClient.post<{ orgCode: string }>('/auth/create-org', data).then((r) => r.data),
}
