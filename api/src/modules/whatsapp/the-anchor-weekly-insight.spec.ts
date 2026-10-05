import { WhatsAppService } from './whatsapp.service';
import { theWeeklyInsightParagraph, theWeeklyInsight, sendTheAnchorWeeklyInsights, THE_INSIGHT_KIND, theOpenRoundOf } from './the-anchor-weekly-insight';
import { readTheMonthRecord } from '../board/the-anchor-month-record';
import { FIRST_MESSAGES, TEMPLATES } from './a-message-outside-the-window';
import type { TheMonthRecord } from '../board/the-anchor-month-record';

/**
 * ANCHOR PIECE 28: THE WEEKLY LEAD WHATSAPP INSIGHT (section 23; decision 105 item 2).
 * Names of people in that check-in, only what the lead reads on the board, nobody's words quoted. On Friday it is the
 * lead's one message of the day, so the daily summary is held back that day.
 */
const RECORD: TheMonthRecord = {
  ofHowMany: 5, checkedIn: 3, notYetThisRound: 2, saidWhatTheyWillDo: 2, commitmentsDone: 1, commitmentsOpen: 1,
  checkedInThisRound: 3, saidWhatTheyWillDoThisRound: 2,
  waiting: [{ from: 'Baraka', on: 'Rukia', what: 'the sales deck' }], handoffsCleared: 1, offers: { pair: 0, project: 0, aim: 0 },
  startedOn: new Date('2026-09-08T08:00:00Z'),
  doneByPerson: [{ participantId: 'p-rukia', name: 'Rukia', clause: 'send the deck to the client', clauseToThem: 'send the deck to the client', settledBy: 'SAID', doneAt: null }],
};

describe('what the lead reads', () => {
  it('a useful insight in sentences, with names of people in the check-in and nobody\'s words quoted', () => {
    const p = theWeeklyInsightParagraph(RECORD)!;
    expect(p).toBe('Your team is starting to move. This week, three of five people checked in, and two have said what they will do themselves. Rukia committed to send the deck to the client, and Rukia says it is done. One thing still needs attention. Baraka is waiting on Rukia for the sales deck. Groundwork is working on that with them.');
    expect(p).not.toMatch(/["“”]|:/);
    const m = theWeeklyInsight('Amina', p, 'https://myground.work/grounds/g-1/board');
    expect(m.text).toBe(`Hi Amina. ${p} This week's picture is on the board at https://myground.work/grounds/g-1/board, if you want the rest.`);
    expect(m.kind).toBe(THE_INSIGHT_KIND);
  });
  it('nothing is sent where nobody has checked in this week, whatever earlier weeks held', () => {
    expect(theWeeklyInsightParagraph({ ...RECORD, checkedInThisRound: 0 })).toBeNull();
  });
  /* Review of piece 28: "This week" counts only the round that is open. */
  it('"This week" is this round, where the month holds more', () => {
    const p = theWeeklyInsightParagraph({ ...RECORD, checkedIn: 5, saidWhatTheyWillDo: 4, checkedInThisRound: 2, saidWhatTheyWillDoThisRound: 1 })!;
    expect(p).toContain('This week, two of five people checked in, and one has said what they will do themselves.');
  });
  it('the template ends with words, not a blank, and counts as Groundwork writing first', () => {
    expect(TEMPLATES[THE_INSIGHT_KIND].body.trim().endsWith('rest.')).toBe(true);
    expect(FIRST_MESSAGES.has(THE_INSIGHT_KIND)).toBe(true);
  });
});

describe('it replaces that day\'s daily summary', () => {
  it('once the insight has gone today, the daily summary is held back', async () => {
    const wa: any = new WhatsAppService({ get: () => undefined } as any, { whatsAppSend: { findMany: jest.fn(async () => [{ kind: THE_INSIGHT_KIND }]) } } as any);
    expect(await wa.howOftenToday('+254712345678', 'lead-summary')).not.toBeNull();
  });
  it('on a day it has not gone, the daily summary goes as before', async () => {
    const wa: any = new WhatsAppService({ get: () => undefined } as any, { whatsAppSend: { findMany: jest.fn(async () => []) } } as any);
    expect(await wa.howOftenToday('+254712345678', 'lead-summary')).toBeNull();
  });
});

describe('who it goes to', () => {
  const deps = (on: boolean) => {
    const sent: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : null)) },
      ground: { findMany: jest.fn(async () => [{ id: 'g-1', organizationId: 'org-1', overWhatsApp: true, initiatorId: 'u-amina', startedFrom: 'anchor' }, { id: 'g-2', organizationId: 'org-1', overWhatsApp: true, initiatorId: 'u-omar', startedFrom: null }]) },
      user: { findUnique: jest.fn(async ({ where }: any) => ({ firstName: where.id === 'u-amina' ? 'Amina' : 'Omar', phoneNumber: '+254700000000', deletedAt: null })) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      rosterEntry: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      organization: { findMany: jest.fn(async () => [{ id: 'org-1', whatsappAddOnOn: true }]), findUnique: jest.fn(async () => ({ whatsappAddOnOn: true })) },
      whatsAppConnection: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
      groundParticipant: { findMany: jest.fn(async () => []) }, checkIn: { findMany: jest.fn(async () => []) }, groundCommitment: { findMany: jest.fn(async () => []) },
      groundDependency: { findMany: jest.fn(async () => []) }, recommendation: { findMany: jest.fn(async () => []) },
    };
    const whatsapp: any = { isEnabled: jest.fn(async () => true), sendFor: jest.fn(async (...a: any[]) => { sent.push(a); return { sent: true }; }) };
    return { d: { prisma, whatsapp, frontendUrl: 'https://myground.work' }, sent };
  };
  it('with the switch off, nothing is sent at all', async () => {
    const { d, sent } = deps(false);
    expect(await sendTheAnchorWeeklyInsights(d as any)).toEqual({ tried: 0 });
    expect(sent).toEqual([]);
  });
  it('never to the lead of a check-in that did not start from the anchor link, and never to a person in one', async () => {
    const { d, sent } = deps(true);
    await sendTheAnchorWeeklyInsights(d as any);
    expect(sent.every((s) => !String(s[2]).startsWith('Hi Omar'))).toBe(true);
  });
});

