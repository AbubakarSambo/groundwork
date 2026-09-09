import { readFileSync } from 'fs';
import { join } from 'path';
import { namesVisibleTo, readsWithNamesOf, withNames } from '../reports/party-labels';
import { PartyType } from '@prisma/client';

/**
 * THE BOARD SAYS NAMES, ON THE SAME RULE AS THE REPORT. W8-73.
 *
 * The board reads the report's own sentences. Those sentences are written by the model in
 * LABELS - "the initiator", "the participant", "participant A" - because the model is
 * explicitly told never to write a personal name. `reports.service.ts` swaps them for real
 * names on the way out, per reader, by what that reader may see.
 *
 * **The board never did.** So a LEAD, entitled to every name in their own ground, read their
 * own board as:
 *
 *   "By the end of the evaluation period, the participant was successfully owning two client
 *    accounts."
 *   "Both parties identified the initiator's clarification in week seven..."
 *
 * Twelve sessions of real work, described in placeholders, to the person who ran it. Found by
 * opening the board of a twelve-session ground as its lead - not by any test, because every
 * test asserted on the same label strings the fixture put in.
 *
 * Two halves are pinned: the substitution is wired into the board, and the access rule it
 * uses is the report's rule rather than a second one that could drift.
 */

const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the board is wired to the same helpers', () => {
  it('imports them from the report, rather than reimplementing the rule', () => {
    // A second copy of an access rule is how the two answers drift apart.
    expect(CODE).toMatch(/import \{[^}]*namesVisibleTo[^}]*withNames[^}]*\} from '\.\.\/reports\/party-labels'/);
  });

  it('and every string in the whitelisted report goes through it', () => {
    // Not just the top-level fields: divergences and agreements are arrays of objects.
    expect(CODE).toMatch(/const reportSafe = reportSafeRaw \? \(named\(reportSafeRaw\)/);
    expect(CODE).toMatch(/if \(typeof v === 'string'\) return withNames\(v, visibleNames, allLabels\)/);
  });

  it('and it passes the lead flag, not a constant', () => {
    /**
     * THE SECOND GAP THE BITE-CHECK FOUND. Replacing this with `viewerIsLead: false` left
     * all 249 board tests green - so the whole point of the fix, a lead seeing names, was
     * asserted nowhere. The resolution is a tested function now; this pins that the board
     * actually tells it who is reading.
     */
    expect(CODE).toMatch(/viewerIsLead: isInitiator \|\| isSetupAdmin/);
    expect(CODE).toMatch(/viewerParticipantId: me\?\.id \?\? null/);
  });

  it('the raw version never reaches a section', () => {
    /**
     * `reportSafeRaw` exists only to be substituted into `reportSafe`. If anything below
     * that line reads the raw value, that section renders labels again - which is the bug,
     * back, in one place instead of all of them.
     *
     * Asserted by position rather than by counting occurrences: my first version pinned the
     * count at two, which is both wrong (the declaration and the ternary use it more than
     * that) and meaningless - a count says nothing about WHERE.
     */
    const cut = CODE.indexOf('const reportSafe = reportSafeRaw');
    expect(cut).toBeGreaterThan(0);
    // To the END of that statement - the line itself legitimately names the raw value three
    // times (condition, argument, and the `as typeof` that keeps the shape).
    const after = CODE.slice(CODE.indexOf('\n', cut));
    expect(after).not.toContain('reportSafeRaw');
  });
});

describe('whose eyes the board reads with', () => {
  /**
   * THE GAP THE BITE-CHECK FOUND. Breaking the board's `isInitiator || isSetupAdmin`
   * resolution changed nothing in this file, because every test of the rule called
   * `namesVisibleTo` directly and never went through the resolution that decides what to
   * pass it. So the resolution is one function now - shared with the report, which had its
   * own copy inline - and it is tested here.
   */
  const lead = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'h@x.test', user: { firstName: 'Hafsah', lastName: null } };
  const other = { id: 'p-other', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'a@x.test', user: { firstName: 'Abubakar', lastName: null } };
  const parties = [lead, other] as any[];

  it('a lead reads as the lead of this ground', () => {
    expect(readsWithNamesOf({ viewerIsLead: true, viewerParticipantId: null, parties })).toBe('p-lead');
  });

  it('the admin who set it up reads the same way, without being a party', () => {
    // `viewerIsLead` is true for the setup admin too - they created the ground and handed
    // it over, and an eighteen-ground run found them locked out of boards they had made.
    expect(readsWithNamesOf({ viewerIsLead: true, viewerParticipantId: undefined, parties })).toBe('p-lead');
  });

  it('anybody else reads as themselves', () => {
    expect(readsWithNamesOf({ viewerIsLead: false, viewerParticipantId: 'p-other', parties })).toBe('p-other');
  });

  it('and a reader who is not a party at all reads as nobody', () => {
    // Not as the lead, which would hand every name to any signed-in stranger.
    expect(readsWithNamesOf({ viewerIsLead: false, viewerParticipantId: null, parties })).toBeNull();
  });

  it('a lead with no initiator on the ground falls back to themselves, not to everyone', () => {
    // Fails closed: no initiator row means no privileged id to read with.
    const orphan = [other] as any[];
    expect(readsWithNamesOf({ viewerIsLead: true, viewerParticipantId: 'p-other', parties: orphan })).toBe('p-other');
    expect(readsWithNamesOf({ viewerIsLead: true, viewerParticipantId: null, parties: orphan })).toBeNull();
  });
});

describe('the rule itself: who sees which name', () => {
  const lead = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'h@x.test', user: { firstName: 'Hafsah', lastName: null } };
  const other = { id: 'p-other', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'a@x.test', user: { firstName: 'Abubakar', lastName: null } };
  const parties = [lead, other] as any[];

  it('a lead reads every name - which is the case that was broken', () => {
    const visible = namesVisibleTo('p-lead', parties);
    const line = 'the initiator asked and participant A answered';
    const out = withNames(line, visible);
    expect(out).toContain('Hafsah');
    expect(out).toContain('Abubakar');
  });

  it('a participant reads their own name and the lead\'s, not the third party\'s', () => {
    const third = { id: 'p-3', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'c@x.test', user: { firstName: 'Chidi', lastName: null } };
    const visible = namesVisibleTo('p-other', [...parties, third] as any[]);
    const out = withNames('the initiator, participant A and participant B', visible);
    expect(out).toContain('Hafsah');
    expect(out).toContain('Abubakar');
    expect(out).not.toContain('Chidi');
  });

  it('and a lead has no privileged view of a ground they are not in', () => {
    // The board resolves "read as the lead" from THIS ground's initiator, so being a lead
    // elsewhere confers nothing here.
    const visible = namesVisibleTo(null, parties);
    const out = withNames('the initiator and participant A', visible);
    expect(out).toContain('Hafsah');
    expect(out).not.toContain('Abubakar');
  });
});
