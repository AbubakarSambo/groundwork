import { describe, it, expect } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './client'

/**
 * A FILE SENT IS STILL A FILE (release test, 21 November 2026, bug 51). Amani chose a real PDF as her CV and read "A CV has to be
 * a PDF or a Word file". The shared client carried a JSON Content-Type by default, and axios turns a FormData into JSON under that
 * header, so the file never reached the server. This runs the client's own request handling (only the network is replaced) and
 * reads what would go over the wire.
 */
async function whatIsSent(data: unknown): Promise<{ body: unknown; contentType: string | undefined }> {
  let seen: InternalAxiosRequestConfig | undefined
  await apiClient.post('/person-details/u-amani/cv', data, {
    adapter: async (config) => { seen = config; return { data: {}, status: 200, statusText: 'OK', headers: {}, config } },
  })
  return { body: seen!.data, contentType: String(seen!.headers.getContentType() ?? '') || undefined }
}

describe('what the client sends', () => {
  it('sends a CV chosen as a PDF as the file itself, not as JSON', async () => {
    const form = new FormData()
    form.append('file', new File(['%PDF-1.4'], 'Amani Wekesa CV.pdf', { type: 'application/pdf' }))
    const { body, contentType } = await whatIsSent(form)
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBeInstanceOf(File)
    expect(((body as FormData).get('file') as File).type).toBe('application/pdf')
    expect(String(contentType ?? '')).not.toContain('application/json')
  })

  it('still sends a plain object as JSON', async () => {
    const { body, contentType } = await whatIsSent({ name: 'Esther Wanjiku', phone: '+254 712 345 678' })
    expect(body).toBe('{"name":"Esther Wanjiku","phone":"+254 712 345 678"}')
    expect(String(contentType)).toContain('application/json')
  })
})
