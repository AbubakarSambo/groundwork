import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A REQUEST NOBODY READS IS A REQUEST NOBODY MADE.
 *
 * Coaching, setup help and integration support are the same request with a different subject:
 * somebody asks, our team rings back, and what they agree is invoiced by hand. There is one queue
 * for all of them, because a second one is a queue nobody opens - which is exactly what happened to
 * the mail at hello@ for months.
 */
const PAGE = readFileSync(join(__dirname, 'AdminPage.tsx'), 'utf8')
const API = readFileSync(join(__dirname, '..', '..', 'api', 'admin.ts'), 'utf8')
const BILLING = readFileSync(join(__dirname, '..', 'billing', 'BillingPage.tsx'), 'utf8')
const CONNECT = readFileSync(join(__dirname, '..', 'org', 'IntegrationsPage.tsx'), 'utf8')

describe('every call somebody asked for is in one place', () => {
  it('has a tab on the ops page', () => {
    expect(PAGE).toContain("{ id: 'calls',    label: 'Call requests' },")
    expect(PAGE).toMatch(/type Tab =[^\n]*'calls'/)
  })

  it('renders them, rather than only fetching them', () => {
    expect(PAGE).toContain("{tab === 'calls' && !callsLoading && calls && (")
    expect(PAGE).toContain('<CallRequestsTab')
  })

  it('reads the endpoint that exists', () => {
    expect(API).toContain("apiClient.get<{ requests: CallRequestRow[] }>('/admin/call-requests')")
  })

  it('says what each call is about, so nobody rings back blind', () => {
    const TAB = PAGE.slice(PAGE.indexOf('const WHAT_IT_IS_ABOUT'), PAGE.indexOf('type Tab ='))
    for (const subject of ['COACHING', 'HANDS_ON', 'INTEGRATION', 'CALL']) {
      expect(TAB).toContain(`${subject}:`)
    }
  })

  it('shows whether they pay us, and gates nothing on it', () => {
    const TAB = PAGE.slice(PAGE.indexOf('const WHAT_IT_IS_ABOUT'), PAGE.indexOf('type Tab ='))
    expect(TAB).toContain('Free plan')
    /* The list is never filtered by it: a free-plan request is the one most likely to convert. */
    expect(TAB).not.toMatch(/filter\([^)]*paying/)
  })
})

describe('and it is asked for where the question comes up', () => {
  it('Connect asks about integration, through the one access request', () => {
    /* 10 Sep 2026: the separate "Ask for a call" went. Asking for access IS the integration call:
       the credentials controller raises it with subject INTEGRATION when the request is recorded. */
    const CREDENTIALS = readFileSync(join(__dirname, '../../../../api/src/modules/public-api/credentials.controller.ts'), 'utf8')
    expect(CREDENTIALS).toContain("'INTEGRATION'")
    expect(CONNECT).not.toContain('Ask for a call')
  })

  it('Billing asks about coaching and setup', () => {
    expect(BILLING).toContain("subject: 'COACHING'")
    expect(BILLING).toContain("subject: 'HANDS_ON'")
  })

  it('neither offers to charge a card for them', () => {
    /* Each is a person's time, priced from rather than at. A buy button would be a lie. */
    for (const src of [BILLING, CONNECT]) {
      const block = src.slice(src.indexOf('call-request'))
      expect(block.slice(0, 3000)).not.toMatch(/checkout|stripe|Subscribe/i)
    }
  })

  it('and each button tracks its own subject, not one shared flag', () => {
    /* Asking about a coach must not make the setup button claim it was already asked. */
    expect(BILLING).toContain('open[r.subject]')
  })
})
