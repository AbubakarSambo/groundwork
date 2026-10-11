import { GroundScenario } from '@prisma/client';
import {
  boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SETUP_ADMIN, AMINA, RUKIA, BARAKA,
  handoff, commitment, answered,
} from './the-switchboards-sections-harness';
import { isAboutTheThing } from './the-blockers';

/**
 * REQUEST 105: BLOCKERS GET ONE SECTION.
 *
 * The prototype's "Blockers. Each with its history and the one thing that would clear it." One entry
 * per open blocker: who is waiting on whom for what, every time it was raised, what the proof shows,
 * the time given, and what would clear it only where somebody said so. Read as every reader, on the
 * sales run (api/journey/all-24/re-f/sales.json: Femi, Ngozi and Kwame's own words), and on a blocker
 * raised in three sessions.
 */
const byWhat = (b: any) => Object.fromEntries(((b.blockers ?? []) as any[]).map((x) => [x.name, x]));

describe('the sales run, as Bisi who runs it', () => {
  it('reads every open blocker in full sentences, with when it was raised and what would clear it', async () => {
    const b = byWhat(await boardAs(SALES_RUN, ...BISI));
    expect(Object.keys(b).sort()).toEqual(['a date for the credit decision', 'the approval of five applications', 'the bank statements']);

    expect(b['the bank statements']).toMatchObject({
      who: 'Femi Okonkwo',
      state: 'blocking',
      says: 'Femi Okonkwo is waiting for the bank statements.',
      raised: { times: 1, says: 'This was raised once, on 16 September.', inSessions: 'It was raised in session 2.', sessions: [2] },
      proof: { state: 'none', says: 'Nothing on record proves it yet. It rests on what Femi Okonkwo said.' },
      timeGiven: 'No time has been given for it.',
      wouldClearIt: 'Femi Okonkwo said, "I will visit a few of them again this week to see if I can collect the statements myself."',
    });
    expect(b['a date for the credit decision']).toMatchObject({
      says: 'Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision.',
      wouldClearIt: null,
      wouldClearItSays: 'Nobody has said what would clear it yet.',
    });
    expect(b['the approval of five applications']).toMatchObject({
      says: 'Kwame Mensah says the work is waiting on you for the approval of five applications. Not backed: no attempt to unblock mentioned.',
      state: 'waiting',
      raised: { inSessions: null },
    });
  });

  it('never carries a colon joining two pieces, a label on a person, or a working note', async () => {
    const all = JSON.stringify((await boardAs(SALES_RUN, ...BISI)).blockers);
    expect(all).not.toMatch(/Raised:|Waiting on:|Would clear it:|What the proof shows:/);
    expect(all).not.toMatch(/\b(PIP|at risk|exit|underperform)/i);
  });
});

describe('the sales run, as each person who checks in', () => {
  it('Femi reads his own blocker as his, in "you"', async () => {
    const b = byWhat(await boardAs(SALES_RUN, ...FEMI));
    expect(b['the bank statements']).toMatchObject({
      who: 'You',
      says: 'You are waiting for the bank statements.',
      proof: { says: 'Nothing on record proves it yet. It rests on what you said.' },
      wouldClearIt: 'You said, "I will visit a few of them again this week to see if I can collect the statements myself."',
    });
  });

  it('Kwame reads that he is waiting on Bisi by name', async () => {
    const b = byWhat(await boardAs(SALES_RUN, ...KWAME));
    expect(b['the approval of five applications'].says).toBe('You say the work is waiting on Bisi Adeyemi for the approval of five applications. Not backed: no attempt to unblock mentioned.');
  });

  it('where people see only themselves, Ngozi reads only her own blocker', async () => {
    const b = await boardAs({ ...SALES_RUN, peersVisibleToEachOther: false }, ...NGOZI);
    expect((b.blockers as any[]).map((x) => x.name)).toEqual(['a date for the credit decision']);
    expect(JSON.stringify(b.blockers)).not.toMatch(/Femi|Kwame|statements|applications/);
  });
});

describe('the sales run, as an admin', () => {
  it('Juma, an admin who only reads, reads every blocker with names, as the lead does', async () => {
    const b = byWhat(await boardAs(SALES_RUN, ...JUMA));
    expect(b['the bank statements'].says).toBe('Femi Okonkwo is waiting for the bank statements.');
    expect(b['the approval of five applications'].says).toBe('Kwame Mensah says the work is waiting on Bisi Adeyemi for the approval of five applications. Not backed: no attempt to unblock mentioned.');
  });

  it('the admin who set it up reads the same', async () => {
    const b = byWhat(await boardAs({ ...SALES_RUN, createdByUserId: 'u-setup' }, ...SETUP_ADMIN));
    expect(b['a date for the credit decision'].says).toBe('Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision.');
  });
});

