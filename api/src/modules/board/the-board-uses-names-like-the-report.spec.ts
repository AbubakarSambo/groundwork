import { readFileSync } from 'fs';
import { join } from 'path';
import { namesVisibleTo, readsWithNamesOf, withNames } from '../reports/party-labels';
import { PartyType } from '@prisma/client';

/**
 * THE BOARD SAYS NAMES, ON THE SAME RULE AS THE REPORT. W8-73.
 *
 * The board reads the report's own sentences. Those sentences are written by the model in
 * LABELS - "the initiator", "the participant", "Participant A" - because the model is
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
 *
 * AND THEN THE BOARD'S HALF OF IT WAS THE BUG. 26 September 2026. The pass this file pinned ran
 * over the WHITELISTED fields only, and the board takes `theJudgement`, `overTime` and `findings`
 * straight off the stored row without going near the whitelist. So the lead of the sales check-in
 * read, on her own board, "The initiator believes the team is behind on a collective goal" - and
 * every assertion in this file stayed green, because the shape they pinned was intact and simply
 * did not reach those fields.
 *
 * So the board no longer has a half of the rule. It replaces the whole report row, in place, with
 * `ReportsService.theReportAsItWasShared` - the same door the report reads through - before
 * anything looks at it. That brings three things the board's copy never had: `.label` is left raw
 * (a name in it silently keeps the wrong person's quality reads), a check-in shared without names
 * loses its identifying detail, and the reader is called "you".
 *
 * The assertions below moved with the code, and the DECISION did not: the board names people on
 * the report's rule, for whoever runs this ground. What a person actually reads is pinned
 * separately, per reader, in `the-board-says-names-in-the-judgement.spec.ts` - which is the test
 * that would have caught this, and this one is not.
 */

const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the board is wired to the same helpers', () => {
  it('asks the report to do it, rather than reimplementing the rule', () => {
    // A second copy of an access rule is how the two answers drift apart, and this one drifted.
    expect(CODE).toMatch(/import \{ ReportsService \} from '\.\.\/reports\/reports\.service'/);
    /* Through askTheReportsDoor, which asks the same door and hands it the lead's names (run-26 review). */
    expect(CODE).toMatch(/askTheReportsDoor\(\s*this\.reports,/);
  });

  it('and it is the whole row that goes through it, not a list of fields', () => {
    /* The field list was the bug in the report twice and on the board once. The row is replaced in
       place, so a column added to that table tomorrow is named the day it arrives. */
    expect(CODE).toMatch(/\(ground as any\)\.report = askTheReportsDoor\(\s*this\.reports,\s*ground as any,/);
  });

  it('and nothing reads the report row before that line', () => {
    /* The old pass ran after several reads had already been taken off the raw row, which is how
       `theJudgement` and `overTime` kept their labels. Asserted by position: every read of the
       report row must come after the row has been replaced. */
    const cut = CODE.indexOf('(ground as any).report = askTheReportsDoor(');
    expect(cut).toBeGreaterThan(0);
    const before = CODE.slice(0, cut);
    const reads = before.match(/ground(?: as any\))?\)?\??\.report\b/g) ?? [];
    expect(reads).toHaveLength(0);
  });

  it('and it passes who runs this ground, not a constant', () => {
    /* 10 Sep 2026: widened from the lead alone to `runsThisGround`, which the rest of the page
       already uses - an organisation admin reads with names, and their words stay walled off. */
    /**
     * THE SECOND GAP THE BITE-CHECK FOUND. Replacing this with `viewerIsLead: false` left
     * all 249 board tests green - so the whole point of the fix, a lead seeing names, was
     * asserted nowhere. The resolution is a tested function now; this pins that the board
     * actually tells it who is reading.
     */
    expect(CODE).toMatch(/viewerIsLead: runsThisGround/);
    expect(CODE).toMatch(/viewerParticipantId: me\?\.id \?\? null/);
  });

  it('and there is no second, raw copy of the row left lying about', () => {
    /**
     * `reportSafeRaw` used to hold the un-named whitelist, to be substituted into `reportSafe`,
     * and anything that read it rendered labels again. It is gone: there is one row, named, and
     * the whitelist is taken off it.
     */
    expect(CODE).not.toContain('reportSafeRaw');
    expect(CODE).toMatch(/const reportSafe = ground\.report \? pickBoardSafeReportFields\(ground\.report as any\) : null;/);
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
