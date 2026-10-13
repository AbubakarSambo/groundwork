import { serviceFor, theSessionReportAs, everyString } from './__fixtures__/sales-team-q3-two-sessions';
import { keptWithEachSessionsOwn, theInferencesOfSession } from './each-sessions-inferences-are-its-own';

/**
 * SCREENS REQUEST 102: A CLOSED SESSION'S OWN REPORT NEVER SHOWS A LATER SESSION'S COACHING NOTE, PROBE
 * LIST OR INFERENCES.
 *
 * Walked as Rukia on session 1 of "Sales team, Q3", closed 27 September: "What to work on next" opened
 * "This is session 2 ...", and her probe list said Baraka had not answered "this session", because all
 * three were read from `GET /grounds/:id/report`, the working copy. `GET .../report/session/:n` now
 * carries each session's own, built from the record as it stood when that session closed.
 *
 * In the fixture, session 1's wait (Baraka on Rukia, for a decision on the discount) was cleared on 29
 * September, and session 2's wait (Amani on Rukia, for the price list) was raised that day. Session
 * 1's synthesis concluded SESSION-ONE-INFERENCE and session 2's SESSION-TWO-INFERENCE.
 */

const LATER = /SESSION-TWO|[A-Z]+-TWO |session 2\b/;

async function sessionAs(userId: string, n: number, kind: 'sales' | 'review' = 'sales') {
  const { svc } = serviceFor(kind);
  const respond = jest.fn(async () => 'a new line');
  (svc as any).anthropic = { respond };
  const r = await theSessionReportAs(svc, userId, n);
  return { r, respond };
}

/* A fixed clock, as before. Since request 117 (part 9) a wait is said with the day it began ("since 29
   September"), so these sentences no longer depend on the hour they are read at. */
beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(new Date('2026-10-02T09:00:00Z')); });
afterAll(() => { jest.useRealTimers(); });

describe('session 1, closed, as each reader is sent it', () => {
  it('Rukia, who runs it and checks in, reads her own note, her probe list and the inferences of session 1 only', async () => {
    const { r, respond } = await sessionAs('u-rukia', 1);
    expect(r.coaching.whyItMatters).toBe('This is session 1 of this work. Nothing repeats yet, which is normal this early. What decides whether the later sessions are worth anything is what you can point at.');
    expect(r.coaching.beforeNextTime).toEqual(['Baraka Mwangi has been waiting on you for SESSION-ONE-WAIT a decision on the discount since 24 September. Either do it, or give a date you can do it by.']);
    expect(r.probes.map((p: any) => p.who)).toEqual(['Amani Wekesa', 'Baraka Mwangi', 'Neema Achieng']);
    expect(r.probes.find((p: any) => p.who === 'Baraka Mwangi').probe).toEqual([
      /* The wait is on Rukia, who reads it, so it is hers to answer, not Baraka's to raise higher (item 21). */
      'Baraka Mwangi has been waiting on you for SESSION-ONE-WAIT a decision on the discount since 24 September. Give Baraka Mwangi an answer, or say when you will.',
    ]);
    /* Everybody answered session 1, so nobody is said not to have. */
    expect(JSON.stringify(r.probes)).not.toMatch(/has not answered this session/);
    expect(r.inferences.map((i: any) => i.text)).toEqual(['SESSION-ONE-INFERENCE Nobody has priced the cookers yet.']);
    expect(everyString({ c: r.coaching, p: r.probes, i: r.inferences }).filter((s) => LATER.test(s))).toEqual([]);
    /* Opening it asks no model (decision 7). */
    expect(respond).not.toHaveBeenCalled();
  });

  it.each([['Amani', 'u-amani'], ['Baraka', 'u-baraka']])('%s, a participant, reads only their own session 1 note, and no probe list or inferences', async (_who, userId) => {
    const { r } = await sessionAs(userId, 1);
    expect(r.coaching.whyItMatters).toMatch(/^This is session 1 of this work\./);
    expect(everyString(r.coaching).filter((s) => LATER.test(s))).toEqual([]);
    expect(r).not.toHaveProperty('probes');
    expect(r).not.toHaveProperty('inferences');
  });

  it('Juma, an admin who only reads, gets no coaching note and no probe list, and the inferences of session 1 as on the report', async () => {
    const { r } = await sessionAs('u-juma', 1);
    expect(r).not.toHaveProperty('coaching');
    expect(r).not.toHaveProperty('probes');
    expect(r.inferences.map((i: any) => i.text)).toEqual(['SESSION-ONE-INFERENCE Nobody has priced the cookers yet.']);
  });

  it('Grace, the admin who set it up, reads the probe list and inferences of session 1, and no note of her own', async () => {
    const { r } = await sessionAs('u-grace', 1);
    expect(r).not.toHaveProperty('coaching');
    /* Since 12 October a wait on a colleague is said as Baraka's own account, with the note beside it (248e81b38). */
    expect(r.probes.find((p: any) => p.who === 'Baraka Mwangi').probe[0]).toMatch(/^Baraka Mwangi says the work has been waiting on Rukia Otieno for SESSION-ONE-WAIT a decision on the discount since 24 September/);
    expect(r.inferences.map((i: any) => i.text)).toEqual(['SESSION-ONE-INFERENCE Nobody has priced the cookers yet.']);
    expect(everyString({ p: r.probes, i: r.inferences }).filter((s) => LATER.test(s))).toEqual([]);
  });
});

