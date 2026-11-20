import { apiClient } from '@/api/client'

/**
 * SERVES PAYLOADS THROUGH THE REAL API CLIENT (so the normaliser at its boundary runs, as it does
 * in the browser). `routes` maps a path (the part after /api/v1, no query) to the payload to answer
 * with; any path not listed answers 404, as a server does for something that is not there.
 * Returns what was asked, so a test can read it.
 */
export function serveThroughTheClient(routes: Record<string, unknown>) {
  const asked: string[] = []
  apiClient.defaults.adapter = async (config) => {
    const path = String(config.url ?? '').split('?')[0]
    asked.push(path)
    if (!(path in routes)) {
      return Promise.reject(Object.assign(new Error('404'), { config, response: { status: 404, data: { message: 'not here' }, config, headers: {}, statusText: 'Not Found' } }))
    }
    const response = { data: structuredClone(routes[path]), status: 200, statusText: 'OK', headers: {}, config }
    return response as any
  }
  return asked
}
