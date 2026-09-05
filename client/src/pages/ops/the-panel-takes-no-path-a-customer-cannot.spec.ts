import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE SHORTCUT THAT WOULD LEAVE THE API BROKEN AND THE SCREENSHOT WORKING.
 *
 * The whole claim of the public API is that a company can run Groundwork inside
 * their own system. This back office is a company running Groundwork inside
 * their own system, so the assistant appearing here is the acceptance test.
 *
 * It is much easier to render that panel by calling our own services, or on the
 * app's shared client with our bearer token attached, than to sign an identity
 * token and go in through the published routes like a stranger. A panel built
 * that way looks identical, passes review, and proves nothing — while the API a
 * customer actually integrates against stays untested.
 *
 * So the test is not "does a panel appear". It is "could a customer have built
 * this", and these are the four ways the answer becomes no.
 */
const PANEL = readFileSync(join(__dirname, 'TheAssistantAsACustomerSeesIt.tsx'), 'utf8')
const CODE = PANEL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the assistant panel', () => {
  it('is the real file, so an empty read cannot pass this', () => {
    expect(PANEL.length).toBeGreaterThan(2000)
    expect(CODE).toContain('embed/session')
  })

  it('calls the three published routes, in the order the contract names them', () => {
    const handshake = CODE.indexOf('/api/org/v1/embed/session')
    const opening = CODE.indexOf('/api/org/v1/embed/opening')
    const chat = CODE.indexOf('/api/org/v1/chat')
    expect(handshake).toBeGreaterThan(-1)
    expect(opening).toBeGreaterThan(handshake)
    expect(chat).toBeGreaterThan(opening)
  })

  it('runs a check-in, not only a chat', () => {
    /**
     * THE HALF THAT WAS MISSING, AND THE HALF THAT IS THE PRODUCT.
     *
     * The assistant is the help; the CHECK-IN is what we sell. A panel that can
     * only chat proves the easier half of the claim and leaves the acceptance
     * test looking finished — which is worse than leaving it obviously undone.
     *
     * Same rule as everything else here: through the published routes, on the
     * panel session, exactly as a stranger would.
     */
    expect(CODE).toContain('/api/org/v1/check-ins/mine')
    expect(CODE).toMatch(/check-ins\/\$\{[a-zA-Z.]+\}\/open/)
    expect(CODE).toMatch(/check-ins\/\$\{[a-zA-Z]+\}\/messages/)
  })

  it('and never sends a check-in answer to the assistant', () => {
    /*
     * WHERE TYPING GOES IS DECIDED BY WHICH THING WE ARE IN, never by what was
     * typed. An answer routed to the assistant is lost from the record it was
     * meant for, and a question routed into a check-in becomes part of
     * somebody's account of their quarter. Both are silent.
     */
    /* Tied to the ROUTE, not just to the name. The first version asserted that
       `inCheckIn ?` appeared somewhere, which stayed true after replacing the
       whole condition with `false` — the name is used in three other places. */
    expect(CODE).toMatch(
      /inCheckIn[\s\S]{0,40}\?[\s\S]{0,200}check-ins\/\$\{inCheckIn\}\/messages/,
    )
  })

  it('offers a waiting check-in rather than opening one', () => {
    /* Ten minutes of somebody's attention is not the product's to spend because
       they opened a chat window. */
    /* Named precisely rather than by proximity: the first version of this
       asserted that no `useEffect` sat within 200 characters of `openCheckIn`,
       which failed on the unrelated scroll effect that happens to be next to
       it. A guard that fires on adjacency is a guard that gets deleted. */
    const calls = [...CODE.matchAll(/openCheckIn\(/g)];
    expect(calls.length).toBe(2) // its own definition, and one caller
    expect(CODE).toMatch(/onClick=\{\(\) => openCheckIn\(c\.checkInId\)\}/)
  })

  it('does not cancel its own handshake', () => {
    /**
     * IT DID, AND THE GREETING HAD NEVER ONCE BEEN DRAWN.
     *
     * The effect depended on `session` and SET `session` halfway through. Storing
     * the token re-ran the effect, React ran the previous run's cleanup, the
     * cleanup set `cancelled`, and the run still in flight returned at its next
     * check — which sits between fetching the opening and rendering it.
     *
     * Every request before that point succeeded, so the network tab looked
     * perfect and the box stayed empty. Only opening it found it.
     */
    expect(CODE).toMatch(/\}, \[readyToken\]\)/)
    expect(CODE).not.toMatch(/\}, \[ready, session\]\)/)
  })

  it('never reaches into the product', () => {
    /* An import from modules/embed, or from anywhere in the API, is the panel
       marking its own homework. */
    const imports = [...CODE.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    for (const spec of imports) {
      expect(spec).not.toMatch(/modules\//)
      expect(spec).not.toMatch(/api\/src/)
      expect(spec).not.toMatch(/embed/)
    }
  })

  it('does not use the app’s own client, which would carry our token', () => {
    /*
     * `apiClient` holds our base URL, our bearer token and our interceptors. A
     * panel on it would work here and nowhere else, which is the exact failure
     * this exists to catch.
     */
    expect(CODE).not.toMatch(/apiClient\.(get|post|patch|put|delete)\s*(<[^>]*>)?\s*\(\s*[`'"]https?:/)
    const groundworkCalls = [...CODE.matchAll(/(\w+)\s*\(\s*`\$\{ready\.baseUrl\}/g)].map((m) => m[1])
    expect(groundworkCalls.length).toBeGreaterThanOrEqual(3)
    for (const fn of groundworkCalls) expect(fn).toBe('fetch')
  })

  it('sends no credential of ours with any Groundwork call', () => {
    /* A customer's browser has no session with Groundwork. If this worked only
       because ours does, it would work here and nowhere else. */
    const calls = CODE.split('fetch(').slice(1)
    const toGroundwork = calls.filter((c) => c.slice(0, 200).includes('ready.baseUrl'))
    expect(toGroundwork.length).toBeGreaterThanOrEqual(3)
    for (const call of toGroundwork) {
      expect(call.slice(0, 400)).toContain("credentials: 'omit'")
    }
  })

  it('never holds the shared signing key', () => {
    /* The browser carries a short assertion our server signed. A browser that
       holds the key can mint a token for anybody. */
    expect(CODE).not.toMatch(/embedSecret/)
    expect(CODE).not.toMatch(/signingSecret/)
    expect(CODE).not.toMatch(/createHmac/)
  })
})

describe('the token our server mints', () => {
  const MINT = readFileSync(
    join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'ops', 'a-token-a-customer-would-mint.ts'),
    'utf8',
  )
  const CODE = MINT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('imports nothing from the product, including the verifier that checks it', () => {
    /*
     * There is a function in modules/embed that verifies exactly this token.
     * Calling into it would be quicker and would prove nothing: the point is to
     * hold the same shared secret a customer holds and produce a token from the
     * outside. If this ever imports the verifier, the test is a mirror.
     */
    const imports = [...CODE.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    expect(imports).toEqual(['crypto'])
  })

  it('signs with the algorithm the API accepts and no other', () => {
    expect(CODE).toContain("alg: 'HS256'")
    expect(CODE).toContain("createHmac('sha256'")
  })

  it('mints a short life, because a token good for an hour is worth stealing', () => {
    const seconds = Number(CODE.match(/LIFETIME_SECONDS = (\d+)/)?.[1])
    expect(seconds).toBeGreaterThan(0)
    /* The published ceiling is 300. Ours sits under it deliberately. */
    expect(seconds).toBeLessThanOrEqual(300)
  })
})
