import { WhatsAppService } from './whatsapp.service';
import { theWeeklyInsightParagraph, theWeeklyInsight, sendTheAnchorWeeklyInsights, THE_INSIGHT_KIND } from './the-anchor-weekly-insight';
import { FIRST_MESSAGES, TEMPLATES } from './a-message-outside-the-window';
import type { TheMonthRecord } from '../board/the-anchor-month-record';

/**
 * ANCHOR PIECE 28: THE WEEKLY LEAD WHATSAPP INSIGHT (section 23; decision 105 item 2).
 * Names of people in that check-in, only what the lead reads on the board, nobody's words quoted. On Friday it is the
 * lead's one message of the day, so the daily summary is held back that day.
 */
const RECORD: TheMonthRecord = {
  ofHowMany: 5, checkedIn: 3, notYetThisRound: 2, saidWhatTheyWillDo: 2, commitmentsDone: 1, commitmentsOpen: 1,
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
  it('nothing is sent where nobody has checked in', () => {
    expect(theWeeklyInsightParagraph({ ...RECORD, checkedIn: 0 })).toBeNull();
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
