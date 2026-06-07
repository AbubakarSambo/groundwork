import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

// In production, use VITE_API_URL env var; in dev, use proxy
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - unwrap envelope and handle errors
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.success === true && 'data' in response.data) {
      response.data = response.data.data
    }
    return response
  },
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const message = error.response?.data?.message || 'An error occurred'
    
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      const authEndpoints = ['/auth/login', '/auth/verify-email', '/auth/set-password', '/auth/resend-verification']
      const isAuthEndpoint = authEndpoints.some(ep => url.includes(ep))
      // Only redirect if not on login/auth pages (to preserve form state on failed login)
      if (!window.location.pathname.includes('/login') && !isAuthEndpoint) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (error.response?.status === 403) {
      toast.error('Access denied', {
        description: 'You do not have permission to perform this action',
      })
    } else if (error.response?.status === 404) {
      toast.error('Not found', {
        description: message,
      })
    } else if (error.response?.status === 422 || error.response?.status === 400) {
      // Validation errors - let the form handle them
    } else if (error.response?.status && error.response.status >= 500) {
      toast.error('Server error', {
        description: 'Something went wrong. Please try again later.',
      })
    }

    return Promise.reject(error)
  }
)

export default apiClient
