import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

declare module 'axios' {
  export interface AxiosRequestConfig {
    // Set on requests where a 404 is an expected, caller-handled outcome
    // (e.g. polling for a report that may not be synthesised yet) - skips
    // the global toast so the caller's own fallback UI isn't undercut by it.
    skipNotFoundToast?: boolean
    /**
     * For calls whose own error handling names what did and did not survive. Without it, one
     * failed rename produced two notifications: the useful sentence and "Something went wrong".
     */
    skipServerErrorToast?: boolean
    /**
     * For calls where a 403 is an expected answer rather than a failure - e.g.
     * asking whether the viewer is a party to this ground. Without it, a page
     * that merely ASKS the question pops "Access denied" at someone who did
     * nothing wrong.
     */
    skipForbiddenToast?: boolean
  }
}

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
      const authEndpoints = ['/auth/register-magic-link', '/auth/login', '/auth/validate-token']
      const isAuthEndpoint = authEndpoints.some(ep => url.includes(ep))
      // /enter and /pin were the org-code model's pages and are deleted - somebody
      // belonging to more than one organisation now picks one from the rail instead.
      /* "You're signed out" too: it has just ended the session itself, so a request still in flight
         that comes back 401 there is not somebody timing out, and must not replace the page with
         "you were signed out because you had been away". U.2. */
      const onAuthPage = ['/auth', '/signout'].some(p => window.location.pathname.startsWith(p))
      if (!onAuthPage && !isAuthEndpoint) {
        /*
         * TO SIGN-IN, WITH WHERE THEY WERE — NOT OFF THE PRODUCT.
         *
         * This sent them to `/`, and `/` bounces a signed-out visitor to the marketing site. So a
         * token expiring in the middle of a check-in did not read as "sign in again": the tab left
         * the product entirely, landed on a page selling it, and nothing said why or offered a way
         * back to the conversation they were in the middle of.
         *
         * `next` is the parameter AuthPage already reads, so signing in returns them to the page
         * they lost. `why` is what lets it say so rather than looking like an ordinary sign-in.
         */
        useAuthStore.getState().logout()
        const wasAt = window.location.pathname + window.location.search
        const goingHome = wasAt === '/' || wasAt.startsWith('/auth')
        window.location.href = goingHome
          ? '/auth?why=session-expired'
          : `/auth?why=session-expired&next=${encodeURIComponent(wasAt)}`
      }
      return Promise.reject(error)
    }

    /* The back office door: the page draws it, a toast would only be noise on top. */
    const shutDoor = error.response?.status === 403 && (error.response?.data as { code?: string } | undefined)?.code === 'BACK_OFFICE_CODE_REQUIRED'
    /*
     * THE ONLY THREE STRINGS IN THE CLIENT WRITTEN IN HTTP, AND THEY FIRE ON EVERY PAGE.
     *
     * "Access denied" is a security system rebuffing an intruder; "Not found" and "Server error"
     * are status codes read aloud. Everywhere else this product says what happened and what is
     * safe - "That did not send. Nothing has changed, try again." These three were the fallback
     * behind all of it, so the worst-written sentences were the ones a person met most often.
     */
    if (error.response?.status === 403 && !error.config?.skipForbiddenToast && !shutDoor) {
      toast.error('That one is not yours to open', {
        description: 'If you think it should be, whoever runs this check-in can let you in.',
      })
    } else if (error.response?.status === 404 && !error.config?.skipNotFoundToast && !window.location.pathname.startsWith('/release-4-preview')) {
      /* (Release 4's preview draws a hand-written test organisation that the server does not hold, so its lookups are not this message's.) */
      toast.error('That is not here any more', {
        description: message,
      })
    } else if (error.response?.status === 422 || error.response?.status === 400) {
      // Validation errors - let the form handle them
    } else if (error.response?.status && error.response.status >= 500 && !error.config?.skipServerErrorToast) {
      /* `skipServerErrorToast`, like the two above: a caller that says something specific about
         what did and did not survive should not be followed by "Something went wrong". */
      toast.error('That did not go through', {
        description: 'Nothing you typed is lost. Try again in a moment.',
      })
    }

    return Promise.reject(error)
  }
)

export default apiClient
