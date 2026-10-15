import { readFileSync } from 'fs';
import { join } from 'path';
import { GroundMode, GroundScenario, GroundStatus, PartyType } from '@prisma/client';
import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';
import { ResolutionService } from '../resolution/resolution.service';
import { endStatesFor } from '../resolution/end-states';
import { displayName, labelsForParties, namesVisibleTo, readsWithNamesOf, plainWordsByPerson, atTheStart, withNames, theSameOneAgain, type LabelParty } from './party-labels';
import { whatToCallThem } from '../conversation/a-colleague-in-an-interview-has-a-name';
import { whatAParticipantMayRead } from './the-judgement-is-the-leads';
import { whatToWorkOnNext } from './what-to-work-on-next';
import { aRoleInTheirOwnWords } from '../grounds/the-leads-words-about-someone';
import { praiseTheNumbersDoNotSupport, sentencesTheNumbersDoNotSupport } from './praise-the-numbers-do-not-support';

/**
 * A PERSON'S LABEL IS THEIR NAME OR A NEUTRAL WORD, NEVER THE LEAD'S DESCRIPTION OF THEM.
 *
 * Request 36 from the screens workspace, 27 September 2026. When somebody had no name, their label
 * fell back to `roleAsDescribed`: the sentence the lead typed about them when inviting them. Leads
 * copy that sentence from their own private report, so it read, as a name, on the board and in the
 * conversation: "Daniel - Your sales manager, who you said is not meeting his agreed targets".
 *
 * Hafsah, in her words: "Fix it the simple way: the label never uses the lead's description; with no
 * name, use a plain neutral label. Add a test proving the lead's description never appears as
 * anyone's label."
 *
 * So every label builder is run here for a person with no name, as the lead, as the person
 * themselves and as a peer, and none of what comes back may hold any part of the lead's words.
 */

const DESCRIPTION = 'Daniel - Your sales manager, who you said is not meeting his agreed targets';
/** Every part of the lead's words that could survive being cut short. */
const PIECES = [/daniel/i, /sales manager/i, /not meeting/i, /agreed targets/i, /your sales/i];

function holdsTheLeadsWords(text: string | null | undefined): boolean {
  const t = text ?? '';
  return PIECES.some((p) => p.test(t));
}

const LEAD = {
  id: 'p-lead', userId: 'u-wairimu', partyType: PartyType.INITIATOR, email: 'w@baridi.test',
  roleAsDescribed: 'runs the sales team', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
/* Joined, with no name: firstName is an empty string, which is how a sign-in with no name is kept. */
const NO_NAME = {
  id: 'p-noname', userId: 'u-noname', partyType: PartyType.PARTICIPANT, email: 'dk7@baridi.test',
  roleAsDescribed: DESCRIPTION, nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: '', lastName: '' },
};
const AISHA = {
  id: 'p-aisha', userId: 'u-aisha', partyType: PartyType.PARTICIPANT, email: 'a@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T11:00:00Z'), user: { firstName: 'Aisha', lastName: 'Otieno' },
};
const PARTIES = [LEAD, NO_NAME, AISHA] as unknown as LabelParty[];

describe('the report\'s names, for the lead, the person themselves and a peer', () => {
  it('displayName gives nothing for somebody with no name, never the description', () => {
    expect(displayName(NO_NAME as any)).toBeNull();
    /* Changed 28 Sep 2026, Hafsah: never an address as a name, not even to the lead or to themselves. */
    expect(displayName(NO_NAME as any, true)).toBeNull();
  });

  it('the stored label is positional, and no reader\'s name for them holds the description', () => {
    const labels = labelsForParties(PARTIES);
    expect(labels.get('p-noname')).toBe('Participant A');
    for (const viewer of ['p-lead', 'p-noname', 'p-aisha']) {
      const names = namesVisibleTo(viewer, PARTIES, true);
      for (const [label, name] of names) {
        expect(holdsTheLeadsWords(label)).toBe(false);
        expect(holdsTheLeadsWords(name)).toBe(false);
      }
    }
    /* A peer sees no name for them at all, so the report keeps its neutral label. */
    expect(namesVisibleTo('p-aisha', PARTIES, true).has('Participant A')).toBe(false);
  });

  it('the lead reads with every name, and still not the description', () => {
    const asWhom = readsWithNamesOf({ viewerIsLead: true, viewerParticipantId: 'p-lead', parties: PARTIES });
    const names = namesVisibleTo(asWhom, PARTIES, true);
    expect([...names.values()].some(holdsTheLeadsWords)).toBe(false);
  });
});

