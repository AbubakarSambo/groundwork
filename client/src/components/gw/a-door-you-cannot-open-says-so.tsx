import { ReactNode, useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui'

/**
 * A ROUTE SOMEBODY MAY NOT USE HAS TO REFUSE AT THE DOOR.
 *
 * `/grounds/new` and `/org/members` were behind `RequireOrgSetup` and nothing else, so anybody who
 * typed the address - or followed a link, or had the button shown to them by a bug - got the whole
 * eight-step flow and was refused on submit. The server refusal was correct every time. That is not
 * the same as this being handled: filling in eight steps and being turned away at the end teaches
 * somebody the product is broken, where being told at the door teaches them the setting is
 * deliberate and who can change it.
 *
 * IT SAYS WHY, AND WHO CAN CHANGE IT. A refusal with no next step reads as a fault. Not being able
 * to open a check-in is a setting somebody chose, and it says nothing about the person - so the
 * wording is flat, names the setting, and points at the person who can change it.
 *
 * NEVER THE ONLY CHECK. Every one of these routes is refused again by the API on the request
 * itself. This is a courtesy to the person, not a permission - a client-side gate protects nobody
 * and has never been asked to.
 */
export function ADoorYouCannotOpen({
  may,
  what,
  children,
}: {
  /** Whether this person may use what is behind the door. */
  may: boolean
  /** What they were trying to do, in their words rather than the route's. */
  what: 'open a check-in' | 'add people to your organisation' | 'connect your systems' | 'connect your organisation’s WhatsApp number' | 'open People' | 'open Plan and billing'
  children: ReactNode
}) {
  const navigate = useNavigate()
  /* Request 225 (c): the API now serves one admin's name, and only the name, to anybody signed in
     (GET /users/an-admin), so the admin's page's door names who can change it. */
  const asksForAnAdmin = !may && (what === 'open People' || what === 'open Plan and billing')
  const [adminName, setAdminName] = useState<string | null>(null)
  useEffect(() => {
    if (!asksForAnAdmin) return
    let live = true
    apiClient.get('/users/an-admin')
      .then((r: any) => { const n = (r?.data?.data ?? r?.data)?.name; if (live && typeof n === 'string' && n.trim()) setAdminName(n.trim()) })
      .catch(() => undefined)
    return () => { live = false }
  }, [asksForAnAdmin])
  if (may) return <>{children}</>

  /*
   * THE PEOPLE PAGE (U.4 review), AND PLAN AND BILLING (B-216, the same shape: "You need admin
   * access to manage billing for your organisation." was a dead end, nothing to press). Neither is
   * a setting somebody chose, so neither says it is one: each is an admin's page because of the
   * person's role here, and an admin can change that role.
   */
  if (what === 'open People' || what === 'open Plan and billing') {
    const thing = what === 'open People' ? 'People' : 'Plan and billing'
    return (
      <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', margin: '0 0 10px' }}>
          Only an admin can open {thing}.
        </h1>
        {/*
          B-216 (REVIEW 4): NAMES, NOT LABELS - BUT NO ADMIN'S NAME REACHES THIS READER.

          This door is reached before the page behind it (OrgMembersPage.tsx / BillingPage.tsx) ever
          mounts, so only what `useAuthStore`'s own `user` already carries is in reach - checked
          here: `user.organization.email` is the organisation's own contact address, not any one
          admin's; nothing on `User` or `UserOrganization` (src/types/index.ts) names an admin. The
          one endpoint that does, `GET /users/organization/owner` (used by OrgMembersPage.tsx
          itself), answers 403 for anybody who is not already an admin - checked live, signed in as
          Dov (a member): "Only an admin can do this." A client-side call to it here would only ever
          fail for the reader this sentence is for. The same gap
          `the-plan-limit-notice-fits-the-reader.tsx` already documents for Plan and billing's other
          door: once the engine serves an admin's name to a reader who is not one, this reads their
          name instead of "an admin"; until then the sentence stays as the server's own words, true
          for everybody who reads it.
        */}
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, margin: '0 0 20px' }}>
          {adminName
            ? `Your role here is not an admin’s. ${adminName} is an admin here and can change it.`
            : 'Your role here is not an admin’s. An admin can change it.'}
        </p>
        {/*
          B-216: BillingPage.tsx (a rebuilt page) now imports this file directly, so nothing in it
          may use an old part any more (the-rebuilt-pages-use-only-the-new-parts.spec.ts checks one
          import deep) - every "Back to your check-ins" button in this file is now the shared
          `Button` part instead of the old `gw-btn` class, not only this one.
        */}
        <Button onClick={() => navigate('/grounds')}>Back to your check-ins</Button>
      </div>
    )
  }

  /*
   * SCREEN FAULT 6: "YOU CANNOT CONNECT YOUR SYSTEMS HERE... THIS IS A SETTING, NOT ANYTHING
   * ABOUT YOU" DID NOT SAY WHAT A MEMBER COULD ACTUALLY DO. Vague on both ends: "your systems"
   * named nothing a member reading /settings/whatsapp would recognise as theirs, and "this is a
   * setting" answered a question nobody asked instead of saying what is still open to them. Said
   * plainly instead, the same shape as "open People" just above: who can do it, and what the
   * reader can still do themselves.
   */
  if (what === 'connect your organisation’s WhatsApp number') {
    return (
      <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', margin: '0 0 10px' }}>
          Only an admin can connect your organisation’s WhatsApp number.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, margin: '0 0 20px' }}>
          You can still answer your check-ins here.
        </p>
        <Button onClick={() => navigate('/grounds')}>Back to your check-ins</Button>
      </div>
    )
  }

  return (
    <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', margin: '0 0 10px' }}>
        You cannot {what} here
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, margin: '0 0 8px' }}>
        {what === 'open a check-in'
          ? 'Opening a check-in is limited to people your admin has named. You can still take part in any check-in somebody adds you to.'
          : what === 'connect your systems'
          ? 'Connecting your organisation’s systems is something its admins do.'
          : 'Adding people is something your organisation’s admins do.'}
      </p>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, margin: '0 0 20px' }}>
        {/* Not a judgement, and said so plainly: a setting, and a person who can change it. */}
        This is a setting, not anything about you. An admin can change it.
      </p>
      <Button onClick={() => navigate('/grounds')}>Back to your check-ins</Button>
    </div>
  )
}
