import { overTimeForThisReader } from './what-the-record-shows-over-time';
import * as fs from 'fs';
import * as path from 'path';

/*
 * A relationship officer opened his own report on a four-person sales ground and found his
 * colleague's pipeline in it: "Relationship officer, Ikeja... is waiting on the credit committee
 * and the Head of Credit for the eleven complete files." The board gated this correctly; the
 * report returned the whole row.
 */
const whole: any = {
  sessions: 3,
  commitments: [
    { participantId: 'femi', who: 'Femi', what: 'chase bank statements', say: 'Femi: chase bank statements', status: 'UNKNOWN', restatedIn: [] },
    { participantId: 'ngozi', who: 'Ngozi', what: 'chase the committee', say: 'Ngozi: chase the committee', status: 'UNKNOWN', restatedIn: [] },
  ],
  dependencies: [
    { what: 'bank statements', from: 'Femi', fromParticipantId: 'femi', on: null, onParticipantId: null, sessionsWaiting: 2, escalated: false, status: 'WAITING', say: 'Femi is waiting on the customers' },
    { what: 'the eleven files', from: 'Ngozi', fromParticipantId: 'ngozi', on: null, onParticipantId: null, sessionsWaiting: 2, escalated: true, status: 'WAITING', say: 'Ngozi is waiting on the credit committee' },
  ],
  patterns: [{ participantId: 'femi', who: 'Femi', code: 'K5', name: 'Activity Without Outcome Logic', observation: 'x', seenInSessions: [1, 2, 3], consecutive: 3, status: 'SURFACED', say: 'y' }],
  gaps: [{ participantId: 'ngozi', who: 'Ngozi', expected: 'e', recordHolds: 'r', say: 'Ngozi was taken on for...' }],
  stillOpen: ['Ngozi is waiting on the credit committee'],
  cannotTellYou: ['Nothing here is backed by a document.'],
  toSettleFirst: ['Ask Femi what has changed'],
};

describe('the longitudinal read belongs to the lead', () => {
  /*
   * ALL OF IT EXCEPT THE PATTERNS, since 27 September 2026: patterns are served to nobody until
   * they are done properly (patterns/patterns-are-served). Everything else still reaches the lead
   * whole, and every participant rule below is unchanged.
   */
  it('gives the lead all of it, except the patterns while they are not served', () => {
    const lead = overTimeForThisReader(whole, { isLead: true, participantId: 'anyone' })!;
    /* Changed 30 Sep 2026 (request 87): the lead is also served `inSessions`, the heading's "in 3 sessions". */
    expect(lead).toEqual({ ...whole, patterns: [], inSessions: 'in 3 check-ins' });
  });

  it('gives a participant their own commitments and nobody else\'s', () => {
    const mine = overTimeForThisReader(whole, { isLead: false, participantId: 'femi' })!;
    expect(mine.commitments.map((c) => c.participantId)).toEqual(['femi']);
    expect(JSON.stringify(mine)).not.toMatch(/Ngozi/);
  });

  it('gives a participant only the waiting they are a party to', () => {
    const mine = overTimeForThisReader(whole, { isLead: false, participantId: 'femi' })!;
    expect(mine.dependencies).toHaveLength(1);
    expect(mine.dependencies[0].fromParticipantId).toBe('femi');
  });

  /* Everything that is a read ABOUT people is the lead's. */
  it('gives a participant no patterns, no gaps, no still-open list and no questions for the lead', () => {
    const mine = overTimeForThisReader(whole, { isLead: false, participantId: 'femi' })!;
    expect(mine.patterns).toEqual([]);
    expect(mine.gaps).toEqual([]);
    expect(mine.stillOpen).toEqual([]);
    expect(mine.toSettleFirst).toEqual([]);
  });

  it('keeps the caveats, which are true for everybody and identify nobody', () => {
    const mine = overTimeForThisReader(whole, { isLead: false, participantId: 'femi' })!;
    expect(mine.cannotTellYou).toEqual(whole.cannotTellYou);
  });

  /* Fail closed: an unknown reader gets nothing rather than everything. */
  it('gives an unknown reader nothing', () => {
    expect(overTimeForThisReader(whole, { isLead: false, participantId: null })).toBeNull();
    expect(overTimeForThisReader(null, { isLead: true, participantId: 'x' })).toBeNull();
  });

  it('and the report read applies it on both branches', () => {
    const src = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* Two in get(), the forming and the released branch, and a third in the check before a report is
       kept, which renders each participant's copy the way get() serves it (everyLineReadAsItWillBe). */
    expect(src.match(/overTime: overTimeForThisReader\(/g) ?? []).toHaveLength(3);
    const check = src.slice(src.indexOf('private async everyLineReadAsItWillBe'), src.indexOf('private applyNames'));
    expect(check).toMatch(/overTime: overTimeForThisReader\(/);
  });
});