describe('the conversation calls them a neutral word', () => {
  it('whatever the check-in allows, it never calls them by the lead\'s words', () => {
    for (const peersMayBeNamed of [true, false]) {
      const said = whatToCallThem({ person: NO_NAME as any, peersMayBeNamed, fallback: 'a colleague' });
      expect(holdsTheLeadsWords(said)).toBe(false);
      /* The interview's plain word for somebody it cannot name, the same one the reports use. */
      expect(said).toBe('a colleague');
    }
  });
});

describe('the plain word is "a colleague", numbered the same way everywhere', () => {
  it('one person with no name is "a colleague"', () => {
    expect(plainWordsByPerson(PARTIES).get('p-noname')).toBe('a colleague');
    expect(plainWordsByPerson(PARTIES).has('p-aisha')).toBe(false);
  });

  it('two are "one colleague" and "another colleague", in the order the report gives them', () => {
    const second = { ...NO_NAME, id: 'p-noname-2', userId: 'u-noname-2', email: 'x2@baridi.test', createdAt: new Date('2026-09-01T12:00:00Z') };
    const words = plainWordsByPerson([...PARTIES, second as any]);
    expect(words.get('p-noname')).toBe('one colleague');
    expect(words.get('p-noname-2')).toBe('another colleague');
  });

  it('three are "one colleague", "another colleague" and "a third colleague"', () => {
    const more = [2, 3].map((n) => ({ ...NO_NAME, id: `p-noname-${n}`, userId: `u-noname-${n}`, email: `x${n}@baridi.test`, createdAt: new Date(`2026-09-01T1${n}:00:00Z`) }));
    const words = plainWordsByPerson([...PARTIES, ...(more as any[])]);
    expect(['p-noname', 'p-noname-2', 'p-noname-3'].map((id) => words.get(id))).toEqual(['one colleague', 'another colleague', 'a third colleague']);
  });

  it('a capital only at the start', () => {
    expect(atTheStart('another colleague')).toBe('Another colleague');
  });
});

describe('a second mention of the same person says it is the same one', () => {
  const lead = new Map([['the initiator', 'Wairimu Kamau']]);

  it('one person with no name: "a colleague", then "the same colleague"', () => {
    const known = ['the initiator', 'Participant A'];
    expect(withNames('Participant A built the front end. Participant A says the tests were slow.', lead, known))
      .toBe('A colleague built the front end. The same colleague says the tests were slow.');
  });

  it('two: the sentence that read as two more people no longer happens', () => {
    const known = ['the initiator', 'Participant A', 'Participant B'];
    const out = withNames(
      'Participant A built the front end. Participant B wrote the tests. Participant B says the tests were the slow part, and Participant A agrees.',
      lead, known,
    );
    expect(out).toBe('One colleague built the front end. Another colleague wrote the tests. The second colleague says the tests were the slow part, and the first colleague agrees.');
    expect(out).not.toContain('and a colleague agrees');
  });

  it('three: each keeps its number, and a repeat before the second is introduced is "the same colleague"', () => {
    const known = ['the initiator', 'Participant A', 'Participant B', 'Participant C'];
    const out = withNames(
      'Participant C raised the budget. Participant C raised it again. Participant A disagreed, and Participant B sided with Participant C. Wairimu asked Participant A why.',
      lead, known,
    );
    expect(out).toBe('A third colleague raised the budget. The same colleague raised it again. One colleague disagreed, and another colleague sided with the third colleague. Wairimu asked the first colleague why.');
  });

  it('the lead stays the lead', () => {
    expect(theSameOneAgain({ firstMention: 'your lead', index: -1, introducedSoFar: 2 })).toBe('your lead');
  });

  it('a board line or a single sentence takes the first-mention words', () => {
    const known = ['the initiator', 'Participant A', 'Participant B'];
    expect(withNames('Participant B has not checked in.', lead, known)).toBe('Another colleague has not checked in.');
  });
});

