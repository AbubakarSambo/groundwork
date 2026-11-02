import * as fs from 'fs';
import * as path from 'path';
import { ReportsService, SYNTHESIS_RULES } from './reports.service';
import { Syntheses } from './the-report-is-being-written';
import { dependenciesOverTime, overTimeForThisReader } from './what-the-record-shows-over-time';
import { itWasTakenFurther } from './what-they-said-they-did-about-it';
import { whatToProbe } from './what-to-probe';
import { theFiveReadings } from './confidence-in-the-picture';
import { labelsForParties } from './party-labels';

/**
 * A REPORT THAT DOES NOT CONTRADICT ITSELF, AS EACH PERSON READS IT (review of 1 October 2026,
 * section 3). The texts are the run's own: api/journey/all-24/re-a/sales.json.
 */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const party = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? 'INITIATOR' : 'PARTICIPANT', email: `${userId}@credit.test`, roleAsDescribed: lead ? 'runs credit sales' : 'credit sales',
  remitAsGiven: null, nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: last },
});
const PARTIES = [party('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', true), party('p-femi', 'u-femi', 'Femi', 'Okonkwo'), party('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze'), party('p-kwame', 'u-kwame', 'Kwame', 'Mensah')];

/* The lead's report on the sales run, session 2, as it was served beside the "being written" line. */
const SESSION_2 = {
  sharedPicture: "All four people have answered. They disagree on whether individual targets for the quarter have been set, and on what is blocking applications from being approved.\n\nYou own the team's overall target of 40 approved facilities, and you report 11 so far. You say the team does not have individual targets assigned yet.",
  theOpening: 'All four people have answered. They disagree on whether individual targets for the quarter have been set, and on what is blocking applications from being approved.',
  sharedPictureLines: [
    { text: 'All four people have answered.', mark: 'said' },
    { text: 'They disagree on whether individual targets for the quarter have been set, and on what is blocking applications from being approved.', mark: 'said' },
    { text: "You own the team's overall target of 40 approved facilities, and you report 11 so far.", mark: 'said' },
  ],
};