describe('session 2, the one the report holds now, reads as the working copy does', () => {
  it('Rukia reads session 2\'s note, probes and inferences', async () => {
    const { r } = await sessionAs('u-rukia', 2);
    expect(r.coaching.whyItMatters).toMatch(/^This is session 2 of 12 of this work\./);
    expect(r.coaching.beforeNextTime).toEqual(['Amani Wekesa has been waiting on you for SESSION-TWO-WAIT the price list since 29 September. Either do it, or give a date you can do it by.']);
    expect(r.inferences.map((i: any) => i.text)).toEqual(['SESSION-TWO-INFERENCE The Tuskys order slipped because of the price list.']);
  });

  it('the working copy itself serves only the latest session\'s inferences', async () => {
    const { svc } = serviceFor('sales');
    const whole: any = await svc.get('g1', 'u-rukia', 'org1');
    expect(whole.inferences.map((i: any) => i.text)).toEqual(['SESSION-TWO-INFERENCE The Tuskys order slipped because of the price list.']);
  });

  it('Faraji, whom an admin has not let in, is not on the probe list for the lead to chase', async () => {
    for (const n of [1, 2]) {
      const { r } = await sessionAs('u-rukia', n);
      expect(JSON.stringify(r.probes)).not.toMatch(/Faraji/);
    }
  });
});

describe('a performance plan about Amani', () => {
  it('Amani, the person reviewed, reads her own session 1 note and nothing of the lead\'s', async () => {
    const { r } = await sessionAs('u-amani', 1, 'review');
    expect(r.coaching.whyItMatters).toMatch(/^This is session 1 of this work\./);
    expect(r).not.toHaveProperty('probes');
    expect(r).not.toHaveProperty('inferences');
  });

  it('Juma, an admin who was not given access, is refused the session report', async () => {
    const { r } = await sessionAs('u-juma', 1, 'review');
    expect(r.refused).toBe('NotFoundException');
  });

  it('Rukia and Grace read session 1\'s probe list only', async () => {
    for (const userId of ['u-rukia', 'u-grace']) {
      const { r } = await sessionAs(userId, 1, 'review');
      expect(everyString(r.probes).filter((s) => LATER.test(s))).toEqual([]);
      expect(r.inferences.map((i: any) => i.text)).toEqual(['SESSION-ONE-INFERENCE Nobody has priced the cookers yet.']);
    }
  });
});

describe('what a synthesis keeps of the inferences', () => {
  const one = [{ id: 'i1', text: 'From session 1.', participantLabel: 'Participant A', reason: 'r' }];

  it('a list kept before items carried a session is that session\'s, and session 2\'s synthesis adds its own beside it', () => {
    const kept = keptWithEachSessionsOwn(one, [{ id: 'i1', text: 'From session 2.' }], 2, 1);
    expect(kept).toEqual([
      { id: 's1-i1', text: 'From session 1.', participantLabel: 'Participant A', reason: 'r', sessionNumber: 1 },
      { id: 'i1', text: 'From session 2.', sessionNumber: 2 },
    ]);
    expect(theInferencesOfSession(kept, 1, 2).map((i) => i.text)).toEqual(['From session 1.']);
    expect(theInferencesOfSession(kept, 2, 2).map((i) => i.text)).toEqual(['From session 2.']);
  });

  it('a second synthesis of the same session replaces only that session\'s', () => {
    const first = keptWithEachSessionsOwn([], [{ id: 'a', text: 'First read.' }], 1, 1);
    const again = keptWithEachSessionsOwn(first, [{ id: 'b', text: 'Second read.' }], 1, 1);
    expect(again.map((i) => i.text)).toEqual(['Second read.']);
  });

  it('an earlier session that was never kept has none, rather than a later session\'s', () => {
    expect(theInferencesOfSession(one, 1, 2)).toEqual([]);
    expect(theInferencesOfSession(one, 2, 2).map((i) => i.text)).toEqual(['From session 1.']);
  });
});

describe('the picture of a closed session waits on what was waited on then (found with request 102)', () => {
  it.each([
    ['Rukia', 'u-rukia', 'Baraka Mwangi is waiting on you for SESSION-ONE-WAIT a decision on the discount, with no escalation on record.'],
    ['Amani', 'u-amani', 'Baraka Mwangi is waiting on Rukia Otieno for SESSION-ONE-WAIT a decision on the discount, with no escalation on record.'],
    ['Baraka', 'u-baraka', 'You are waiting on Rukia Otieno for SESSION-ONE-WAIT a decision on the discount, with no escalation on record.'],
    ['Juma', 'u-juma', 'Baraka Mwangi is waiting on Rukia Otieno for SESSION-ONE-WAIT a decision on the discount, with no escalation on record.'],
    ['Grace', 'u-grace', 'Baraka Mwangi is waiting on Rukia Otieno for SESSION-ONE-WAIT a decision on the discount, with no escalation on record.'],
  ])('%s reads session 1\'s wait in session 1\'s picture, and not session 2\'s', async (_who, userId, line) => {
    const { r } = await sessionAs(userId, 1);
    expect(r.pictureLines).toContain(line);
    expect(JSON.stringify(r.pictureLines)).not.toMatch(/SESSION-TWO/);
  });

  it('session 2\'s picture still has session 2\'s wait', async () => {
    const { r } = await sessionAs('u-rukia', 2);
    expect(r.pictureLines).toContain('Amani Wekesa is waiting on you for SESSION-TWO-WAIT the price list, with no escalation on record.');
  });
});
