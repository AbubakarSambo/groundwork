import { PatternsService } from '../patterns/patterns.service';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { forTheLeadFrom, type Reader } from '../reports/what-today-reads-from-the-record';
import { thePersonJudgementsAreOn } from './person-judgements';
import { PartyType } from '@prisma/client';

/**
 * JUDGEMENTS OF A PERSON KEPT OFF FOR ONE ORGANISATION (production truth, 19 October 2026; person-judgements.ts). Drop Access, with the
 * switch off: nothing that judges Kevin is written, and nothing about him is served to Grace or to him. With it on: as before.
 */
const org = (on: boolean | undefined) => ({ findUnique: jest.fn(async () => (on === undefined ? {} : { personJudgementsOn: on })) });

describe('the switch', () => {
  it('reads on for every organisation that has not set it off, and off only where it is off', async () => {
    expect(await thePersonJudgementsAreOn({ organization: org(true) }, 'org-drop')).toBe(true);
    expect(await thePersonJudgementsAreOn({ organization: org(undefined) }, 'org-drop')).toBe(true);
    expect(await thePersonJudgementsAreOn({ organization: org(false) }, 'org-drop')).toBe(false);
    expect(await thePersonJudgementsAreOn({ organization: { findUnique: jest.fn(async () => { throw new Error('down'); }) } }, 'org-drop')).toBe(false);
  });
});

describe('a pattern about Kevin', () => {
  const make = (on: boolean) => {
    const prisma: any = {
      organization: org(on),
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) },
      patternDetection: { findUnique: jest.fn(async () => null), create: jest.fn(async (a: any) => ({ id: 'p1', ...a.data })), update: jest.fn() },
    };
    return { prisma, service: new PatternsService(prisma, {} as any) };
  };
  it('is never written with the switch off', async () => {
    const { prisma, service } = make(false);
    await service.observe('g-sales', 'p-kevin', 'B2', 'Confident statements about hitting a target are repeated.', 202642);
    await service.observePositive('g-sales', 'p-kevin', 'M2', 'Helped a colleague close.', 202642);
    expect(prisma.patternDetection.create).not.toHaveBeenCalled();
    expect(prisma.patternDetection.findUnique).not.toHaveBeenCalled();
  });
  it('is read as before with it on', async () => {
    const { prisma, service } = make(true);
    await service.observe('g-sales', 'p-kevin', 'B2', 'Confident statements about hitting a target are repeated.', 202642).catch(() => undefined);
    expect(prisma.patternDetection.findUnique).toHaveBeenCalled();
  });
});

