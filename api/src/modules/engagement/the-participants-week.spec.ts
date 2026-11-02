import { sendTheParticipantsWeeks, theirWeekInWords, theDayTheCountBegins } from './the-participants-week';
import { ROUTINE_EMAILS } from './one-routine-message-a-day';
import { ENGAGEMENT_MOMENT_KEY } from './the-engagement-release-moment';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';

/**
 * THE PARTICIPANT'S WEEK (decision 109; spec 25), AS VERA READS IT.
 *
 * Vera is in "Sales team, Q4" (people see each other) and "Kenya launch" (they do not), both still going, and in "Old pilot", which stalled. Her
 * board holds her own promises, and two requests waiting on her. She reads her own words and counts; the subject carries no name; nothing from
 * Old pilot; and a colleague's own promises are never in it, because the board never holds them.
 */
/* Pinned (25 October): with the real clock the "since" day in Vera's line moved with each day the suite ran, and failed. */
const NOW = new Date('2026-10-24T09:00:00Z');
const recent = new Date(NOW.getTime() - 5 * 86_400_000);
const board = (over: any = {}) => ({
  saidYoudDo: [
    { text: 'Send the deck to Kofi.', checkIn: 'Sales team, Q4', state: 'open' },
    { text: 'Call the bank', checkIn: 'Kenya launch', state: 'open' },
    { text: 'Close out the old pilot report', checkIn: 'Old pilot', state: 'open' },
    { text: 'Sent the pricing', checkIn: 'Sales team, Q4', state: 'kept' },
  ],
  askedOfYou: { items: [
    { who: 'James', what: 'The pricing sheet.', checkIn: 'Kenya launch' },
    { who: null, what: 'The venue contract', checkIn: 'Sales team, Q4' },
    { who: 'Bisi', what: 'The old numbers', checkIn: 'Old pilot' },
  ] },
  ...over,
});

const commitmentsDone = [
  { status: 'DONE', createdAt: recent, settledAt: recent }, { status: 'DONE', createdAt: recent, settledAt: recent }, { status: 'DONE', createdAt: recent, settledAt: recent },
  { status: 'NOT_DONE', createdAt: recent, settledAt: recent },
];
const ownWaits = [
  { what: 'the budget to be approved', onLabel: null, ground: { label: 'Sales team, Q4', peersVisibleToEachOther: true }, onParticipant: { nameGiven: null, user: { firstName: 'Lucy' } } },
  { what: 'the retired report', onLabel: null, ground: { label: 'Old pilot', peersVisibleToEachOther: true }, onParticipant: null },
];

function world(b: any = board(), own: any[] = ownWaits, commitments: any[] = commitmentsDone) {
  const sent: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === ENGAGEMENT_MOMENT_KEY ? { value: { at: '2026-10-01T00:00:00Z' } } : null) },
    groundParticipant: { findMany: async () => [
      { id: 'p1', userId: 'u-v', groundId: 'g1', ground: { label: 'Sales team, Q4', runsUntilEnded: true }, checkIns: [] },
      { id: 'p2', userId: 'u-v', groundId: 'g2', ground: { label: 'Kenya launch', runsUntilEnded: false, endsAt: new Date('2099-01-01'), createdAt: new Date('2026-10-02') }, checkIns: [] },
      { id: 'p3', userId: 'u-v', groundId: 'g3', ground: { label: 'Dead pilot', runsUntilEnded: false, endsAt: new Date('2026-09-01'), createdAt: new Date('2026-06-01') }, checkIns: [] },
    ] },
    user: { findUnique: async () => ({ email: 'vera@x.test', firstName: 'Vera', role: 'MEMBER', organizationId: 'o1', isActive: true, deletedAt: null, awaitingOrgApproval: false }) },
    groundDependency: { findMany: async () => own },
    groundCommitment: { findMany: jest.fn(async () => commitments) },
  };
  const board_ = { forReader: jest.fn(async () => b) };
  const email = { sendYourWeek: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }) };
  return { run: () => sendTheParticipantsWeeks({ prisma, board: board_, email, frontendUrl: 'https://app.test/' }, NOW), sent, board_, prisma };
}

