import { RecordEntryType } from '@prisma/client';
import { theSessionReport, type SessionReportInputs } from './the-session-report';

/**
 * TWO SECTIONS ASSERTED THEIR DEFAULT WHEN THEY COULD NOT SEE ANYTHING AT ALL.
 *
 * Both follow a theme across sessions using `dimensionThreadKey`. Exactly one path writes that
 * column - the operating-difference extraction, which only runs where a company has written its own
 * process down. Most have not. Counted on a real twelve-session cohort: 227 entries, 0 thread keys.
 *
 * With none:
 *   - "What changed since last session" said "Nothing in this session contradicts or moves what was
 *     said last time" on all twelve sessions of a run in which plenty moved.
 *   - Every commitment from last session matched `!c.threadKey` and was listed as "not mentioned
 *     again" - directly beneath the same commitments in the list above. The lead read each one
 *     twice, once as a commitment and once as abandoned.
 */
const base = (over: Partial<SessionReportInputs> = {}): SessionReportInputs => ({
  sessionNumber: 2,
  closed: true,
  agreements: [],
  divergences: [],
  entries: [],
  previousEntries: [],
  baselineSuccess: null,
  startingPoint: null,
  previousSharedPicture: null,
  evidence: [],
  specificityLevel: null,
  recallConfidence: null,
  centralQuestion: null,
  movedOnTargets: null,
  blocked: 0,
  answeredThisSession: [],
  ...over,
});
const say = (r: ReturnType<typeof theSessionReport>, title: string) =>
  r.sections.find((s) => s.title === title)!;

const COMMITMENT = { type: RecordEntryType.COMMITMENT, who: 'Lola', recallBased: true };

describe('when nothing threads the sessions together', () => {
  const r = theSessionReport(base({
    entries: [{ ...COMMITMENT, text: 'I will call the new list on Monday.', threadKey: null }],
    previousEntries: [{ type: RecordEntryType.COMMITMENT, text: 'I will ask Tunde for a better list.', threadKey: null }],
  }));

  it('does not list every previous commitment as abandoned', () => {
    const items = say(r, 'Commitments').items.map((i) => i.text);
    expect(items.some((t) => t.startsWith('From last session, not mentioned again'))).toBe(false);
  });

  it('and does not claim nothing moved', () => {
    expect(say(r, 'What changed since last session').saying)
      .toContain('does not thread across sessions');
    expect(say(r, 'What changed since last session').saying)
      .not.toContain('Nothing in this session contradicts');
  });

  it('and still shows what was actually said', () => {
    expect(say(r, 'Commitments').items.map((i) => i.text)).toContain('I will call the new list on Monday.');
  });
});

describe('when the record does thread', () => {
  const r = theSessionReport(base({
    entries: [{ ...COMMITMENT, text: 'The list is sorted.', threadKey: 'list' }],
    previousEntries: [
      { type: RecordEntryType.COMMITMENT, text: 'I will ask Tunde for a better list.', threadKey: 'list' },
      { type: RecordEntryType.COMMITMENT, text: 'I will write the demo script.', threadKey: 'script' },
    ],
  }));

  it('the read comes back, and names only what was actually dropped', () => {
    const items = say(r, 'Commitments').items.map((i) => i.text);
    expect(items.some((t) => t.includes('not mentioned again: I will write the demo script.'))).toBe(true);
    expect(items.some((t) => t.includes('not mentioned again: I will ask Tunde'))).toBe(false);
  });
});

/**
 * AND "NO TARGETS SET" WAS TRUE AND USELESS.
 *
 * On a twelve-session cohort whose whole purpose was who reaches eight closed deals, the lead said
 * "each of them at eight closed deals" in every session and this tile read "no targets set /
 * nothing here carries a number yet" for the entire quarter. Both halves true about the target
 * table, with the quarter's number sitting in the transcript printed beside it.
 *
 * The number is deliberately NOT turned into a target: reading one out of a sentence and making it
 * the thing somebody is measured against is the inference this product refuses everywhere else.
 * What changed is that the tile names the gap instead of reporting an empty table.
 */
describe('the Moving? read when a number has been said but nothing tracks it', () => {
  const glance = (entries: SessionReportInputs['entries']) =>
    theSessionReport(base({ entries, movedOnTargets: null })).atAGlance.find((g) => g.label === 'Moving?')!;

  it('names the gap when somebody put a number on what they are aiming at', () => {
    const g = glance([{ type: RecordEntryType.SUCCESS_DEFINITION, text: 'Each of them at eight closed deals.', who: 'Tunde', recallBased: true, threadKey: null }]);
    expect(g.value).toBe('a number was said');
    expect(g.sub).toBe('somebody named a number and nothing is tracking it');
  });

  it('and reads digits as readily as words, because people say both', () => {
    expect(glance([{ type: RecordEntryType.INTENT, text: 'Get to 8 closed deals.', who: 'K', recallBased: true, threadKey: null }]).value)
      .toBe('a number was said');
  });

  it('and still says no targets set when nobody has named one', () => {
    const g = glance([{ type: RecordEntryType.SUCCESS_DEFINITION, text: 'Margaret running her own pipeline.', who: 'T', recallBased: true, threadKey: null }]);
    expect(g.value).toBe('no targets set');
  });

  /** A worry with a number in it is not an aim. Only a stated aim counts. */
  it('and does not count a number in something that is not an aim', () => {
    expect(glance([{ type: RecordEntryType.WORRY, text: 'We are 3 weeks behind.', who: 'T', recallBased: true, threadKey: null }]).value)
      .toBe('no targets set');
  });

  /** Where a target genuinely exists, the tile reports movement as it always did. */
  it('and steps aside once there is a real target', () => {
    const g = theSessionReport(base({ movedOnTargets: 2, entries: [] })).atAGlance.find((x) => x.label === 'Moving?')!;
    expect(g.value).toBe('+2');
  });
});
