import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useYourOrganisations } from '@/components/gw/your-organisations'
import { Button } from '@/components/gw/kit'
import { AuthCard, AuthError } from '@/pages/auth/auth-kit'

/**
 * AN ORGANISATION'S OWN INVITE LINK (A3, #/j/baridi). The words are j-baridi.txt's, with three
 * changes said here:
 *
 *   - "27 people there use Groundwork" drops the head count: "People there use Groundwork ...".
 *   - "Join with your work email or Google" says "email", as the account cards do (Hafsah, U.2), and
 *     mentions Google only when Google sign-in is switched on.
 *   - With nobody to name (the admin who shared it has left), the heading is "You're invited to
 *     <organisation>".
 *
 * Joining gives "Takes part" (Hafsah, 26 September), through the plan's seat check, on the server.
 */
type Preview = { open: false } | { open: true; organisationName: string; inviterName: string | null }

export function JoinByLinkPage() {
  const { code = '' } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const signedIn = useAuthStore(s => s.isAuthenticated)
  const setAuth = useAuthStore(s => s.setAuth)
  /* B-206 (review round 2): every organisation this person belongs to, not only the one currently
     chosen - see `alreadyThere`, below. */
  const { myOrgs } = useYourOrganisations()
  const [problem, setProblem] = useState('')
  const here = `/j/${encodeURIComponent(code)}`

  const { data, isLoading } = useQuery({
    queryKey: ['join-link', code],
    queryFn: () => apiClient.get(`/join-links/${encodeURIComponent(code)}`).then(r => (r.data.data ?? r.data) as Preview),
    retry: false,
  })
  const { data: methods } = useQuery({ queryKey: ['auth-methods'], queryFn: authApi.methods, staleTime: 600_000, retry: false })

  const join = useMutation({
    mutationFn: () => apiClient.post(`/join-links/${encodeURIComponent(code)}/join`).then(r => r.data.data ?? r.data),
    onSuccess: (res: any) => {
      /* Somebody whose email domain does not match the organisation's own is not joined on the
         spot (item 11, 29 September): the server raises a request instead and there is no
         `user`/`accessToken` to sign in with here. "Almost in" (join/waiting.tsx) is the same page
         a check-in invitation sends somebody to while they wait for an admin. */
      if (res.queuedForApproval) { navigate('/join/waiting', { replace: true }); return }
      setAuth(res.user, res.accessToken)
      window.location.assign('/today')
    },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not work, and you have not joined. Try again.'),
  })

  /** B-206 (review round 2): opens an organisation this person is ALREADY in but has not currently
      chosen - the same switch `/orgs` itself makes (`authApi.switchOrganization`), not a second
      join. See `alreadyThere`/`matchingOrg`, below. */
  const openExisting = useMutation({
    mutationFn: (organizationId: string) => authApi.switchOrganization(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      window.location.assign('/today')
    },
    onError: () => setProblem('That organisation did not open. Try again.'),
  })

  if (isLoading) return <AuthCard title="One moment." />
  if (!data || !data.open) {
    /*
     * WALKTHROUGH PASS 2, ITEM 4: A DEAD END WITH NOTHING TO PRESS. This said why the link does
     * not work and stopped there - nowhere to go, unlike the prototype's own small-state screens
     * (docs/prototype/screens/F4-small-states/badlink.txt, nowhere.txt), each of which pairs its
     * sentence with a way through. `AuthCard` already carries the Groundwork mark; a way on is
     * added here - sign in, for somebody who already has an account, or the home page.
     */
    /* B-158: the prototype's own heading for a link that does not work
       (F4-small-states/badlink.txt), the same one LinkProblem.tsx uses - this page had its own,
       different wording for the same state. */
    /*
     * B-206: A SIGNED-IN PERSON WHOSE LINK HAS STOPPED WORKING IS NOT ASKED TO SIGN IN. They
     * already are. Offered "Sign in" anyway, after the link they followed was turned off, the page
     * reads as if nothing it knows about them is true - Today is where they already belong.
     */
    return (
      <AuthCard title="That link didn’t work" sub="Ask whoever sent it for the new one.">
        <div className="gw-auth-actions">
          {signedIn ? (
            <Button wide size="big" onClick={() => navigate('/today')}>Go to Today</Button>
          ) : (
            <Button wide size="big" onClick={() => navigate('/auth')}>Sign in</Button>
          )}
        </div>
        {!signedIn && (
          <p className="gw-auth-small">
            <Link to="/">Go to the Groundwork home page</Link> instead.
          </p>
        )}
      </AuthCard>
    )
  }

  const org = data.organisationName
  const how = methods?.google ? 'Join with your email or Google.' : 'Join with your email.'

  /*
   * B-206: A MEMBER PRESSING THEIR OWN ORGANISATION'S JOIN LINK IS ALREADY IN IT. Grace, the admin
   * of Msingi Foods, read "Grace Achieng invited you to Msingi Foods" with a "Join Msingi Foods"
   * button under her own name; Tobi, already a member, pressed it and landed on /today with nothing
   * said - the server's own `join()` (the-organisation-invite-link.service.ts) finds the membership
   * that already exists and quietly switches him into it rather than making a new one, so nothing
   * in the response says "you were already in this".
   *
   * B-206 (review round 2): "ALREADY THERE" MEANS "A MEMBER OF IT AT ALL", NOT ONLY "IT HAPPENS TO
   * BE THE ONE CURRENTLY CHOSEN". The first fix compared the invite's organisation only to
   * `ownOrganisationName` - whichever organisation this person currently has open - so Neema, who
   * belongs to both Msingi Foods and Lakeview Clinic and had Lakeview chosen, read "Grace Achieng
   * invited you to Msingi Foods... Join Msingi Foods" as though she had never been part of it,
   * because Lakeview, not Msingi, was her CURRENT one. `useYourOrganisations` (the same list `/orgs`
   * itself reads) is the full membership, not only the active organisation, so the match is made
   * against every one of them; matched by name (the preview the server sends carries no id to match
   * on - noted for the engine, docs/requests-to-engine.md, the same way the first fix already was).
   * Matched but not the one currently chosen, the right offer is to OPEN it (the same switch `/orgs`
   * makes), not to say there is nothing to do here - there is: open it.
   */
  const matchingOrg = signedIn && org
    ? myOrgs.find(o => o.name.trim().toLowerCase() === org.trim().toLowerCase())
    : undefined

  if (matchingOrg?.active) {
    return (
      <AuthCard title={`You’re already part of ${org}`} sub="There is nothing to join here.">
        <div className="gw-auth-actions">
          <Button wide size="big" onClick={() => navigate('/today')}>Go to Today</Button>
        </div>
      </AuthCard>
    )
  }

  if (matchingOrg) {
    return (
      <AuthCard title={`You’re already part of ${org}`} sub="It is not the organisation you currently have open.">
        <div className="gw-auth-actions">
          {problem && <AuthError>{problem}</AuthError>}
          <Button wide size="big" disabled={openExisting.isPending} onClick={() => openExisting.mutate(matchingOrg.id)}>
            {openExisting.isPending ? 'Opening…' : `Open ${org}`}
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={data.inviterName ? `${data.inviterName} invited you to ${org}` : `You’re invited to ${org}`}
      sub={`People there use Groundwork for short check-ins on their work. ${how}`}
    >
      <p className="gw-auth-small" style={{ margin: '-6px 0 14px' }}>{`${window.location.host}${here}`}</p>
      {problem && <AuthError>{problem}</AuthError>}
      <div className="gw-auth-actions">
        <Button
          wide
          size="big"
          disabled={join.isPending}
          onClick={() => (signedIn ? join.mutate() : navigate(`/auth?mode=signup&next=${encodeURIComponent(here)}`))}
        >
          {`Join ${org}`}
        </Button>
        {!signedIn && (
          <Button kind="secondary" wide size="big" onClick={() => navigate(`/auth?next=${encodeURIComponent(here)}`)}>
            I already have an account
          </Button>
        )}
      </div>
      <p className="gw-auth-small">
        {`Not from ${org}? `}
        <Link to={signedIn ? '/org-new' : '/auth?mode=signup'}>Create your own organisation</Link>
        {' instead.'}
      </p>
    </AuthCard>
  )
}