describe('a suggestion about Kevin', () => {
  it('is not served to him, to Grace, or to an admin, with the switch off', async () => {
    const prisma: any = { organization: org(false), suggestion: { findMany: jest.fn(async () => [{ id: 's1' }]) }, membership: { findFirst: jest.fn(async () => ({ id: 'm' })) }, user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', organizationId: 'org-drop' })) } };
    const service = new SuggestionsService(prisma);
    expect(await service.aboutYou({ userId: 'u-kevin', organizationId: 'org-drop' } as any)).toEqual([]);
    expect(await service.latestForTheLeadAbout('u-kevin', { userId: 'u-grace', organizationId: 'org-drop' } as any)).toBeNull();
    expect(prisma.suggestion.findMany).not.toHaveBeenCalled();
  });
});

describe("Grace's list on Today and in her weekly letter", () => {
  const person = (id: string, userId: string, partyType: PartyType, first: string) => ({ id, userId, partyType, email: null, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-10-01'), user: { firstName: first, lastName: 'X' } });
  const PEOPLE = [person('p-grace', 'u-grace', PartyType.INITIATOR, 'Grace'), person('p-kevin', 'u-kevin', PartyType.PARTICIPANT, 'Kevin')];
  const ROW = { id: 'pd-1', groundId: 'g-sales', participantId: 'p-kevin', code: 'B2', status: 'SURFACED', periodsObserved: 3, seenInSessions: [1, 2, 3], lastPeriodNumber: 3, observationText: 'Confident statements about hitting a target are repeated.', firstSeenAt: new Date('2026-09-01'), lastSeenAt: new Date('2026-10-14'), personAnswer: null, personAnsweredAt: null, shownToPersonAt: new Date('2026-10-01'), talkedAboutAt: null, readyAt: new Date('2026-09-20') };
  /* Kevin's newest assessment, holding a layer-2 pattern and the lead's layer-3 step for it (F2, 2 November 2026). */
  const KEVINS_ASSESSMENT = { id: 'c-kevin-3', participantId: 'p-kevin', sessionNumber: 3, sessionReport: { kind: 'assessment', version: 1,
    acrossTime: { patterns: [{ key: 'slipping-promises', participantId: 'p-kevin', kind: 'needs work', state: 'holds', who: 'Kevin', saying: 'Kevin has let 2 promised days pass without the work done.',
      instances: [{ checkInId: 'c-kevin-2', sessionNumber: 2, on: '2026-10-07', item: 'the Sarit quote', words: ['I have not sent the Sarit quote.'], saidWordForWord: true }, { checkInId: 'c-kevin-3', sessionNumber: 3, on: '2026-10-14', item: 'the Westgate call', words: ['I did not call Westgate'], saidWordForWord: true }] }],
      role: null, focus: null, toAskNextTime: [] },
    interventions: [{ key: 'slipping-promises', participantId: 'p-kevin', ladder: 'work', rung: 2, step: 'a conversation', forWhom: 'the lead', theLeadDecides: true,
      says: 'Talk with Kevin about it. Kevin has let 2 promised days pass without the work done.', because: '', state: 'waiting for the lead', startedIn: { checkInId: 'c-kevin-3', sessionNumber: 3 }, followedUp: [] }] } };
  const list = async (on: boolean) => {
    const ground = { initiatorId: 'u-grace', organizationId: 'org-drop', cadence: 'DAILY', kindOfWork: 'sales team', whoSeesTargets: 'THEIR_OWN', participants: PEOPLE, dependencies: [], objectives: [], personObjectives: [] };
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: on, release1SalesBoardOn: false })) },
      report: { findUnique: jest.fn(async () => ({ divergences: [] })) },
      checkIn: { findMany: jest.fn(async (a: any) => (a?.select?.sessionReport ? [KEVINS_ASSESSMENT] : [{ participantId: 'p-kevin' }])) },
      groundContextItem: { findMany: async () => [] },
      wordedLine: { findUnique: async () => null },
      patternDetection: { findMany: jest.fn(async () => [ROW]) },
    };
    const reader: Reader = { userId: 'u-grace', isAdmin: false };
    const nameOf = (pid: string) => PEOPLE.find((p) => p.id === pid)?.user.firstName ?? 'a colleague';
    return { items: (await forTheLeadFrom(prisma, 'g-sales', { ground, participants: PEOPLE, checkIns: [], nameOf } as any, reader, 8)) ?? [], prisma };
  };
  /* 2 November 2026 (F2): Today's "talk with Kevin" comes from layer 3 on his assessments, not from a stored pattern, so the
     assessments are what is read with the switch on and what is not read with it off. */
  const readTheAssessments = (prisma: any) => prisma.checkIn.findMany.mock.calls.some((c: any[]) => c[0]?.select?.sessionReport);
  it('has no "talk with Kevin about" a pattern with the switch off, and the pattern is not even read', async () => {
    const { items, prisma } = await list(false);
    expect(JSON.stringify(items)).not.toMatch(/Talk with Kevin/);
    expect(prisma.patternDetection.findMany).not.toHaveBeenCalled();
    expect(readTheAssessments(prisma)).toBe(false);
  });
  it('reads the patterns as before with it on: Grace reads the step that is hers, with the days and words', async () => {
    const { prisma, items } = await list(true);
    expect(readTheAssessments(prisma)).toBe(true);
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({
      decide: 'Talk with Kevin about it. Kevin has let 2 promised days pass without the work done.',
      /* Batch 2, group 3: their words quoted by the one function (their-words-as-said.ts), only because Kevin typed them word for word. */
      why: 'On 7 October, the words were “I have not sent the Sarit quote”. On 14 October, the words were “I did not call Westgate”.',
    })]));
  });
});

describe('coaching about a person, and the check-in', () => {
  it("the board's coaching for Grace and for Kevin is not built with the switch off", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ReportsService } = require('../reports/reports.service');
    const service: any = Object.create(ReportsService.prototype);
    service.prisma = { organization: org(false), ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) } };
    expect(await service.coachingForTheBoard('g-sales', 'u-grace')).toBeNull();
    expect(await service.coachingForTheBoard('g-sales', 'u-kevin')).toBeNull();
  });
  it('Kevin is never read for coaching with the switch off', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ConversationService } = require('../conversation/conversation.service');
    const service: any = Object.create(ConversationService.prototype);
    const participant = jest.fn();
    service.prisma = { organization: org(false), ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) }, checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g-sales', isSetup: false })) }, groundParticipant: { findUnique: participant } };
    service.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await service.observeForCoaching('c-kevin-3', 'p-kevin', 3);
    expect(participant).not.toHaveBeenCalled();
  });
});