/* ---- The board, served for real through BoardService.get, as each reader. ---- */

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3',
  participants: [LEAD, NO_NAME, AISHA],
  checkIns: [
    { id: 'c1', participantId: 'p-noname', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z') },
    { id: 'c2', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z') },
  ],
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Both have checked in.', agreements: [], divergences: [], centralQuestion: null,
    engagement: {}, findings: [],
    /* Route 4: the room judgement is handed "taken on for: <roleAsDescribed>", so what it writes can
       carry the lead's words. It is stored here as the worst case, quoting them. */
    theJudgement: { whatToDo: 'Start with Daniel, taken on as your sales manager, who is not meeting his agreed targets.' },
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
  objectives: [
    { id: 'o-pipeline', name: 'Pipeline', target: 5, count: 2, prevCount: 1, ownerParticipantId: 'p-noname', sortOrder: 0,
      assumes: [], createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
  ],
  dependencies: [],
  poll: null,
};

function boardFor(requestingUserId: string) {
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(GROUND.checkIns))) }),
    groundDependency: model({
      findMany: jest.fn(async () => [{
        id: 'd1', what: 'the price list', status: 'WAITING', blockerKind: null, firstRound: 1, certain: true,
        fromParticipantId: 'p-aisha', onParticipantId: 'p-noname', onLabel: null,
        createdAt: new Date('2026-09-22T09:00:00Z'), updatedAt: new Date('2026-09-22T09:00:00Z'), clearedAt: null,
      }]),
    }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return svc.get('g-sales', requestingUserId) as Promise<any>;
}

/** Every field on the board that stands where a person's name goes. */
function theNamesOnTheBoard(b: any): string[] {
  const out: string[] = [];
  const walk = (v: any, key?: string) => {
    if (v == null) return;
    if (Array.isArray(v)) { v.forEach((x) => walk(x, key)); return; }
    if (typeof v === 'object') { for (const [k, x] of Object.entries(v)) walk(x, k); return; }
    if (typeof v === 'string' && key && /^(name|who|owner|from|on|label|raisedBy|leadName)$/.test(key)) out.push(v);
  };
  walk(b);
  return out;
}

describe('the board, as each reader is served it', () => {
  for (const [who, reader] of [['u-wairimu', 'the lead'], ['u-noname', 'the person themselves'], ['u-aisha', 'a peer']] as const) {
    it(`${reader} never reads the lead's description as a name`, async () => {
      const b = await boardFor(who);
      const names = theNamesOnTheBoard(b);
      expect(names.length).toBeGreaterThan(0);
      expect(names.filter(holdsTheLeadsWords)).toEqual([]);
      /* The person with no name is on the roster, with no name rather than the description. */
      const row = (b.participants ?? []).find((p: any) => p.id === 'p-noname');
      expect(row).toBeDefined();
      expect(row.name).toBeNull();
    });
  }

  it('the lead reads them as "A colleague" where the board says who, never "teammate"', async () => {
    const b = await boardFor('u-wairimu');
    const row = (b.eachPerson ?? []).find((r: any) => r.participantId === 'p-noname');
    expect(row).toBeDefined();
    expect(row.who).toBe('A colleague');
    expect(JSON.stringify(b)).not.toMatch(/teammate/i);
  });

  it('the lead may still read their own description where it is the role, not the name', async () => {
    const row = ((await boardFor('u-wairimu')).participants ?? []).find((p: any) => p.id === 'p-noname');
    expect(row.role).toBe(DESCRIPTION);
  });

  it('the person and a peer never receive any part of the description, anywhere on the board', async () => {
    /* The whole served response, not only the name fields: `contribution[].remit` carried it. */
    for (const who of ['u-noname', 'u-aisha']) {
      const served = JSON.stringify(await boardFor(who));
      expect(PIECES.filter((p) => p.test(served)).map(String)).toEqual([]);
    }
  });

  it('the lead still reads it, as the remit on the contribution read', async () => {
    const b = await boardFor('u-wairimu');
    const row = (b.contribution ?? []).find((r: any) => r.participantId === 'p-noname');
    expect(row).toBeDefined();
    expect(row.remit).toBe(DESCRIPTION);
  });

  /* CHANGED 30 September 2026 (request 88): a peer used to be served a colleague's contribution row,
     with "a role was given" and no words. A colleague's row is no longer served to a peer at all, so
     this now holds the stronger thing: no row for the colleague, and none of the lead's words anywhere. */
  it('and a peer is served no row for that colleague, and none of what the description says', async () => {
    const board = await boardFor('u-aisha');
    const row = (board.contribution ?? []).find((r: any) => r.participantId === 'p-noname');
    expect(row).toBeUndefined();
    expect(JSON.stringify([board.contribution, board.coverage])).not.toContain(DESCRIPTION);
  });

  it('nobody but the lead is given the description as the role either', async () => {
    for (const who of ['u-noname', 'u-aisha']) {
      const row = ((await boardFor(who)).participants ?? []).find((p: any) => p.id === 'p-noname');
      expect(row.role).toBeNull();
    }
  });
});

