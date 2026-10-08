import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * AN ENDPOINT WITH NO CALLER IS A DECISION SOMEBODY HAS NOT MADE. W-UX-C.
 *
 * The audit counted "11 buttons' worth of code with no button" and two of them mattered a great
 * deal: `authApi.updateProfile` meant NOBODY COULD TELL US THEIR OWN NAME, which is why three
 * screens were showing email addresses, and `resendParticipantInvite` meant a lost invite could
 * only be handled by the lead pasting a link into their own mail client.
 *
 * WHY THIS FILE EXISTS RATHER THAN A ONE-OFF SWEEP. The sweep I ran by hand matched bare method
 * names, so `feedbackApi.submit` and `feedbackApi.list` did not register as orphans - "submit" and
 * "list" appear everywhere. That gap is exactly where the worst bug of the pass was hiding: the
 * floating Feedback button had been rejected with a 400 for its whole life and nothing anywhere
 * listed a submission. A check that misses things is worse than no check, because it gets believed.
 *
 * So the match is QUALIFIED - `feedbackApi.submit`, not `submit` - which is how these are really
 * written at call sites.
 *
 * WHAT A FAILURE MEANS. Not "delete this". It means: wire it, or delete it, or add it to KNOWN below
 * with the reason. All three are fine. Leaving it undecided is what is not.
 */
const API_DIR = __dirname
const SRC = join(__dirname, '..')

/**
 * Every endpoint currently living without a caller, and why that is allowed. Each line is a
 * decision, not a suppression - anything not here is a new orphan and fails.
 */
const KNOWN: Record<string, string> = {
  'billingApi.applyContributorCode':
    'Org-level "activate billing without payment". With Stripe unwired this is the only way to put a customer on a paid footing, and it has no surface at either end. Awaiting her call on who gets codes and where it is entered.',
  'authApi.memberSignin':
    'Magic sign-in link for an existing member. The sign-in page offers password and forgot-password only, so a member with no password has no self-serve way in. Small, real, undecided.',
  // ── Found by this guard, not by the hand sweep it replaced ──────────────────
  'pricingAdminApi.get':
    'THE SECOND ADMIN PRICING API. `/billing/admin/pricing` (get/update/reset) sits beside `adminApi` on `/admin/pricing`, which is the one the ops page uses. Two route families for the thing that must never disagree - what we charge. `reset` has no equivalent in the one we use. Needs collapsing onto one; which survives is a call, so it is not being guessed at.',
  'pricingAdminApi.update':
    'See pricingAdminApi.get - the same duplicate surface.',
  'pricingAdminApi.reset':
    'See pricingAdminApi.get. Note this one is NOT a duplicate: resetting prices to defaults exists only here, so collapsing the two must carry it across rather than drop it.',
  'resolutionApi.counter':
    'POST /grounds/:id/resolution/counter. One side can propose an end state and the other can accept; nobody can COUNTER. So a feature about two parties agreeing is currently propose-or-accept, which is the shape of a verdict rather than an agreement.',
  'groundsApi.activate':
    'POST /grounds/:id/activate, distinct from report activation. Approve and confirm-lead appear to cover the same ground now. Probably dead; not deleting a state-changing route on an assumption.',
  'promptsApi.create':
    'Creating a new prompt version. The versioning page can activate and test existing prompts but not add one, so new prompts are a database job today.',
  'authApi.teamInvite':
    'POST /auth/team-invite, one address at a time. Its only button was "Invite a team member" on the check-ins list, which went when the list was rebuilt to the prototype (U.5). Inviting now happens on People (POST /users/invitations, U.4), with a role and many addresses at once, and from the new organisation\'s checklist on Today. Kept, not deleted: whether this route retires is a call for the other workspace and Hafsah.',
  'groundsApi.getMediatorBrief':
    'A structural brief to hand a facilitator. Works, no UI. Where it belongs is a product call, and more live now that the coaching offer exists.',
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.tsx?$/.test(name) && !name.includes('.spec.') ? [p] : []
  })
}

/** `export const fooApi = { ... }` and the method names declared directly inside it. */
function methodsIn(src: string): { object: string; method: string }[] {
  const out: { object: string; method: string }[] = []
  for (const m of src.matchAll(/export const (\w+) = \{([\s\S]*?)\n\}/g)) {
    const body = m[2].replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    /**
     * Only objects that actually TALK TO THE API. `participantStorage` is a localStorage helper with
     * `save`/`load`/`clear` and lives in this directory; counting it made three false orphans, and a
     * guard whose failures include things that were never endpoints is a guard people start ignoring.
     */
    if (!/apiClient\./.test(body)) continue
    for (const f of body.matchAll(/^\s{2}(\w+):\s*(?:\(|async)/gm)) {
      out.push({ object: m[1], method: f[1] })
    }
  }
  return out
}

describe('every endpoint the client declares is called by something', () => {
  const apiFiles = readdirSync(API_DIR).filter(f => f.endsWith('.ts') && !f.includes('.spec.'))
  const consumers = walk(SRC)
    .filter(f => !f.startsWith(API_DIR))
    .map(f => readFileSync(f, 'utf8'))
    .join('\n')

  const orphans: string[] = []
  for (const file of apiFiles) {
    const src = readFileSync(join(API_DIR, file), 'utf8')
    for (const { object, method } of methodsIn(src)) {
      const qualified = `${object}.${method}`
      /** Qualified, and also bare-destructured (`const { list } = feedbackApi`) which is rare but real. */
      if (consumers.includes(qualified)) continue
      if (new RegExp(`\\b${method}\\b[^\\n]*${object}`).test(consumers)) continue
      orphans.push(qualified)
    }
  }

  it('and anything that is not is a written-down decision', () => {
    expect(orphans.filter(o => !(o in KNOWN))).toEqual([])
  })

  it('the known list does not rot into a list of things that are fine now', () => {
    /**
     * The other direction. Once `portal` gains a button, its entry here is a stale note claiming an
     * endpoint is unwired when it is not - and the next reader trusts it.
     */
    expect(Object.keys(KNOWN).filter(k => !orphans.includes(k))).toEqual([])
  })

  it('reads qualified names, which is the gap that hid the feedback bug', () => {
    /** A guard on the guard: matching bare `submit` is what made the first sweep miss three methods. */
    expect(methodsIn(readFileSync(join(API_DIR, 'feedback.ts'), 'utf8')).map(m => `${m.object}.${m.method}`))
      .toContain('feedbackApi.submit')
  })
})