function aServiceWithASynthesisOut() {
  const svc = Object.create(ReportsService.prototype) as any;
  const out = new Syntheses();
  out.begin('g-credit');
  Object.defineProperty(svc, 'synthesesOut', { value: out });
  svc.prisma = {
    ground: { findUnique: jest.fn(async () => ({ initiatorId: 'u-bisi', participants: PARTIES })) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-femi' }, { participantId: 'p-kwame' }, { participantId: 'p-ngozi' }]) },
  };
  return svc;
}

describe('while the report is being written, it does not also say everybody is in it', () => {
  it('the lead reads the line that it is being written, and no "All four people have answered" above it', async () => {
    const served = await aServiceWithASynthesisOut().withBeingWritten('g-credit', 'u-bisi', structuredClone(SESSION_2));
    expect(served.beingWritten.sentence).toMatch(/^The report is being written with what .+ said\. It will include everyone in a few minutes\.$/);
    expect(JSON.stringify(served)).not.toMatch(/All four people have answered/);
    expect(served.sharedPicture.startsWith('People disagree on whether individual targets for the quarter have been set, and on what is blocking applications from being approved.\n\nYou own the team')).toBe(true);
    expect(served.theOpening).toBe('People disagree on whether individual targets for the quarter have been set, and on what is blocking applications from being approved.');
    expect(served.sharedPictureLines.map((l: any) => l.text)).toEqual([
      'People disagree on whether individual targets for the quarter have been set, and on what is blocking applications from being approved.',
      "You own the team's overall target of 40 approved facilities, and you report 11 so far.",
    ]);
  });

  it('a participant, who is never shown that line, reads the report as it was', async () => {
    const served = await aServiceWithASynthesisOut().withBeingWritten('g-credit', 'u-femi', structuredClone(SESSION_2));
    expect(served.beingWritten).toBeUndefined();
    expect(served.sharedPicture).toBe(SESSION_2.sharedPicture);
  });
});

/* What Ngozi and Femi said they had done about what is in their way, word for word from the run. */
const NGOZI_TRIED = 'I have chased the committee four times in writing for all eleven files, including the oldest one. I also escalated to the Head of Credit.';
const FEMI_TRIED = 'I called the customer again to remind them about the documents. I have been following up.';
const nameOf = (id: string | null) => ({ 'p-bisi': 'Bisi Adeyemi', 'p-femi': 'Femi Okonkwo', 'p-ngozi': 'Ngozi Eze', 'p-kwame': 'Kwame Mensah' } as Record<string, string>)[id ?? ''] ?? 'somebody';

describe('what somebody said they did about what is in their way is on record', () => {
  const deps = dependenciesOverTime([
    { what: 'review and approval for their eleven files', fromParticipantId: 'p-ngozi', onParticipantId: null, onLabel: 'the credit committee', status: 'WAITING', escalatedAt: null, triedSaid: NGOZI_TRIED, statedInSession: 1 },
    { what: 'the necessary documents', fromParticipantId: 'p-femi', onParticipantId: null, onLabel: 'the customers', status: 'WAITING', escalatedAt: null, triedSaid: FEMI_TRIED, statedInSession: 1 },
    { what: 'the exact date for the end of the quarter', fromParticipantId: 'p-bisi', onParticipantId: null, onLabel: null, status: 'WAITING', escalatedAt: null, triedSaid: null, statedInSession: 1 },
  ], nameOf, 3);

  it('Ngozi, who escalated to the Head of Credit, is not the one told nobody chased', () => {
    /* Read on the run: "... for 2 sessions now. Nothing on record says anybody has chased it since." */
    expect(deps[0].say).toBe('Ngozi Eze is waiting on the credit committee for "review and approval for their eleven files" for 2 sessions now, and it has been taken above the person it was with.');
    expect(deps[0].chased).toBe(true);
    expect(deps[1].say).toBe('Femi Okonkwo is waiting on the customers for "the necessary documents" for 2 sessions now, and it has been chased more than once since.');
    /* Nobody said anything about the date: that is still what it says. */
    expect(deps[2].say).toBe('Bisi Adeyemi is waiting on somebody outside this check-in for "the exact date for the end of the quarter" for 2 sessions now, and nothing on record says anybody has chased it since.');
  });

  it('Ngozi reads the same sentence about her own wait in her own report', () => {
    const whole: any = { sessions: 3, commitments: [], dependencies: deps, patterns: [], gaps: [], stillOpen: deps.map((d) => d.say), cannotTellYou: [], toSettleFirst: [] };
    const hers = overTimeForThisReader(whole, { isLead: false, participantId: 'p-ngozi' })!;
    expect(hers.dependencies.map((d) => d.say)).toEqual([deps[0].say]);
    expect(JSON.stringify(hers)).not.toMatch(/Nothing on record says anybody has chased/i);
  });

  it('the lead\'s probe for Ngozi says she escalated, and not "with no escalation on record"', () => {
    const probe = whatToProbe({
      who: 'Ngozi Eze', participantId: 'p-ngozi', role: null, answeredThisSession: true,
      waitingOn: [{ what: 'review and approval for their eleven files', who: null, daysOld: 3, escalated: itWasTakenFurther({ escalatedAt: null, triedSaid: NGOZI_TRIED }) }],
      holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber: 3, totalSessions: 12, scenario: null,
    });
    /* Read on the run: "... with no escalation on record. Ask what has stopped them raising it." */
    expect(probe.probe.join(' ')).not.toMatch(/no escalation on record|what has stopped them raising it/);
    expect(probe.triedToUnblock).not.toMatch(/no escalation/);
  });

  it('calling a customer again is chasing, not taking it higher, and saying nothing is nothing', () => {
    expect(itWasTakenFurther({ escalatedAt: null, triedSaid: FEMI_TRIED })).toBe(false);
    expect(itWasTakenFurther({ escalatedAt: null, triedSaid: null })).toBe(false);
    /* Changed 11 October (decision 139, must-fix 3): the product's overnight stamp is not the person taking it higher. It said
       "has raised it higher" and "you escalated" about people who had done nothing of the kind (final evaluation, problem 4). */
    expect(itWasTakenFurther({ escalatedAt: new Date(), triedSaid: null })).toBe(false);
  });

  it('every read of whether a handoff was taken further reads what they said, not only the overnight stamp', () => {
    const svc = withoutComments(fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8'));
    expect(svc).not.toMatch(/escalated:\s*!!\w+\.escalatedAt/);
    expect(svc).not.toMatch(/\$\{\w+\.escalatedAt \? ' Already raised\.'/);
  });
});

describe('the lead\'s list of what is still open names what is still open', () => {
  const commitment = (what: string, when: string | null, statedInSession: number) => ({
    participantId: 'p-femi', who: 'Femi Okonkwo', what, when, statedInSession, restatedIn: [], status: 'UNKNOWN',
    theySaidIt: true, saidWordForWord: true, whenSaidWordForWord: !!when, say: '',
  });
  /* As stored on the run: the sentences that named "it" were taken out, and these were left. */
  const stored: any = {
    sessions: 3,
    commitments: [
      commitment('I will call them again today.', null, 3),
      commitment('I will explain to them more clearly why the statements are so important for their application.', 'this week', 3),
    ],
    dependencies: [],
    patterns: [], gaps: [], cannotTellYou: [], toSettleFirst: [],
    stillOpen: [
      'Nothing on record says anybody has chased it since.',
      'Nobody has said yet whether it happened.',
      'The time Femi Okonkwo gave for it was this week. Nobody has said yet whether it happened.',
    ],
  };

  it('the lead reads each promise with what it was, and no line about "it" on its own', () => {
    const lead = overTimeForThisReader(stored, { isLead: true, participantId: 'p-bisi' })!;
    expect(lead.stillOpen).toEqual([
      'In session 3, Femi Okonkwo said, "I will call them again today." Nobody has said yet whether it happened.',
      'In session 3, Femi Okonkwo said, "I will explain to them more clearly why the statements are so important for their application." The time Femi Okonkwo gave for it was "this week". Nobody has said yet whether it happened.',
    ]);
  });

  it('and a participant still reads no list of what is open across the team', () => {
    expect(overTimeForThisReader(stored, { isLead: false, participantId: 'p-femi' })!.stillOpen).toEqual([]);
  });
});

describe('one reading of how checkable the record is', () => {
  it('the notes under the confidence line are the five readings, and never the scorer\'s "checkable" flag', () => {
    /* Read on the run: "In session 1, what was said about checkable was specific." under "What is here is general rather than checkable". */
    const bisi = { coverage: 'vague', delivery: 'managed', evidence: 'directional', checkable: 'specific', commitment: 'managed', enablement: 'managed' };
    expect(theFiveReadings(bisi).map(([d]) => d)).toEqual(['coverage', 'delivery', 'evidence', 'commitment', 'enablement']);
    const svc = withoutComments(fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8'));
    expect(svc).toMatch(/dimensions: theFiveReadings\(dims\)\.map/);
  });
});

describe('the report is written as one story', () => {
  it('the rules every synthesis runs with say so, and they are appended in code so the stored prompt version cannot drop them', () => {
    expect(SYNTHESIS_RULES).toMatch(/16\. ONE PAGE TELLS ONE STORY\./);
    expect(SYNTHESIS_RULES).toContain('If divergences is empty, the opening does not say anybody disagrees.');
    expect(SYNTHESIS_RULES).toContain('Never say people disagree on a point and, anywhere else, that they agree on the same point.');
    const svc = withoutComments(fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8'));
    /* The direct morning's block may wrap it and go after it (the-direct-morning-is-written-straight); the rules still follow the stored version. */
    expect(svc).toMatch(/const systemPrompt = (?:withTheDirectMorning\()?synthesisVersion\.content \+ "\\n\\n" \+ SYNTHESIS_RULES/);
  });
});

/* Labels are what a stored report carries; this keeps the fixture honest about them. */
it('the fixture parties have one label each', () => {
  expect(new Set(labelsForParties(PARTIES as any).values()).size).toBe(4);
});