describe('a blocker raised in three sessions, with a document behind one line and a time given', () => {
  const SETUP = {
    checkIns: [answered('p-rukia', 1, '2026-09-01T16:00:00Z'), answered('p-rukia', 2, '2026-09-10T16:00:00Z'), answered('p-rukia', 3, '2026-09-23T16:00:00Z'), answered('p-baraka', 1)],
    dependencies: [
      handoff('d-1', 'p-rukia', 'the pipeline fix', { onParticipantId: 'p-baraka', sourceCheckInId: 'c1-p-rukia', dueSaid: 'by Friday', dueOn: new Date('2026-09-05T00:00:00Z'), then: 'the reporting system can restart', createdAt: new Date('2026-09-01T09:00:00Z') }),
      handoff('d-2', 'p-rukia', 'pipeline fix', { onParticipantId: 'p-baraka', sourceCheckInId: 'c2-p-rukia', createdAt: new Date('2026-09-10T09:00:00Z') }),
      handoff('d-3', 'p-rukia', 'the pipeline fix', { onParticipantId: 'p-baraka', sourceCheckInId: 'c3-p-rukia', createdAt: new Date('2026-09-23T09:00:00Z') }),
    ],
    lines: [{ id: 'e-1', participantId: 'p-rukia', type: 'PROGRESS', text: 'The ticket shows the pipeline fix was asked for on 1 September.', checkInId: 'c1-p-rukia', recallBased: false, anchoredDocumentId: 'doc-1', anchoredOrigin: null }],
    turns: [{ checkInId: 'c1-p-rukia', content: 'I need the pipeline fix by Friday.' }],
  };

  it('Amina reads every time, the sessions, the proof, the day that passed, and what it holds up', async () => {
    const b = byWhat(await boardAs(SETUP, ...AMINA));
    expect(Object.keys(b)).toEqual(['the pipeline fix']);
    const x = b['the pipeline fix'];
    expect(x.says).toBe('Rukia Mwangi says the work is waiting on Baraka Otieno for the pipeline fix. Not backed: no attempt to unblock mentioned.');
    expect(x.raised.says).toBe('This has been raised 3 times, from 1 September to 23 September.');
    expect(x.raised.inSessions).toBe('It was raised in sessions 1, 2 and 3.');
    expect(x.proof).toEqual({ state: 'shown', says: 'A document backs what Rukia Mwangi said about it.' });
    expect(x.timeGiven).toBe('The time given for it was "by Friday". It was raised again after 5 September, the day it was due.');
    expect(x.holdingUp).toBe('Once it is cleared, the reporting system can restart.');
  });

  it('Baraka, who is waited on, reads it with "you"', async () => {
    const b = byWhat(await boardAs(SETUP, ...BARAKA));
    expect(b['the pipeline fix'].says).toBe('Rukia Mwangi says the work is waiting on you for the pipeline fix. Not backed: no attempt to unblock mentioned.');
  });

  it('on a performance plan, an admin without access to it is not served the board at all', async () => {
    await expect(boardAs({ ...SETUP, scenario: GroundScenario.PIP }, ...JUMA)).rejects.toThrow();
  });

  it('a cleared blocker is not a blocker', async () => {
    const b = await boardAs({ ...SETUP, dependencies: SETUP.dependencies.map((d) => ({ ...d, status: 'CLEARED', clearedAt: new Date('2026-09-24T09:00:00Z') })) }, ...AMINA);
    expect(b.blockers).toBeUndefined();
  });

  it('a promise about the thing is what would clear it, and only then', async () => {
    const withAPromise = { ...SETUP, commitments: [commitment('k-1', 'p-baraka', 'I will ship the pipeline fix on Monday.')] };
    expect(byWhat(await boardAs(withAPromise, ...AMINA))['the pipeline fix'].wouldClearIt).toBe('Baraka Otieno committed to ship the pipeline fix on Monday.');
    /* Baraka reads his own promise as his. Rukia, who is waiting on him for it, reads what he promised about it. */
    expect(byWhat(await boardAs(withAPromise, ...BARAKA))['the pipeline fix'].wouldClearIt).toBe('You committed to ship the pipeline fix on Monday.');
    expect(byWhat(await boardAs(withAPromise, ...RUKIA))['the pipeline fix'].wouldClearIt).toBe('Baraka Otieno committed to ship the pipeline fix on Monday.');
    /* A promise from somebody who is not in the wait is not hers to read on her own board. */
    const fromSomebodyElse = { ...SETUP, commitments: [commitment('k-1', 'p-amina', 'I will ship the pipeline fix on Monday.')] };
    expect(byWhat(await boardAs(fromSomebodyElse, ...RUKIA))['the pipeline fix'].wouldClearIt).toBeNull();
  });
});

describe('what counts as being about the thing', () => {
  it('needs the head word and half of the words', () => {
    expect(isAboutTheThing('I will collect the statements myself.', 'the bank statements')).toBe(true);
    expect(isAboutTheThing('I will continue to follow up with the Head of Credit.', 'a date for the credit decision')).toBe(false);
    expect(isAboutTheThing('The bank called.', 'the bank statements')).toBe(false);
  });
});