describe('what Vera reads', () => {
  it('her own progress, what is open from her, what she waits on, and what waits on her, in full sentences', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'vera@x.test',
      subject: 'You kept three of the four things you said you would do; two requests are waiting on you',
      lines: [
        'Hello Vera. Here is your week in Groundwork. Only you can read this.',
        /* Her four promises were all said five days ago, so the count says since that day, not "in the last four weeks" (engine test, Mercy's week). */
        `You kept three of the four things you said you would do since ${theDayTheCountBegins([{ createdAt: recent }], NOW)}.`,
        /* Changed 19 October (messages test, finding 14): each open thing is said on its own with the check-in it was said in, the latest
           first, where it was a list of loose quotes. Her board here carries no day for them, so none is said. */
        'Two things you said you would do are still open.',
        'In "Kenya launch", you said "Call the bank".',
        'In "Sales team, Q4", you said "Send the deck to Kofi".',
        'You are waiting for "the budget to be approved" from Lucy.',
        'James is waiting for "The pricing sheet" from you in "Kenya launch".',
        'Somebody is waiting for "The venue contract" from you in "Sales team, Q4".',
      ],
      linkLabel: 'Open your page',
      linkUrl: 'https://app.test/you',
    }]);
    expect(w.sent[0].lines.join(' ')).not.toMatch(/:/);
    expect(w.sent[0].subject).not.toMatch(/:/);
  });

  it('the kept count is read only over check-ins still going', async () => {
    const w = world();
    await w.run();
    const where = (w.prisma.groundCommitment.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.groundId.in.sort()).toEqual(['g1', 'g2']);
    expect(where.participantId.in.sort()).toEqual(['p1', 'p2']);
  });

  it('never a subject like "You kept none of two": a kept count of nothing is left out', async () => {
    const w = world(board(), ownWaits, [{ status: 'NOT_DONE', createdAt: recent, settledAt: recent }, { status: 'NOT_DONE', createdAt: recent, settledAt: recent }]);
    await w.run();
    expect(w.sent[0].subject).toBe('Two requests are waiting on you');
    expect(w.sent[0].lines.join(' ')).not.toMatch(/You kept/);
  });

  it('a check-in left open that nobody has answered since and has nothing to come is never written about', async () => {
    const w = world(board({ saidYoudDo: [{ text: 'Close the dead pilot', checkIn: 'Dead pilot', state: 'open' }], askedOfYou: { items: [{ who: null, what: 'Old thing', checkIn: 'Dead pilot' }] }, keptLately: null }), [], []);
    expect(await w.run()).toEqual({ tried: 0 });
  });

  it('says "somebody" where the check-in does not let her see who, and nothing from the check-in that stalled', async () => {
    const w = world();
    await w.run();
    const text = w.sent[0].lines.join(' ');
    expect(text).toContain('Somebody is waiting for "The venue contract" from you in "Sales team, Q4".');
    expect(text).not.toMatch(/Old pilot|old pilot|Bisi|retired report|old numbers/);
  });

  it('only reads her own board, for her, and sends only to her', async () => {
    const w = world();
    await w.run();
    expect(w.board_.forReader).toHaveBeenCalledWith({ userId: 'u-v', email: 'vera@x.test', organizationId: 'o1', role: 'MEMBER' });
    expect(w.sent.map((s) => s.to)).toEqual(['vera@x.test']);
  });

  it('the subject names nobody', () => {
    const m = theirWeekInWords('Vera', { kept: null, open: [], waitingOn: [], waitingOnYou: [{ who: 'Omar', what: 'x', checkIn: 'A' }] })!;
    expect(m.subject).toBe('One request is waiting on you');
  });

  it('sends nothing when nothing useful is left', async () => {
    const empty = world(board({ keptLately: null, saidYoudDo: [], askedOfYou: { items: [] } }), [], []);
    expect(await empty.run()).toEqual({ tried: 0 });
    expect(theirWeekInWords('Vera', { kept: null, open: [], waitingOn: [], waitingOnYou: [] })).toBeNull();
  });

  it('falls back to what is open, then what she waits on, in the subject', () => {
    expect(theirWeekInWords('V', { kept: null, open: ['a', 'b'], waitingOn: [], waitingOnYou: [] })!.subject).toBe('Two things you said you would do are still open');
    expect(theirWeekInWords('V', { kept: null, open: [], waitingOn: [{ what: 'a', from: null }], waitingOnYou: [] })!.subject).toBe('You are waiting on one thing');
  });

  it('is a routine mail we decided to send, so the opt-out and the one a day hold', () => {
    expect(whatThisMailIs('sendYourWeek')).toBe('we decided to send it');
    expect(ROUTINE_EMAILS.has('sendYourWeek')).toBe(true);
  });
});

