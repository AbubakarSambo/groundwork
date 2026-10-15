import { readFileSync } from 'fs';
import { join } from 'path';
import { PartyType, GroundMode, GroundScenario } from '@prisma/client';
import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';
import { whatEachLabelIsCalled, withoutInternalLabels, youTakesItsVerb } from './no-internal-label-reaches-anyone';

/**
 * NO INTERNAL LABEL REACHES ANYONE (screens request 54, Hafsah, 28 September 2026).
 *
 * The board and every report read are served, through the real code, to every kind of reader -
 * the lead, each participant, an admin who only reads - on a check-in where people see each other
 * and on one where they do not, with labels planted in every kind of field a report carries:
 * the ones the session report missed (atStake, settledBy, positions[].view, restsOn, a finding),
 * the rounds' shared picture, and a label nobody has thought of yet in a field nobody has added.
 */
const LABEL = /\b(the initiator|The initiator|Participants? [A-Z](?:, [A-Z])*(?:,? and [A-Z])?\b|the person who set this up)/;

const person = (id: string, userId: string, first: string, last: string, partyType: PartyType, at: string) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, createdAt: new Date(at), user: { firstName: first, lastName: last },
});
const LEAD = person('p-lead', 'u-lead', 'Wairimu', 'Kamau', PartyType.INITIATOR, '2026-09-01T09:00:00Z');
const AISHA = person('p-aisha', 'u-aisha', 'Aisha', 'Otieno', PartyType.PARTICIPANT, '2026-09-01T10:00:00Z');
const MIRIAM = person('p-miriam', 'u-miriam', 'Miriam', 'Wanjiku', PartyType.PARTICIPANT, '2026-09-01T11:00:00Z');

const PLANTED = {
  sharedPicture: 'The initiator says the quarter is on track. Participant A disagrees, and Participant B has not said.',
  agreements: ['Participants A and B both want the stock earlier.'],
  divergences: [{ topic: 'Whether the stock is late', atStake: 'If the initiator is right, Participant A is waiting for nothing.', settledBy: 'Participant B could say when the truck left.',
    positions: [{ participantLabel: 'Participant A', view: 'Participant A says it is late.' }, { participantLabel: 'the initiator', view: 'The initiator says it is not.' }] }],
  restsOn: ['What Participant B said about the truck.'],
  whatEachPersonSaid: [{ who: 'Participant A', finding: 'Participant A sold four.' }],
  rounds: [{ sharedPicture: 'In round one the initiator and participant B agreed.' }],
  somethingAddedLater: { deep: ['Nobody has thought of this field yet, and it says Participant A.'] },
  engagement: { sessionCounts: { 'Participant A': 1, 'the initiator': 1, total: 2 }, specificitySignal: { 'Participant A': 'high' } },
};

const ground = (peersVisible: boolean): any => ({
  id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: 'u-lead', createdByUserId: 'u-lead',
  organizationId: 'org-1', peopleWorkTogether: true, peersVisibleToEachOther: peersVisible, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales', participants: [LEAD, AISHA, MIRIAM],
  checkIns: [
    { id: 'c1', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T10:00:00Z') },
    { id: 'c2', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T11:00:00Z') },
  ],
  report: { ...PLANTED, releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: PLANTED.sharedPicture, centralQuestion: 'What does Participant A need?',
    engagement: {}, findings: [{ participantId: 'p-aisha', text: 'Participant A sold four.', hasGap: false }],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z') },
  objectives: [], dependencies: [], poll: null,
});

function prismaFor(g: any, role: string) {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(g))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(g.checkIns))) }),
  } as any, { get(t: any, k: string) { if (!(k in t) && typeof k === 'string' && !k.startsWith('$')) t[k] = model(); return t[k]; } });
}

const READERS: [string, string, string][] = [
  ['the lead', 'u-lead', 'MEMBER'],
  ['a participant', 'u-aisha', 'MEMBER'],
  ['another participant', 'u-miriam', 'MEMBER'],
  ['an admin who only reads', 'u-grace', 'ADMIN'],
];

