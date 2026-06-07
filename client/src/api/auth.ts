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
  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),
}