/**
 * FOUND ON THE TEST BED, 22 OCTOBER, as Sade and Amani read their week.
 */
describe('what the week says when it would only say a thing twice', () => {
  it('leaves off "from" when who they wait on only says the thing again', () => {
    const w = theirWeekInWords('Sade', { kept: null, open: [], waitingOn: [{ what: 'who owns the distributor next step', from: 'the person who owns the distributor next step' }, { what: 'a signature from the buyer', from: 'the buyer' }, { what: 'the price list', from: 'Vera' }], waitingOnYou: [] })!;
    expect(w.lines).toContain('You are waiting for "who owns the distributor next step".');
    expect(w.lines).toContain('You are waiting for "the price list" from Vera.');
    expect(w.lines.join(' ')).not.toMatch(/from the person who owns/);
  });
  it('says all four, not "four of the four"', () => {
    const w = theirWeekInWords('Amani', { kept: { kept: 4, of: 4 }, open: [], waitingOn: [], waitingOnYou: [] })!;
    expect(w.subject).toBe('You kept all four things you said you would do');
    expect(w.lines).toContain('You kept all four things you said you would do in the last four weeks.');
    expect(theirWeekInWords('A', { kept: { kept: 3, of: 4 }, open: [], waitingOn: [], waitingOnYou: [] })!.subject).toBe('You kept three of the four things you said you would do');
  });
});

/*
 * FATUMA'S WEEK (decision 137; decision 139, must-fix 4). Kevin said every week that he was waiting on Fatuma for the final prices; she had sent
 * them on 7 October and never promised them again. She was emailed three weeks running "Kevin Odhiambo is waiting for "the final prices" from
 * you", and it was counted in her subject. Kevin's claim is his account: it is told to her as what he said, and it is not counted against her.
 * Imani's wait on her for the purchase request is one Fatuma promised herself, so that one is still a request waiting on her.
 */
