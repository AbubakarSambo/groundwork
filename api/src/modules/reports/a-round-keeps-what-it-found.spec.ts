import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE CHECK-IN LIST WAS SHOWING EVERY GROUND'S BRIEF.
 *
 * "These cards need to carry the highlight from the latest session, that thing that sits at the top
 * of the session report. Not this, we are setting shared goals etc."
 *
 * The brief is the sentence somebody set a check-in up with, so four goal check-ins read "We are
 * setting shared goals for this period and I want everyone aligned on what matters most" four times
 * and the list said nothing about where any of them actually was.
 *
 * The finding - the line at the top of a session's report - was computed from the round's own
 * drafts and thrown away, so the only place it ever existed was a page somebody had open. A round
 * keeps it now.
 *
 * WHERE IT IS WRITTEN IS THE DECISION. Not on a read, because a read must not write. Not in
 * synthesis, because synthesis does not build the drafts the finding is picked from. It goes where
 * the session report is already being computed for every reader the moment a round closes.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const read = (...p: string[]) => strip(readFileSync(join(__dirname, ...p), 'utf8'));

const LISTENER = read('reports.listener.ts');
const GROUNDS = read('..', 'grounds', 'grounds.service.ts');
const SCHEMA = read('..', '..', '..', 'prisma', 'schema.prisma');

describe('a round keeps what it found', () => {
  it('there is somewhere to keep it, and it is nullable', () => {
    /* Rounds kept before this have none, and a round may legitimately produce no finding. */
    const round = SCHEMA.slice(SCHEMA.indexOf('model ReportRound'), SCHEMA.indexOf('model ReportRound') + 1400);
    expect(round).toMatch(/finding\s+String\?/);
  });

  it('it is written where the report is already in hand, not recomputed', () => {
    const warm = LISTENER.slice(LISTENER.indexOf('private async warmTheReads'));
    expect(warm).toMatch(/reportRound\.updateMany/);
    expect(warm).toMatch(/finding: String\(/);
  });

  it('and only once per round, however many readers there are', () => {
    /* Every reader gets their own report warmed; the first one that produces a finding is the
       round's, and writing it per reader would be the same row rewritten four times. */
    const warm = LISTENER.slice(LISTENER.indexOf('private async warmTheReads'));
    expect(warm).toMatch(/if \(!kept &&/);
  });

  it('keeping it never breaks the thing somebody is waiting on', () => {
    const warm = LISTENER.slice(LISTENER.indexOf('private async warmTheReads'));
    const write = warm.slice(warm.indexOf('reportRound.updateMany'));
    expect(write.slice(0, 400)).toMatch(/\.catch\(/);
  });
});

describe('and the list carries it', () => {
  it('both queries fetch it, because both feed the same list', () => {
    /*
     * THE ONE THAT MATTERS. There are two: the organisation's grounds and the ones this person is a
     * party to in somebody else's org. A card fed by the second would fall back to the brief for
     * ever while its twin showed the finding, and nothing on the screen would say why.
     */
    /*
     * THE RULE, NOT THE SELECT AS IT WAS WRITTEN THAT DAY. This pinned the exact shape and broke
     * the moment the card started carrying the round's summary as well as its finding - which is a
     * test failing for being too literal, not a defect. Both queries must fetch the round, and both
     * must fetch the two things the card reads off it.
     */
    const fetches = GROUNDS.match(/reportRounds: \{ select: \{[^}]*finding: true[^}]*\}/g) ?? [];
    expect(fetches.length).toBe(2);
    for (const f of fetches) expect(f).toContain('sharedPicture: true');
  });

  it('newest round only, because the list is read constantly', () => {
    expect(GROUNDS).toMatch(/orderBy: \{ sessionNumber: 'desc' \}, take: 1/);
  });

  it('and the card is given both by name', () => {
    /* The finding is one ranked line; the summary is how the round actually went, in plain
       sentences. The card leads with the summary and the board switcher uses the finding. */
    expect(GROUNDS).toMatch(/const latestFinding = /);
    expect(GROUNDS).toMatch(/const latestSummary = /);
    /* Given by name, and only through the gate (abb6f3b8, U.5 re-review): somebody who does not run
       the check-in gets both only once the report is released, and both go through the report's own
       naming door, so no label is ever served. This pinned the shorthand `latestFinding,
       latestSummary,` that the gate replaced. */
    /* And only once the latest round's own session is released (decision 76, item 4). */
    expect(GROUNDS).toMatch(/const mayReadTheReport = runsIt \|\| \(!!fullReport\?\.releasedAt && peersVisibleEffective\s+&& latestRound !== null && isThisSessionReleased\(fullReport as any, latestRound\)\);/);
    expect(GROUNDS).toMatch(/if \(!mayReadTheReport \|\| \(!latestFinding && !latestSummary\)\) return \{ latestFinding: null, latestSummary: null \};/);
    expect(GROUNDS).toMatch(/this\.reportTextAsItWasShared\(\{ \.\.\.\(rest as any\), participants: allParticipants, initiatorId: .*? \?\? null \}, \{ latestFinding, latestSummary \}, fullReport\?\.sharedAs, me\?\.id \?\? null, runsIt\)/);
    /* Changed on 5 October (requests 127, 129, 135, 136): the finding is served through the naming door and then put right
       (a number said twice, a missing full stop), so the line has one wrapper more. It still comes only from `named`. */
    expect(GROUNDS).toMatch(/return \{ latestFinding: aFindingThatReadsRight\(named\.latestFinding\) as typeof named\.latestFinding, latestSummary: named\.latestSummary \};/);
    /* And never handed out raw, around the gate. */
    expect(GROUNDS).not.toMatch(/latestFinding, latestSummary,/);
  });

  it('and the summary is cut where sentences actually end, wherever that now lives', () => {
    /* Not on the card: a card cannot tell where a sentence ends without a second copy of that rule,
       and splitting on a full stop is how decimals and closing quotes go wrong.

       THE CUT MOVED, AND THE RULE DID NOT. It was inline in grounds.service; the board's header
       needed the same summary, so the arithmetic went to how-a-check-in-is-going.ts and the list
       calls it. Asserted where it lives now, which is also the only place it can be broken. */
    const GOING = read('..', 'grounds', 'how-a-check-in-is-going.ts');
    expect(GOING).toMatch(/sentencesIn\(notTheWordParty\(it\.sharedPicture\)\)\.slice\(0, 3\)/);
    /* And the list does not keep a second copy of the cut. */
    expect(GROUNDS).not.toMatch(/sentencesIn\([^)]*\)\.slice\(0, 3\)/);
  });
});
