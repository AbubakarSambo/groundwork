import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/** A heading above an empty box reads as the product having lost the answers. Either a sentence, or no heading - never a heading alone. And one status in a header, not three. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (rel: string) => strip(readFileSync(path.join(__dirname, rel), 'utf8'))

describe('empty sections', () => {
  it('the session report says the report is still being written instead of showing an empty box', () => {
    expect(read('report/SessionReportPage.tsx')).toContain('Your report is still being written. Your answers are saved; this fills in as soon as it is ready.')
  })
  it('the keys list says when there are none, as the deliveries list beside it does', () => {
    expect(read('org/IntegrationsPage.tsx')).toContain('No keys yet. Issue one above for the system you are connecting; it is shown once.')
  })
  it('the "About this check-in" heading is gated with the brief it heads', () => {
    const chat = read('../components/gw/GroundChat.tsx')
    const heading = chat.indexOf('About this check-in')
    const gate = chat.lastIndexOf('{brief && (', heading)
    expect(gate).toBeGreaterThan(-1)
    expect(heading - gate).toBeLessThan(400)
  })
})

describe('one status, not three', () => {
  it('the attention line has precedence; the report state speaks next; "No report yet" only when neither has anything to say', () => {
    const admin = read('grounds/GroundAdminPage.tsx')
    expect(admin).toMatch(/const attention = railAttention\(ground as any, user\?\.id\)/)
    expect(admin).toMatch(/\(reportState === 'no report yet' && attention\.kind === 'none'\)\s*\? <div[^>]*>No report yet<\/div>\s*: null/)
    expect(admin).toContain('const a = attention')
    expect(admin.match(/railAttention\(ground as any, user\?\.id\)/g)?.length).toBe(1)
  })
})