/* ---- Route 4: the report's people[].role reaches only the judgement, which is the lead's. ---- */

describe('the role handed to the judgement reaches only the lead', () => {
  it('is used for nothing but the room judgement\'s material', () => {
    const src = withoutComments('reports/reports.service.ts');
    /* `role:` built from the row appears in the room's people, and that list is read only by theRoom. */
    expect(src.match(/role: \(p\.remitAsGiven \?\? p\.roleAsDescribed \?\? null\)/g) ?? []).toHaveLength(1);
    /*
     * TWO READS OF IT, AND THE SECOND IS THE PRAISE CHECK'S (commits 6628e6b6, 7d5c36dc). The lead's
     * description is the only place a per-person target lives when the lead typed it there: on the
     * sales run, "Target 14 approved facilities this quarter" is in Kwame's description and in no
     * objective and none of his own answers. The praise check reads it to find the target, and only
     * ever takes sentences OUT of the judgement; it writes nothing and calls no model. The next
     * describe proves its output holds none of the description.
     */
    expect(src.match(/role: p\.role,/g) ?? []).toHaveLength(2);
    const body = theBodyOf(src, 'material = theRoom(', 'instruction = theJudgementOverARoom(');
    expect(body).toContain('role: p.role,');
    expect(src.match(/praiseTheNumbersDoNotSupport\(kept, \(room\?\.people \?\? \[\]\)\.map\(\(p\) => \(\{ who: p\.who, role: p\.role, facts: p\.facts \?\? null \}\)\)\)/g) ?? []).toHaveLength(1);
    /* And the same description read for the product's own paragraphs goes to the same check and nowhere else. */
    expect(src.match(/whoThePraiseCouldBeAbout/g) ?? []).toHaveLength(2);
    expect(src).toContain('sentencesTheNumbersDoNotSupport(text, whoThePraiseCouldBeAbout, about)');
  });

  it('a participant\'s report read drops the judgement', () => {
    const report = { sharedPicture: 'Both have checked in.', theJudgement: { whatToDo: DESCRIPTION } };
    for (const participantId of ['p-noname', 'p-aisha']) {
      const read = whatAParticipantMayRead(report, { isLead: false, participantId });
      expect(JSON.stringify(read)).not.toMatch(/not meeting|sales manager/);
    }
    expect(whatAParticipantMayRead(report, { isLead: true, participantId: 'p-lead' }).theJudgement).toEqual({ whatToDo: DESCRIPTION });
  });

  it('on the served board, the lead reads the judgement and the person and a peer do not', async () => {
    expect(JSON.stringify((await boardFor('u-wairimu')).theJudgement)).toMatch(/not meeting his agreed targets/);
    for (const who of ['u-noname', 'u-aisha']) {
      const b = await boardFor(who);
      expect(b.theJudgement ?? null).toBeNull();
      /* The whole served board, searched in the test above, holds none of it either. */
    }
  });
});

