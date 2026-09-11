import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { MARKETING_URL } from '@/lib/marketing'
import { toast } from 'sonner'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'

export function OrgSetupPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const org = user?.organization

  const [orgName, setOrgName] = useState(org?.name ?? user?.organizationName ?? '')
  const [orgEmail, setOrgEmail] = useState(org?.email ?? '')

  const saveMut = useMutation({
    mutationFn: () => authApi.updateProfile({ orgName: orgName.trim(), orgEmail: orgEmail.trim() }),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success('Organisation details saved')
      navigate('/grounds', { replace: true })
    },
    onError: () => toast.error('That did not save. Everything you entered is still here — check the details and try again.'),
  })

  function handleSave() {
    /* The organisation's contact address is optional (F6): nothing mails it, and Stripe asks for one at checkout if it is empty. */
    if (!orgName.trim() || (orgEmail.trim() && !looksLikeAnAddress(orgEmail))) return
    saveMut.mutate()
  }

  /*
   * NAVIGATING DURING RENDER IS A BUG, and this one was logging "Cannot update a component while
   * rendering a different component" on every visit. An effect is where a redirect belongs.
   */

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/*
        * THE HEADER EVERY OTHER STANDALONE SCREEN HAS.
        *
        * `/org/setup` is in AppShell's CHROMELESS list, whose own comment says those pages are
        * "written as a standalone screen with its own header and its own way back". This one had
        * neither: no rail, no header, no back, no sign out. Nothing on the page went anywhere, and
        * every signed-in route sends an admin here until it is filled in.
        */}
      <div style={{ background: 'var(--gw-navy)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
        </div>
        <a href={MARKETING_URL} style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', textDecoration: 'none' }}>Back</a>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
          Set up your organisation
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.6 }}>
          A few details before your team can start check-ins. Asked once, and you can change both later
          in Settings.
        </p>

        <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '24px 22px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 6 }}>
            Organisation name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            placeholder="Acme Inc."
            style={{
              width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-border)',
              borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 18,
              boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 6 }}>
            Organisation contact email
          </label>
          <input
            type="email"
            value={orgEmail}
            onChange={e => setOrgEmail(e.target.value)}
            placeholder="hello@acme.com"
            style={{
              width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-border)',
              borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 22,
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleSave}
            disabled={saveMut.isPending || !orgName.trim() || !looksLikeAnAddress(orgEmail)}
            style={{
              width: '100%', padding: '11px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: saveMut.isPending || !orgName.trim() || !looksLikeAnAddress(orgEmail) ? 0.5 : 1,
            }}
          >
            {saveMut.isPending ? 'Saving…' : 'Continue'}
          </button>

          {/*
            * THE OTHER REASON SOMEBODY IS HERE, AND THE DOOR IT NEEDED.
            *
            * This page assumes everybody reaching it means to create an organisation. Somebody
            * invited into a colleague's check-in reached it too - signing up provisions an
            * organisation and makes you its admin, so they were an admin of an empty workspace
            * they never asked for, being asked to name a company to join a check-in.
            *
            * `mustSetUpOrganisation` stops most of that now: anybody who belongs somewhere else is
            * no longer sent here at all. This is for the case that remains - the invitation was
            * never accepted, so there is no membership yet and nothing to switch to. `/join` has
            * existed the whole time and nothing anywhere linked to it.
            */}
          <button
            onClick={() => navigate('/join')}
            style={{
              display: 'block', margin: '18px auto 0', background: 'none', border: 'none',
              color: 'var(--gw-navy)', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
              textDecoration: 'underline', fontWeight: 600,
            }}
          >
            Joining a team that already uses Groundwork? Open your invitation
          </button>

          {/*
            * A WAY OUT OF A PAGE THAT HAS NONE. Reported: "this page doesn't have a back button".
            *
            * A back button is the wrong answer and would have made it worse: every signed-in route
            * sends an admin without an organisation email straight back here, so Back would have
            * been a loop with a different label on it. Signing out is the only exit that actually
            * exits, and until now the page offered neither.
            */}
          <button
            onClick={() => { logout(); navigate('/auth', { replace: true }) }}
            style={{
              display: 'block', margin: '14px auto 0', background: 'none', border: 'none',
              color: 'var(--gw-sub)', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Sign out instead
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
