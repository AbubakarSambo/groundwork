/**
 * THE CONTEXT CHAT FORGOT EVERYTHING THE MOMENT YOU LEFT THE PAGE.
 *
 * It is the only way to say anything on the Context tab - there is no form for an expectation
 * anywhere, by design - and the whole conversation lived in component state. The server keeps none
 * of it either: the client posts the entire history on every turn, so nothing is stored anywhere
 * else. Navigate to another tab and back, or reload, and the lead is met with an empty box that has
 * forgotten a conversation they just had.
 *
 * THE WORSE HALF IS THE PROPOSAL. The panel says "nothing is saved until you say so", so a proposal
 * waiting on a yes is by definition not written down yet. Leaving the page threw away something the
 * lead had already said and only had left to confirm - and because the panel had promised nothing
 * was saved, it looked exactly like the product had cleared their setup.
 *
 * WHY THE BROWSER AND NOT THE SERVER. A conversation that has not been agreed to is a draft, and a
 * draft belongs to the person and the machine they are typing on. Storing unconfirmed turns on the
 * ground would put words on a shared record that nobody has said yes to yet, which is the opposite
 * of what the panel promises. What IS agreed is already written server-side when they accept it.
 *
 * Every read and write is wrapped: sessionStorage throws outright in some contexts (a private
 * window, a browser set to block site data), and a chat that cannot render because it could not
 * read its own draft is worse than one that starts empty.
 */

export interface RememberedTurn { role: 'user' | 'assistant'; content: string }
export interface RememberedProposal { gap: string; say: string; said: string }
export interface RememberedConversation {
  history: RememberedTurn[]
  proposal: RememberedProposal | null
  done: boolean
}

/** Per ground: two grounds open in two tabs must not read each other's draft. */
const keyFor = (groundId: string) => `gw-context-chat:${groundId}`

/**
 * Long conversations are trimmed from the front. The recent turns are what the next question is
 * built on, and an unbounded draft in session storage is a quota error waiting for the person with
 * the longest conversation - which is the person who would lose the most.
 */
const KEEP_TURNS = 40

export function rememberConversation(groundId: string, state: RememberedConversation): void {
  try {
    if (state.history.length === 0 && !state.proposal) {
      forgetConversation(groundId)
      return
    }
    sessionStorage.setItem(keyFor(groundId), JSON.stringify({
      history: state.history.slice(-KEEP_TURNS),
      proposal: state.proposal,
      done: state.done,
    }))
  } catch {
    /* Storage unavailable or full. The chat still works; it just will not survive leaving. */
  }
}

/**
 * Anything that is not the shape we wrote is treated as nothing. Storage is per-origin and long
 * lived, so a draft from an older version of this component can outlive it, and feeding a
 * half-recognised shape into the chat would break the page rather than start it empty.
 */
export function recallConversation(groundId: string): RememberedConversation | null {
  try {
    const raw = sessionStorage.getItem(keyFor(groundId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const { history, proposal, done } = parsed as Partial<RememberedConversation>
    if (!Array.isArray(history)) return null
    const turns = history.filter(
      (t): t is RememberedTurn =>
        !!t && typeof t === 'object'
        && (t as RememberedTurn).role !== undefined
        && ((t as RememberedTurn).role === 'user' || (t as RememberedTurn).role === 'assistant')
        && typeof (t as RememberedTurn).content === 'string',
    )
    if (turns.length === 0) return null
    const p = proposal
    const goodProposal =
      p && typeof p === 'object'
      && typeof p.gap === 'string' && typeof p.say === 'string' && typeof p.said === 'string'
        ? p
        : null
    return { history: turns, proposal: goodProposal, done: done === true }
  } catch {
    return null
  }
}

export function forgetConversation(groundId: string): void {
  try {
    sessionStorage.removeItem(keyFor(groundId))
  } catch {
    /* Nothing to do: there is no state we depend on having cleared. */
  }
}
