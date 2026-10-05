import { servedPatterns, type APatternRow } from './who-reads-a-pattern';
import { withTheEarlierRead } from './stored-pattern-lines-through-the-wall';
import { PLAIN_PATTERN_NAMES } from './plain-pattern-names';

/**
 * What the report kept about a pattern is read beside that pattern, once, through the same wall (6 October 2026).
 * No stored label on a person, no internal code or name, no count out of the sessions then.
 */
const NOW = new Date('2026-10-06T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86400000);
const OBS = 'Upward reporting was optimistic while a major account was being lost.';
const stored = [
  { participantId: 'p-ade', who: 'Participant A', code: 'K5', name: 'Activity Without Outcome Logic', status: 'SURFACED', consecutive: 3, say: 'Seen in sessions 1, 2, 3 of 3, consecutively.', observation: OBS, seenInSessions: [1, 2, 3] },
  { participantId: 'p-bola', who: 'Participant B', code: 'K5', name: 'Activity Without Outcome Logic', status: 'SURFACED', observation: 'Participant B told the initiator the deal was closed when it was not.', seenInSessions: [1, 2, 3] },
];
const row = (participantId: string, extra: any = {}): APatternRow => ({ id: `r-${participantId}`, participantId, code: 'K5', observationText: 'x', seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: day(1), shownToPersonAt: day(4), personAnswer: null, personAnsweredAt: null, ...extra });
const rows = [row('p-ade'), row('p-bola')];
const lead = { participantId: 'p-lead', runsIt: true };
const readAs = (reader: { participantId: string | null; runsIt: boolean }, r = rows) => withTheEarlierRead(servedPatterns(r, reader, { now: NOW }), r, stored, reader);

describe('what the report kept, read beside the pattern the lead is already served', () => {
  it('is one more line on the served pattern, so each pattern appears once, with its plain heading and the live count', () => {
    const out = readAs(lead);
    expect(out.map((p) => p.participantId).sort()).toEqual(['p-ade', 'p-bola']);
    const ade = out.find((p) => p.participantId === 'p-ade')!;
    expect(ade.earlierRead).toBe(OBS);
    expect(ade.heading).toBe('Tasks are described without saying what they are for');
    expect(ade.sessions).toEqual([1, 2, 3]);
  });
  it('carries no stored who, code, name or status, and no label on a person in anything a person reads', () => {
    const out = readAs(lead);
    const text = JSON.stringify(out);
    for (const p of out) for (const k of ['who', 'code', 'name', 'status', 'consecutive', 'say']) expect(p).not.toHaveProperty(k);
    expect(text).not.toMatch(/Participant [A-Z]\b|the initiator|of 3, consecutively/i);
    for (const n of Object.values(PLAIN_PATTERN_NAMES).length ? ['Activity Without Outcome Logic', 'CEO-Pleasing'] : []) expect(text).not.toContain(n);
  });
  it('drops a stored line that puts a label on a person, and keeps the pattern itself', () => {
    const out = readAs(lead);
    const bola = out.find((p) => p.participantId === 'p-bola')!;
    expect(bola.earlierRead ?? null).toBeNull();
    expect(bola.heading).toBeTruthy();
  });
  it('waits for the person: a pattern still on its first read is not served, so no stored line is either', () => {
    const early = [row('p-ade', { shownToPersonAt: day(1) })];
    expect(readAs(lead, early)).toEqual([]);
  });
  it('the person it is about reads no stored line about themselves', () => {
    const me = { participantId: 'p-ade', runsIt: false };
    const out = readAs(me);
    expect(out.every((p) => p.earlierRead == null)).toBe(true);
    expect(JSON.stringify(out)).not.toContain(OBS);
  });
  it('a colleague reads nothing about anybody else, and an admin who only reads reads no pattern', () => {
    expect(readAs({ participantId: 'p-bola', runsIt: false }).filter((p) => p.participantId !== 'p-bola')).toEqual([]);
    const admin = { participantId: null, runsIt: false };
    expect(readAs(admin)).toEqual([]);
  });
  it('a stored line with no served pattern beside it is not served', () => {
    expect(withTheEarlierRead([], rows, stored, lead)).toEqual([]);
  });
});
