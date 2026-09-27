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
 * PRIVACY. The board is read by every party, and a party's address can be hidden from the others.
 * The client's `participantLabel` refuses the email for exactly this reason.
 *
 * The fallback used to be the role. Since request 36 (27 September 2026) it is nothing, and the
 * callers say "A colleague": the role on the row is the lead's own description of the person, which
 * can hold the lead's private words. See a-label-is-never-the-leads-description.spec.ts.
 */
const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('GW-BOARD-NAMES: no address is ever a label', () => {
  it('the one place labels are built falls back to nothing, never the role or the address', () => {
    /*
     * Never the address - which is what this test is for. It used to fall back to the role, cut
     * short by `aNameOrNothing`; since request 36 it does not, because the role is the lead's own
     * description of the person and a short piece of it is still the lead's words. With no name the
     * label is null and the caller says "A colleague". The organisation is appended to a name the
     * way the report does it.
     */
    expect(SRC).toContain('const label = n || null;');
    expect(SRC).not.toContain('aNameOrNothing(p.roleAsDescribed)');
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