describe('the round is the open one, and the counts are its own', () => {
  const people = ['p-amina', 'p-rukia', 'p-baraka'].map((id) => ({ id, managingOnly: false, userId: `u-${id}`, user: { firstName: id.slice(2), lastName: null, awaitingOrgApproval: false }, nameGiven: null, createdAt: new Date('2026-09-01') }));
  const rows = [
    { participantId: 'p-amina', sessionNumber: 1, status: 'COMPLETED', isSetup: false },
    { participantId: 'p-rukia', sessionNumber: 1, status: 'COMPLETED', isSetup: false },
    { participantId: 'p-baraka', sessionNumber: 1, status: 'COMPLETED', isSetup: false },
    { participantId: 'p-amina', sessionNumber: 2, status: 'COMPLETED', isSetup: false },
    { participantId: 'p-rukia', sessionNumber: 2, status: 'IN_PROGRESS', isSetup: false },
    { participantId: 'p-baraka', sessionNumber: 2, status: 'NOT_STARTED', isSetup: false },
  ];
  const prisma: any = {
    groundParticipant: { findMany: jest.fn(async () => people) },
    checkIn: { findMany: jest.fn(async (a: any) => (a?.where?.status ? rows.filter((r) => r.status === a.where.status) : rows)) },
    groundCommitment: { findMany: jest.fn(async () => [
      { participantId: 'p-rukia', status: 'UNKNOWN', text: 'I will send the deck.', source: 'CHECK_IN', explicit: true, statedInSession: 1 },
      { participantId: 'p-baraka', status: 'UNKNOWN', text: 'I will call the supplier.', source: 'CHECK_IN', explicit: true, statedInSession: 1 },
      { participantId: 'p-amina', status: 'UNKNOWN', text: 'I will sign the lease.', source: 'CHECK_IN', explicit: true, statedInSession: 2 },
    ]) },
    groundDependency: { findMany: jest.fn(async () => []) },
    recommendation: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => ({ startsAt: new Date('2026-09-01'), createdAt: new Date('2026-09-01') })) },
  };
  it('reads the open round as the board does, and counts only it', async () => {
    const round = await theOpenRoundOf(prisma, 'g-1');
    expect(round).toBe(2);
    const r = await readTheMonthRecord(prisma, 'g-1', round);
    expect(r.checkedIn).toBe(3);
    expect(r.checkedInThisRound).toBe(1);
    expect(r.saidWhatTheyWillDo).toBe(3);
    expect(r.saidWhatTheyWillDoThisRound).toBe(1);
    expect(theWeeklyInsightParagraph(r)).toContain('This week, one of three people checked in, and one has said what they will do themselves.');
  });
});