describe('what Fatuma reads when Kevin says he is waiting on her', () => {
  function fatumasWorld(herPromises: any[]) {
    const sent: any[] = [];
    const onHer = [
      { id: 'd1', groundId: 'g1', onParticipantId: 'pf', what: 'the final prices', ground: { label: 'Duka pilot' } },
      { id: 'd2', groundId: 'g1', onParticipantId: 'pf', what: 'the purchase request for the phone', ground: { label: 'Duka pilot' } },
    ];
    const prisma: any = {
      platformSetting: { findUnique: async ({ where }: any) => (where.key === ENGAGEMENT_MOMENT_KEY ? { value: { at: '2026-10-01T00:00:00Z' } } : null) },
      groundParticipant: { findMany: async () => [{ id: 'pf', userId: 'u-f', groundId: 'g1', ground: { label: 'Duka pilot', runsUntilEnded: true }, checkIns: [] }] },
      user: { findUnique: async () => ({ email: 'fatuma@x.test', firstName: 'Fatuma', role: 'MEMBER', organizationId: 'o1', isActive: true, deletedAt: null, awaitingOrgApproval: false }) },
      groundDependency: { findMany: async ({ where }: any) => (where.onParticipantId ? onHer : []) },
      groundCommitment: { findMany: async ({ where }: any) => (where.status ? [] : herPromises) },
    };
    const b = { saidYoudDo: [], keptLately: null, askedOfYou: { items: [
      { who: 'Kevin Odhiambo', what: 'the final prices', checkIn: 'Duka pilot' },
      { who: 'Imani Hassan', what: 'the purchase request for the phone', checkIn: 'Duka pilot' },
    ] } };
    const email = { sendYourWeek: jest.fn(async (to: string, subject: string, lines: string[]) => { sent.push({ subject, lines }); }) };
    return { run: () => sendTheParticipantsWeeks({ prisma, board: { forReader: async () => b }, email, frontendUrl: 'https://app.test/' }, NOW), sent };
  }

  it('Kevin\'s claim reads as what he said, and only the wait she promised is counted against her', async () => {
    const w = fatumasWorld([{ groundId: 'g1', participantId: 'pf', text: 'I will approve the purchase request once the quote comes in.' }]);
    await w.run();
    expect(w.sent[0].subject).toBe('One request is waiting on you');
    expect(w.sent[0].lines).toEqual([
      'Hello Fatuma. Here is your week in Groundwork. Only you can read this.',
      'Imani Hassan is waiting for "the purchase request for the phone" from you in "Duka pilot".',
      'Kevin Odhiambo says the work is waiting for "the final prices" from you in "Duka pilot". That is what Kevin Odhiambo said, and you have not said it yourself. Say in your check-in whether it is yours to give.',
    ]);
    expect(w.sent[0].lines.join(' ')).not.toMatch(/Kevin Odhiambo is waiting/);
    /* No colon anywhere: the note beside a claim is a full sentence or nothing (changed 3 November, F2). */
    expect(w.sent[0].lines.join(' ')).not.toMatch(/:/);
  });

  it('once she says the prices are hers to send, it is a request waiting on her', async () => {
    const w = fatumasWorld([{ groundId: 'g1', participantId: 'pf', text: 'I will send the updated prices on Friday.' }]);
    await w.run();
    expect(w.sent[0].lines).toContain('Kevin Odhiambo is waiting for "the final prices" from you in "Duka pilot".');
  });
});

/*
 * DAVID'S THREE WAITS ARE ONE, SAID IN HIS OWN PERSON (messages test after the fixes, 19 October, finding 11). "Your week" to David
 * Mwangi, Thursday 15 October, from the run's own rows: on Monday he said "I don't know who my supervisor is yet.", and on Wednesday
 * "I don't know my supervisor."
 */
describe('what David reads about what he is waiting for', () => {
  const DAVIDS = {
    kept: null, open: [], waitingOnYou: [],
    waitingOn: [
      { what: 'a clear role defined for the Jamii Clinics employment claim', from: 'my supervisor' },
      { what: 'the name of their supervisor', from: null },
      { what: 'a clear role for this claim', from: null },
    ],
    theirOwnWords: ["I don't have a clear role defined for this claim yet.", "I don't know who my supervisor is yet.", "I don't know my supervisor."],
  };
  it('now: one line, in his own person', () => {
    const lines = theirWeekInWords('David', DAVIDS as any)!.lines.filter((l) => l.startsWith('You are waiting for'));
    expect(lines).toEqual(['You are waiting for "a clear role defined for the Jamii Clinics employment claim" from your supervisor, and for the name of your supervisor.']);
  });
  it('two waits with different customers are never one', () => {
    const lines = theirWeekInWords('Mercy', { kept: null, open: [], waitingOnYou: [], waitingOn: [{ what: 'the signed order for Greenfield', from: null }, { what: 'the signed order for Tuskys', from: null }] } as any)!.lines.filter((l) => l.startsWith('You are waiting for'));
    expect(lines).toEqual(['You are waiting for "the signed order for Greenfield".', 'You are waiting for "the signed order for Tuskys".']);
  });
  it('"their" stays where their own words do not say "my" of it', () => {
    const lines = theirWeekInWords('Njeri', { kept: null, open: [], waitingOnYou: [], waitingOn: [{ what: 'their payment for FN-006', from: 'Baraka Hardware' }], theirOwnWords: ['I raise the fee notes.'] } as any)!.lines.filter((l) => l.startsWith('You are waiting for'));
    expect(lines).toEqual(['You are waiting for "their payment for FN-006" from Baraka Hardware.']);
  });
});
