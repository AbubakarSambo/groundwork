import { sendTheParticipantsWeeks, theirWeekInWords } from './the-participants-week';
import { ROUTINE_EMAILS } from './one-routine-message-a-day';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';

/**
 * THE PARTICIPANT'S WEEK (decision 109; spec 25), AS VERA READS IT.
 *
 * Vera is in "Sales team, Q4" (people see each other) and "Kenya launch" (they do not), both still going, and in "Old pilot", which stalled. Her
 * board holds her own promises, and two requests waiting on her. She reads her own words and counts; the subject carries no name; nothing from
 * Old pilot; and a colleague's own promises are never in it, because the board never holds them.
 */
const board = (over: any = {}) => ({
  keptLately: { kept: 3, of: 4, says: 'x' },
  saidYoudDo: [
    { text: 'Send my manager the deck.', checkIn: 'Sales team, Q4', state: 'open' },
    { text: 'Call the Nairobi client', checkIn: 'Kenya launch', state: 'open' },
    { text: 'Close out the old pilot report', checkIn: 'Old pilot', state: 'open' },
    { text: 'Sent the pricing', checkIn: 'Sales team, Q4', state: 'kept' },
  ],
  askedOfYou: { items: [
    { who: 'Omar', what: 'The signed order form.', checkIn: 'Sales team, Q4' },
    { who: null, what: 'The venue contract', checkIn: 'Kenya launch' },
    { who: 'Bisi', what: 'The old numbers', checkIn: 'Old pilot' },
  ] },
  ...over,
});

function world(b: any = board(), own: any[] = [{ what: 'The budget from finance', ground: { label: 'Sales team, Q4' } }, { what: 'The retired report', ground: { label: 'Old pilot' } }]) {
  const sent: any[] = [];
  const prisma: any = {
    groundParticipant: { findMany: async () => [
      { id: 'p1', userId: 'u-v', ground: { label: 'Sales team, Q4' } },
      { id: 'p2', userId: 'u-v', ground: { label: 'Kenya launch' } },
    ] },
    user: { findUnique: async () => ({ email: 'vera@x.test', firstName: 'Vera', role: 'MEMBER', organizationId: 'o1', isActive: true, deletedAt: null, awaitingOrgApproval: false }) },
    groundDependency: { findMany: async () => own },
  };
  const board_ = { forReader: jest.fn(async () => b) };
  const email = { sendYourWeek: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }) };
  return { run: () => sendTheParticipantsWeeks({ prisma, board: board_, email, frontendUrl: 'https://app.test/' }), sent, board_ };
}

describe('what Vera reads', () => {
  it('her own progress, what is open from her, what she waits on, and what waits on her', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'vera@x.test',
      subject: 'You kept 3 of 4 things you said you would do; 2 requests are waiting on you',
      lines: [
        'Hello Vera. Here is your week in Groundwork. Only you can read this.',
        'Your progress: you kept 3 of the 4 things you said you would do in the last four weeks.',
        'Still open from you: "Send my manager the deck" and "Call the Nairobi client".',
        'You are waiting on: "The budget from finance".',
        '2 requests are waiting on you: Omar is waiting for "The signed order form" in "Sales team, Q4" and somebody is waiting for "The venue contract" in "Kenya launch".',
      ],
      linkLabel: 'Open your page',
      linkUrl: 'https://app.test/you',
    }]);
  });

  it('says "somebody" where the check-in does not let her see who, and nothing from the check-in that stalled', async () => {
    const w = world();
    await w.run();
    const text = w.sent[0].lines.join(' ');
    expect(text).toContain('somebody is waiting for "The venue contract"');
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
    expect(m.subject).toBe('1 request is waiting on you');
  });

  it('sends nothing when nothing useful is left', async () => {
    const empty = world(board({ keptLately: null, saidYoudDo: [], askedOfYou: { items: [] } }), []);
    expect(await empty.run()).toEqual({ tried: 0 });
    expect(theirWeekInWords('Vera', { kept: null, open: [], waitingOn: [], waitingOnYou: [] })).toBeNull();
  });

  it('falls back to what is open, then what she waits on, in the subject', () => {
    expect(theirWeekInWords('V', { kept: null, open: ['a', 'b'], waitingOn: [], waitingOnYou: [] })!.subject).toBe('2 things you said you would do are still open');
    expect(theirWeekInWords('V', { kept: null, open: [], waitingOn: ['a'], waitingOnYou: [] })!.subject).toBe('You are waiting on 1 thing');
  });

  it('is a routine mail we decided to send, so the opt-out and the one a day hold', () => {
    expect(whatThisMailIs('sendYourWeek')).toBe('we decided to send it');
    expect(ROUTINE_EMAILS.has('sendYourWeek')).toBe(true);
  });
});
