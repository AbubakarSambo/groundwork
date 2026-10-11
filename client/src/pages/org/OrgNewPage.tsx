import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi, type TeamSizeSaid } from '@/api/auth'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { AuthCard, AuthError, AuthField } from '@/pages/auth/auth-kit'
import { Button } from '@/components/gw/kit'

/**
 * "CREATE AN ORGANISATION" (A3, #/org-new). The wording is copied from
 * docs/prototype/screens/A3-organisations-and-joining/org-new.txt.
 *
 * TWO WAYS HERE, ONE CARD.
 *
 *   - Making a new one, from "Create an organisation" (renamed from "Start my own workspace",
 *     group 1 review - "workspace" is not a word this product uses anywhere else) or an old
 *     /org/setup link. It makes the organisation, makes you its owner and moves you into it.
 *   - Naming the one a first Google sign-in has just made (`?naming=1`). Google has already proved
 *     the address, so the server made an organisation straight away; this names it rather than
 *     making a second one. "Cancel" keeps the name it was given.
 *
 * THE SIZE QUESTION IS ONLY ASKED WHILE THE FREE TRIAL IS ON (Hafsah, 26 September). Nothing else
 * uses the answer, so while the trial is off the question would serve nothing. While it is on, the
 * trial is said in the one shared sentence (lib/the-free-trial.ts), never in words of this page's own.
 *
 * MORE THAN ONE OF YOUR OWN. Hafsah decided on 26 September that a person can create more than one
 * organisation, each with its own plan, as the prototype allows. So nobody is turned away here.
 */
export function OrgNewPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const naming = params.get('naming') === '1'
  const setAuth = useAuthStore(s => s.setAuth)

  const [name, setName] = useState('')
  const [size, setSize] = useState<'fewer' | 'more'>('fewer')
  const [billingEmail, setBillingEmail] = useState('')
  const [problem, setProblem] = useState('')

  const { data: pricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: billingApi.getPricing,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const trialSentence = theFreeTrialSentence(pricing?.trial)
  const line = pricing?.trial?.teamsUnder

  const teamSize: TeamSizeSaid | undefined = trialSentence && line ? { said: size, line } : undefined

  const create = useMutation({
    mutationFn: () => {
      const email = billingEmail.trim() || undefined
      return naming
        ? authApi.renameOrganization(name.trim(), { billingEmail: email, teamSize })
        : authApi.createOrganisation({ name: name.trim(), billingEmail: email, teamSize })
    },
    onSuccess: (res: any) => {
      if (naming) {
        navigate('/start', { replace: true })
        return
      }
      /* (user, token), the order setAuth takes, and a full load so every page reads the new organisation. */
      setAuth(res.user, res.accessToken)
      window.location.assign('/today')
    },
    onError: (e: any) => {
      setProblem(e?.response?.data?.message ?? 'That did not work, and nothing was created. Try again.')
    },
  })

  function submit() {
    if (create.isPending) return
    if (name.trim().length < 2) { setProblem('Give the organisation a name of at least two letters.'); return }
    if (billingEmail.trim() && !looksLikeAnAddress(billingEmail)) {
      setProblem('That billing email does not look right. Check it, or leave it empty.')
      return
    }
    setProblem('')
    create.mutate()
  }

  function cancel() {
    if (naming) { navigate('/start', { replace: true }); return }
    if (window.history.length > 1) navigate(-1)
    else navigate('/grounds', { replace: true })
  }

  /*
   * B-050 (docs/bug-log-screens.md): THIS SCREEN SAID "CREATE" FOR A NAMING STEP.
   *
   * After a new Google sign-up, the server has already made the organisation (see the comment at
   * the top of this file) - this screen only names it. It read "Create an organisation", "You'll
   * be its owner" and "Create it" regardless, which told somebody to create something that already
   * existed, and that the button would make them its owner, when it only renames what they already
   * own. Said instead as what is actually happening: the organisation is ready, and this asks what
   * to call it.
   */
  const title = naming ? 'Your organisation is ready' : 'Create an organisation'
  const sub = naming
    ? 'What should it be called?'
    : 'Its check-ins, people and plan are separate from any other organisation you’re in. You’ll be its owner.'

  return (
    <AuthCard title={title} sub={sub}>
      <form noValidate onSubmit={e => { e.preventDefault(); submit() }}>
        <AuthField
          id="org-new-name"
          label="Organisation name"
          value={name}
          onChange={v => { setName(v); setProblem('') }}
          placeholder="For example, Baridi Foundation"
          autoComplete="organization"
          autoFocus
        />

        {teamSize && (
          <div className="gw-auth-fld">
            <label className="gw-auth-label" htmlFor="org-new-size">How many people will use it?</label>
            <select id="org-new-size" className="gw-auth-input" value={size} onChange={e => setSize(e.target.value as 'fewer' | 'more')}>
              <option value="fewer">Fewer than {line}</option>
              <option value="more">{line} or more</option>
            </select>
            <p className="gw-auth-small" style={{ margin: '6px 0 0' }}>{trialSentence}</p>
          </div>
        )}

        <AuthField
          id="org-new-billing"
          label="A billing email (optional)"
          type="email"
          value={billingEmail}
          onChange={v => { setBillingEmail(v); setProblem('') }}
          placeholder="finance@yourcompany.com"
          autoComplete="email"
        />
        <p className="gw-auth-small" style={{ margin: '-8px 0 16px' }}>Not shown to your team. You can add it later.</p>

        {problem && <AuthError>{problem}</AuthError>}

        <div className="gw-auth-actions">
          <Button type="submit" wide size="big" disabled={create.isPending}>
            {naming
              ? (create.isPending ? 'Saving…' : 'Save the name')
              : (create.isPending ? 'Creating it…' : 'Create it')}
          </Button>
          <Button kind="quiet" wide onClick={cancel}>Cancel</Button>
        </div>
      </form>
    </AuthCard>
  )
}