describe.each([[true, 'people see each other'], [false, 'people see only themselves']])('no internal label reaches anyone, where %s', (peersVisible) => {
  it.each(READERS)('on the board, as %s', async (_who, userId, role) => {
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prismaFor(ground(peersVisible as boolean), role), { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    const served = JSON.stringify(await svc.get('g-1', userId));
    expect(served).not.toMatch(LABEL);
  });

  it.each(READERS)('on every report read, as %s', async (_who, userId, role) => {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prismaFor(ground(peersVisible as boolean), role);
    svc.isAnAdminOf = async () => role === 'ADMIN';
    const served = await svc.whatTheLeadHasNotShared('g-1', userId, 'org-1', { ...PLANTED, updatedAt: new Date('2026-09-23T15:02:00Z') });
    expect(JSON.stringify(served)).not.toMatch(LABEL);
    /* A date is still a date (request 53). */
    expect(served.updatedAt instanceof Date).toBe(true);
  });
});

describe('what a label becomes', () => {
  const called = (viewerParticipantId: string | null, viewerIsLead: boolean, peersAreNamed: boolean) =>
    whatEachLabelIsCalled([LEAD, AISHA, MIRIAM] as any, { viewerParticipantId, viewerIsLead, peersAreNamed });

  it('the name this reader may see', () => {
    expect(withoutInternalLabels('The initiator says Participant A disagrees.', called(null, true, true))).toMatch(/^Wairimu.* says Aisha.* disagrees\.$/);
  });

  it('and plain words where this reader may not see the name', () => {
    const said = withoutInternalLabels('Participant B has not said.', called('p-aisha', false, false));
    expect(said).not.toMatch(/Miriam|Participant/);
    expect(said).toMatch(/^A colleague has not said\.$|^Another colleague has not said\.$/);
  });

  it('and leaves ordinary words alone', () => {
    const t = 'The participants agreed. Participation was high, and a participant asked about the truck.';
    expect(withoutInternalLabels(t, called(null, true, true))).toBe(t);
  });
});

describe('and "you" takes its verb, outside their own words', () => {
  it('mends what was read live', () => {
    expect(youTakesItsVerb('You is aiming to sign three shops.')).toBe('You are aiming to sign three shops.');
    expect(youTakesItsVerb('Nothing moves until you sends it.')).toBe('Nothing moves until you send it.');
  });
  it('and never inside a quotation of what somebody said', () => {
    expect(youTakesItsVerb('Aisha said "you sends it Friday".')).toBe('Aisha said "you sends it Friday".');
  });
});

describe('and never an address as a name (screens requests 56, 58, 65)', () => {
  const noName = { id: 'p-zawadi', userId: null, partyType: PartyType.PARTICIPANT, email: 'zawadi.u8@example.test', nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-01T12:00:00Z'), user: null };
  const parties = [LEAD, AISHA, noName] as any;
  it('a sentence that uses a participant\'s address as a name reads as a name or plain words', () => {
    const called = whatEachLabelIsCalled(parties, { viewerParticipantId: null, viewerIsLead: true, peersAreNamed: true });
    const said = withoutInternalLabels('x', called) && require('./no-internal-label-reaches-anyone').withoutAddressesAsNames('Start with zawadi.u8@example.test. The record holds nothing about zawadi.u8@example.test.', called);
    expect(said).not.toContain('@');
    expect(said).toMatch(/^Start with (a|one|another) colleague\. The record holds nothing about the same colleague\.$/);
  });
  it('and an address that is nobody here is left alone, as is a field that is an address', () => {
    const called = whatEachLabelIsCalled(parties, { viewerParticipantId: null, viewerIsLead: true, peersAreNamed: true });
    const { withoutInternalLabelsIn } = require('./no-internal-label-reaches-anyone');
    const out = withoutInternalLabelsIn({ says: 'Write to help@supplier.test.', email: 'zawadi.u8@example.test' }, called);
    expect(out).toEqual({ says: 'Write to help@supplier.test.', email: 'zawadi.u8@example.test' });
  });
  it('and displayName never returns an address, even to the lead', () => {
    const { displayName } = require('./party-labels');
    expect(displayName(noName, true)).toBeNull();
  });
});

describe('every board and report read goes through it', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const REPORTS = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));
  const BOARD = strip(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
  it.each(['getAsBuilt', 'sessionReportAsBuilt', 'roundsAsBuilt', 'whereAgainstSuccessAsBuilt'])('%s is served through the last read', (built) => {
    expect(REPORTS).toMatch(new RegExp(`const served = await this\\.${built}\\([^)]*\\);\\s*return this\\.whatTheLeadHasNotShared\\(`));
  });
  it('and the last read and the board both take out every label', () => {
    /* Since screens request 77 the hidden-target read runs inside withTheirOwnWordsKept, which holds
       aside the lines people said; labels still come off everything served, those lines included. */
    expect(REPORTS).toMatch(/const walled = withoutLinesWithNoWords\(withTheirOwnWordsKept\(\s*withoutPrivateFileNamesIn\(withoutInternalLabelsIn\(served, called\), privateNames\),\s*THEIR_OWN_WORDS_IN_A_REPORT,\s*\(v\) => withoutHiddenTargetsIn\(v, hiddenTargets\)/);
    expect(BOARD).toMatch(/withTheirOwnWordsKept\(\s*withoutPrivateFileNamesIn\(withoutInternalLabelsIn\(out, called\), privateNames\),\s*THEIR_OWN_WORDS_ON_THE_BOARD,\s*\(v\) => withoutHiddenTargetsIn\(v, hiddenTargets\)/);
  });
});