/* ---- Route 5: the praise check reads the description to find a target, and writes none of it. ---- */

describe('the praise check reads the lead\'s description and never writes any of it', () => {
  const ROLE = 'Relationship officer, Surulere. Target 14 approved facilities this quarter.';
  const ROLE_PIECES = [/relationship officer/i, /surulere/i, /this quarter/i];
  const people = [{
    who: 'Participant C', role: ROLE,
    facts: { whatTheySaidItWasFor: null, whereTheySayTheyAre: 'Three approved so far, and 22 applications.', anEarlierFigureTheyGave: null, numbers: [], aNumberSetForThemTheyHaveNeverSaid: null, twoNumbersForOneTarget: null } as any,
  }];
  const holdsTheRole = (v: unknown) => ROLE_PIECES.filter((p) => p.test(JSON.stringify(v))).map(String);

  it('finds the target in it: praise the numbers do not support is held back', () => {
    const judgement = { whatToDo: [{ move: 'Recognise Participant C for exceeding their target of 14 approved facilities.', who: 'Participant C' }], theGap: 'Participant C has three approved facilities.' };
    const out = praiseTheNumbersDoNotSupport(judgement, people);
    expect(out.heldBack).toEqual(['Recognise Participant C for exceeding their target of 14 approved facilities.']);
    expect(out.judgement).toEqual({ whatToDo: [], theGap: 'Participant C has three approved facilities.' });
    expect(holdsTheRole(out)).toEqual([]);
  });

  it('only ever takes sentences out, so no word of the description can come back in', () => {
    const judgement = { theGap: 'Participant C is ahead of target. Participant C has three approved facilities.', whatWeFailedToAsk: [{ about: 'Whether Participant C beat the target of 14 approved facilities.' }] };
    const out = praiseTheNumbersDoNotSupport(judgement, people);
    expect(holdsTheRole(out)).toEqual([]);
    const para = sentencesTheNumbersDoNotSupport('Participant C is ahead of target. The team met on Friday.', people, 'Participant C');
    expect(para.text).toBe('The team met on Friday.');
    expect(holdsTheRole(para)).toEqual([]);
  });
});

/* ---- The person's own coaching note: "your work as …" is never the lead's words. ---- */

describe('the person\'s own coaching note does not say the lead\'s words back to them', () => {
  const base = {
    patterns: [], detectedFunction: null as string | null, functionConfidence: null as number | null,
    noticedBehaviour: null as string | null, sessionNumber: 2, totalSessions: 6, scenario: 'NEW_HIRE',
    waitingOn: [] as any[], holdingUp: [] as any[], saidSomethingSpecific: true, anythingDocumented: false,
  };

  it('with the lead\'s description as the role, nothing of it is said', () => {
    const note = whatToWorkOnNext({ ...base, role: DESCRIPTION, roleToSay: aRoleInTheirOwnWords({ partyType: PartyType.PARTICIPANT, roleAsDescribed: DESCRIPTION }) } as any);
    expect(PIECES.filter((p) => p.test(JSON.stringify(note))).map(String)).toEqual([]);
  });

  it('left out, the role is still said ("your work as daniel"), which is why the report must pass it', () => {
    const note = whatToWorkOnNext({ ...base, role: DESCRIPTION } as any);
    expect(JSON.stringify(note)).toMatch(/your work as daniel/i);
  });

  it('and the report passes only the person\'s own words to be said', () => {
    expect(withoutComments('reports/reports.service.ts')).toContain('roleToSay: aRoleOrNothing(aRoleInTheirOwnWords(participant as any)),');
  });
});

/* ---- The email the others get when the lead suggests how it ends. ---- */

