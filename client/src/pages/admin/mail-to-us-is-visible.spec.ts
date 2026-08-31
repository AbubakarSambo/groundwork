import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * AN ENDPOINT WITH NO TAB IS AN ENDPOINT NOBODY READS.
 *
 * `hello@myground.work` is on the marketing site, in the footer, and beside "Ask about Guided" on
 * the pricing page. It reached one person's inbox: invisible to everybody else, unanswerable if she
 * were away. Storing it server-side changes nothing on its own.
 */
const PAGE = readFileSync(join(__dirname, 'AdminPage.tsx'), 'utf8')
const API = readFileSync(join(__dirname, '..', '..', 'api', 'admin.ts'), 'utf8')

describe('mail sent to us is visible to us', () => {
  it('has a tab of its own', () => {
    expect(PAGE).toContain("{ id: 'inbox',    label: 'Inbox' },")
    expect(PAGE).toMatch(/type Tab =[^\n]*'inbox'/)
  })

  it('renders it, rather than only fetching it', () => {
    expect(PAGE).toContain("{tab === 'inbox' && !inboxLoading && inbox && (")
    expect(PAGE).toContain('<InboxTab')
  })

  it('reads the endpoint that exists', () => {
    expect(API).toContain("apiClient.get<{ messages: InboundMessage[]; unread: number }>('/admin/inbox')")
  })

  it('sits above Feedback, because somebody is waiting on an answer', () => {
    expect(PAGE.indexOf("id: 'inbox'")).toBeLessThan(PAGE.indexOf("id: 'feedback'"))
  })

  it('is fetched fresh enough to matter', () => {
    /* A five minute cache on a prospect's email is a five minute delay before anybody sees it. */
    const block = PAGE.slice(PAGE.indexOf("queryKey: ['platform-inbox']"))
    expect(block.slice(0, 400)).toContain('staleTime: 30 * 1000')
  })
})

describe('and it stays a list, not a mail client', () => {
  const TAB = PAGE.slice(PAGE.indexOf('function InboxTab'), PAGE.indexOf("type Tab = 'system'"))

  it('never renders a sender\'s markup', () => {
    /* The HTML is not even stored. Nothing here reintroduces it. */
    expect(TAB).not.toContain('dangerouslySetInnerHTML')
  })

  it('replies through real mail rather than growing a composer', () => {
    expect(TAB).toContain('href={`mailto:${m.fromAddress}')
    for (const mailClient of ['<textarea', 'onReply', 'sendReply', 'thread']) {
      expect(TAB).not.toContain(mailClient)
    }
  })

  it('says what an empty inbox means rather than only that it is empty', () => {
    /* "Nothing yet" over a feature that is not forwarding yet is a lie of omission. */
    expect(TAB).toContain('once Resend is forwarding it')
  })

  it('shows unread without hiding read ones', () => {
    /* A message somebody read is still the one that might need answering. */
    expect(TAB).toContain('unread of')
    expect(TAB).not.toContain('filter(m => !m.readAt)')
  })
})

/* -------------------------------------------------------------------------- */

describe('the destructive half of the back office is reachable', () => {
  /**
   * `/admin/dashboard` holds the OTP-gated actions - adding a platform admin among them - and
   * NOTHING linked to it. The button had been built and worked; the only way to reach it was to
   * know the URL. So the way to make somebody a super admin was to ask for a database write.
   */
  it('the ops panel links to it', () => {
    expect(PAGE).toContain("navigate('/admin/dashboard')")
    expect(PAGE).toContain('Admins and codes')
  })

  it('and the way back exists, so it is not a dead end', () => {
    const DASH = readFileSync(join(__dirname, 'AdminDashboardPage.tsx'), 'utf8')
    expect(DASH).toContain("navigate('/admin')")
  })

  it('adding an admin still needs an OTP, which is the point of it living there', () => {
    const DASH = readFileSync(join(__dirname, 'AdminDashboardPage.tsx'), 'utf8')
    expect(DASH).toContain("'X-Admin-OTP': otp")
    expect(DASH).toContain('addAdmin: (email: string, otp: string)')
  })
})
