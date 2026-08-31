import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  rememberConversation, recallConversation, forgetConversation,
} from './remembering-the-context-conversation'

const G = 'ground-1'
const TURNS = [
  { role: 'assistant' as const, content: 'What is this check-in for?' },
  { role: 'user' as const, content: 'Onboarding Ada into the payments team.' },
]
const PROPOSAL = { gap: 'how long', say: 'I will set it to 60 days', said: 'about two months' }

beforeEach(() => { try { sessionStorage.clear() } catch { /* not available */ } })
afterEach(() => vi.restoreAllMocks())

describe('remembering the context conversation', () => {
  it('a conversation comes back after leaving the page', () => {
    rememberConversation(G, { history: TURNS, proposal: null, done: false })
    expect(recallConversation(G)?.history).toEqual(TURNS)
  })

  it('and so does a proposal still waiting on a yes - the half that looked like lost setup', () => {
    rememberConversation(G, { history: TURNS, proposal: PROPOSAL, done: false })
    expect(recallConversation(G)?.proposal).toEqual(PROPOSAL)
  })

  it('nothing to recall before anything is said', () => {
    expect(recallConversation(G)).toBeNull()
  })

  it('one ground cannot read another ground draft', () => {
    rememberConversation(G, { history: TURNS, proposal: null, done: false })
    expect(recallConversation('ground-2')).toBeNull()
  })

  it('starting over clears it', () => {
    rememberConversation(G, { history: TURNS, proposal: PROPOSAL, done: true })
    forgetConversation(G)
    expect(recallConversation(G)).toBeNull()
  })

  it('an empty conversation clears rather than storing emptiness', () => {
    rememberConversation(G, { history: TURNS, proposal: null, done: false })
    rememberConversation(G, { history: [], proposal: null, done: false })
    expect(recallConversation(G)).toBeNull()
  })

  it('a long conversation is trimmed from the front, keeping the recent turns', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ role: 'user' as const, content: `turn ${i}` }))
    rememberConversation(G, { history: many, proposal: null, done: false })
    const back = recallConversation(G)!
    expect(back.history).toHaveLength(40)
    expect(back.history[back.history.length - 1].content).toBe('turn 59')
  })

  it('a draft from an older shape is treated as nothing rather than breaking the page', () => {
    sessionStorage.setItem(`gw-context-chat:${G}`, JSON.stringify({ messages: TURNS }))
    expect(recallConversation(G)).toBeNull()
    sessionStorage.setItem(`gw-context-chat:${G}`, 'not json at all')
    expect(recallConversation(G)).toBeNull()
  })

  it('a malformed proposal is dropped without dropping the conversation', () => {
    sessionStorage.setItem(`gw-context-chat:${G}`, JSON.stringify({
      history: TURNS, proposal: { gap: 'x' }, done: false,
    }))
    const back = recallConversation(G)!
    expect(back.history).toEqual(TURNS)
    expect(back.proposal).toBeNull()
  })

  it('storage that throws does not take the chat down with it', () => {
    /* A private window, or a browser set to block site data, throws on access. */
    /* Spied on the object, not Storage.prototype: under this runner sessionStorage is a shim and
       is not an instance of it, so a prototype spy silently never fires and the test passes on
       storage that worked perfectly. */
    const denied = () => { throw new Error('denied') }
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(denied)
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(denied)
    vi.spyOn(sessionStorage, 'removeItem').mockImplementation(denied)
    expect(() => rememberConversation(G, { history: TURNS, proposal: null, done: false })).not.toThrow()
    expect(recallConversation(G)).toBeNull()
    expect(() => forgetConversation(G)).not.toThrow()
  })
})