describe('the end-state email names the lead, or says "The lead"', () => {
  it('a lead with no name is "The lead", never their description or their address', async () => {
    const lead = { ...LEAD, user: { firstName: '', lastName: '', email: 'w@baridi.test' }, roleAsDescribed: DESCRIPTION };
    const sent: string[] = [];
    const prisma: any = new Proxy({
      ground: { findUnique: jest.fn(async () => ({ id: 'g-sales', status: GroundStatus.ACTIVE, scenario: GroundScenario.OKR_ALIGNMENT })) },
      groundParticipant: {
        findFirst: jest.fn(async () => lead),
        findMany: jest.fn(async () => [lead, AISHA]),
      },
      resolution: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async () => ({ id: 'r1', endState: null })),
      },
      resolutionConfirmation: {
        deleteMany: jest.fn(async () => ({})),
        upsert: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []),
      },
    }, {
      get(target: any, prop: string) {
        if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
          target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) };
        }
        return target[prop];
      },
    });
    const email: any = {
      sendResolutionProposal: jest.fn(async (_to: string, label: string) => { sent.push(label); }),
      sendGroundClosed: jest.fn(async () => {}),
    };
    const svc = new ResolutionService(prisma, {} as any, {} as any, email, { get: () => 'http://localhost:5173' } as any);
    const endState = endStatesFor(GroundScenario.OKR_ALIGNMENT)[0].value;
    await svc.counterPropose('g-sales', 'u-wairimu', endState).catch(() => undefined);
    expect(sent).toEqual(['The lead']);
  });
});

/* ---- And no label builder reads the description at all. ---- */

const withoutComments = (file: string) =>
  readFileSync(join(__dirname, '..', file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** The source between `start` and the first line that closes it at the same indent. */
function theBodyOf(src: string, start: string, end: string): string {
  const at = src.indexOf(start);
  expect(at).toBeGreaterThanOrEqual(0);
  const stop = src.indexOf(end, at + start.length);
  expect(stop).toBeGreaterThan(at);
  return src.slice(at, stop);
}

describe('no label builder reads the lead\'s description', () => {
  it('the board\'s nameOf', () => {
    const body = theBodyOf(withoutComments('board/board.service.ts'), 'const nameOf = (pid: string) => {', '\n    };');
    expect(body).not.toMatch(/roleAsDescribed|aNameOrNothing/);
  });

  it('the listener\'s names for what the room is about', () => {
    const body = theBodyOf(withoutComments('board/board.listener.ts'), 'private async readWhatTheRoomIsAbout', 'WHAT_THE_ROOM_IS_ABOUT_PROMPT');
    expect(body).not.toMatch(/roleAsDescribed|aNameOrNothing/);
  });

  it('the end-state email\'s name for the lead', () => {
    const line = withoutComments('resolution/resolution.service.ts').split('\n').find((l) => l.includes('const proposerLabel'));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/roleAsDescribed|\.email/);
  });

  it('the report\'s displayName and namesVisibleTo', () => {
    const src = withoutComments('reports/party-labels.ts');
    expect(theBodyOf(src, 'export function displayName(', '\n}\n')).not.toMatch(/roleAsDescribed/);
    expect(theBodyOf(src, 'export function namesVisibleTo(', '\n}\n')).not.toMatch(/roleAsDescribed/);
    expect(theBodyOf(src, 'export function labelsForParties(', '\n}\n')).not.toMatch(/roleAsDescribed/);
  });

  it('the interview\'s name for a colleague', () => {
    expect(withoutComments('conversation/a-colleague-in-an-interview-has-a-name.ts')).not.toMatch(/roleAsDescribed|aNameOrNothing/);
  });

  it('the conversation\'s name chains', () => {
    const src = withoutComments('conversation/conversation.service.ts');
    expect(src).not.toMatch(/aNameOrNothing/);
    /* A name chain is `firstName ... || <fallback>`; none may fall back to the description. */
    const chains = src.split('\n').filter((l) => /firstName/.test(l) && /\|\|/.test(l));
    expect(chains.filter((l) => /roleAsDescribed/.test(l))).toEqual([]);
  });
});
