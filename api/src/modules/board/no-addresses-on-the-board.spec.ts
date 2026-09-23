import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE BOARD NAMES PEOPLE, OR NAMES THEIR ROLE. NEVER THEIR EMAIL. W-UX-4.
 *
 * Found by looking at the running board, not by reading code: "Sahar Okonkwo" sat beside
 * "ejiro@meridianhealth.test", "hafeezah@meridianhealth.test" and four more addresses in one grid,
 * so the column read as two different kinds of person. The same fault had been fixed on two client
 * pages in the same pass; this was the third instance and it was on the server.
 *
 * TWO REASONS THE FALLBACK IS THE ROLE:
 *  1. PRIVACY. The board is read by every party, and a party's address can be hidden from the
 *     others. The client's `participantLabel` refuses the email for exactly this reason.
 *  2. IT IS WHAT THE BOARD IS FOR. Its own framing panel says each person is shown "against their
 *     own role in its own terms", so with no name, the role IS the identity.
 */
const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('GW-BOARD-NAMES: no address is ever a label', () => {
  it('the one place labels are built falls back to the role', () => {
    /*
     * Still the role, and still never the address - which is what this test is for. It goes through
     * `aNameOrNothing` now, because the raw field was printing a whole sentence where a name goes:
     * "Chidinma Obi - She is handing over key financial processes after running them for five
     * years.: 0 check-ins on record". A short description is kept as-is; a long one gives up its
     * leading name; anything else returns null and the caller says it cannot name them.
     */
    /* The fallback chain is unchanged; it is assigned before being returned now, because the
       organisation somebody gave is appended to a name the way the report does it. What this test
       is for - the role stands in, and the address never does - is asserted below and here. */
    expect(SRC).toContain('const label = n || aNameOrNothing(p.roleAsDescribed) || null;');
    expect(SRC).toContain('return label && n && forWhom ? `${label} (${forWhom})` : label;');
    /* And the organisation only ever joins a real name - never the role standing in for one, which
       would read as an organisation vouching for somebody we cannot even name. */
    expect(SRC).not.toContain('return label && forWhom');
  });

  it('and not to the email', () => {
    /** The exact line that shipped. A tripwire on the shape, so a reintroduction cannot pass. */
    expect(SRC).not.toContain('return n || p.email || null;');
  });

  it('every label on the board comes from that one function', () => {
    /**
     * The reason this is worth pinning: `nameOf` is called eight times across the sections. A tenth
     * caller building its own chain is how the addresses got onto two other screens in the first
     * place - each place defensible alone, nothing reconciling them.
     */
    const calls = SRC.match(/nameOf\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(8);
    const inlineChains = SRC.match(/name: \[[^\]]*firstName/g) ?? [];
    expect(inlineChains).toEqual([]);
  });
});
