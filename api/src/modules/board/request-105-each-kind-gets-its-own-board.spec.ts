import { PartyType } from '@prisma/client';
import {
  boardAs, person, answered, handoff, SALES_RUN, BISI, KWAME, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, type Setup,
} from './the-switchboards-sections-harness';
import {
  THE_KINDS_OWN_FIELDS, NO_NUMBERS_FROM_ANOTHER_SYSTEM, NO_LEVEL_ON_RECORD, NO_SUPPORT_ON_RECORD, NO_GROUP_ON_RECORD,
  WHAT_IT_CHANGED_IS_NOT_ON_RECORD,
} from './each-kind-gets-its-own-board';
import { WHAT_A_NUMBER_IS_NOT } from '../public-api/a-number-does-not-argue';

/**
 * REQUEST 105, PART 1: FIVE KINDS OF WORK GET THEIR OWN BOARD SHAPE, read as each reader, on real run text:
 *  - a government programme, on the rollout run (api/journey/all-24/run-21/implementation.json);
 *  - asset loans, on the loan cohort (re-f/loans.json);
 *  - a law firm matter, on the contract review (run-21/contractreview.json);
 *  - MarketView where next, on the discovery run (run-21/discovery.json);
 *  - MarketView Q4, on the sales run (re-f/sales.json), with a number from another system and a document.
 * Every line a person said below is word for word what they typed in that run. Read as the person who runs
 * it, an admin who only reads, the admin who set it up, and a person who checks in (who is served none of
 * these: their board is their own, part 3).
 */
const item = (id: string, kind: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind, name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: 'u-lead', createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const line = (id: string, participantId: string, type: string, text: string, more: Record<string, any> = {}) => ({
  id, participantId, type, text, checkInId: `c1-${participantId}`, recallBased: true, anchoredOrigin: null, anchoredDocumentId: null,
  confirmedAt: null, documentSays: null, documentSaysId: null, createdAt: new Date('2026-09-16T16:00:00Z'), disputedAt: null, ...more,
});
const theirTurns = (lines: any[]) => lines.map((l) => ({ checkInId: l.checkInId, content: l.text }));
const LEAD = ['u-lead', 'MEMBER'] as const;
const kindsFields = (b: any) => Object.keys(b).filter((k) => (THE_KINDS_OWN_FIELDS as readonly string[]).includes(k)).sort();

/* ---------------------------------------------------------------------------------------------- */

const GOV_LINES = [
  line('e-ngozi', 'p-ngozi', 'SUCCESS_DEFINITION', 'My team understood that we were supposed to integrate the new system into our daily operations.'),
  line('e-musa', 'p-musa', 'SUCCESS_DEFINITION', 'My understanding was that we were meant to get the new system installed and start using it for our daily operations.'),
];
const GOV: Setup = {
  kindOfWork: 'a government programme', initiatorId: 'u-lead', label: 'The rollout across four branches', subjectExternalId: 'rollout-1',
  people: [person('p-stephen', 'u-lead', 'Stephen', 'Nwachukwu', PartyType.INITIATOR), person('p-ngozi', 'u-ngozi', 'Ngozi', 'Duru'), person('p-musa', 'u-musa', 'Musa', 'Ibrahim')],
  checkIns: [answered('p-ngozi', 1), answered('p-musa', 1)],
  lines: GOV_LINES, turns: theirTurns(GOV_LINES),
  objectives: [{ id: 'o-1', groundId: 'g-1', name: 'The system is deployed in all four branches.', target: null, count: 0, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-stephen', sortOrder: 0, assumes: [] }],
  items: [item('w-1', 'county', 'Enugu', { ownerParticipantId: 'p-ngozi' }), item('w-2', 'project', 'Receipts on the new system', { fields: { County: 'Enugu' } })],
};

/* Expectations updated (Hafsah, 30 October 2026: plain language for an impatient first-time lead; a difference is said as what people said, with no "needs settling".) */
describe('a government programme', () => {
  it('Stephen, who runs it, reads what each level understood, in their own words, after the aim he set', async () => {
    const b = await boardAs(GOV, ...LEAD);
    expect(b.whatEachLevelUnderstood).toEqual({
      heading: 'What each level understood',
      state: 'filled',
      note: NO_LEVEL_ON_RECORD,
      levels: [
        { participantId: 'p-stephen', who: 'You', said: ['The system is deployed in all four branches.'] },
        { participantId: 'p-ngozi', who: 'Ngozi Duru', said: ['Ngozi Duru said, "My team understood that we were supposed to integrate the new system into our daily operations."'] },
        { participantId: 'p-musa', who: 'Musa Ibrahim', said: ['Musa Ibrahim said, "My understanding was that we were meant to get the new system installed and start using it for our daily operations."'] },
      ],
    });
    expect(NO_LEVEL_ON_RECORD).toBe("Groundwork does not keep which level each person works at, so each person's own words are shown in the order they joined, after the aim that was set.");
  });

  it('reads each county with its projects, and that no visit log is on record', async () => {
    const b = await boardAs(GOV, ...LEAD);
    expect(b.theCounties.counties.map((c: any) => c.says)).toEqual(['The project on record for Enugu is Receipts on the new system.']);
    expect(b.whatTheVisitLogShows).toEqual({ heading: 'What the visit log shows', state: 'not-known', why: NO_NUMBERS_FROM_ANOTHER_SYSTEM });
  });

  it('reads the visit log once its numbers are brought in, said plainly and never judged', async () => {
    const b = await boardAs({ ...GOV, metrics: [{ key: 'visits', says: 'Extension visits this month', value: 412, unit: null, asOf: new Date('2026-09-30T09:00:00Z'), sourceSystem: 'The visit log', subjectExternalId: 'rollout-1' }] }, ...LEAD);
    expect(b.whatTheVisitLogShows.numbers.map((n: any) => n.says)).toEqual(['The visit log shows 412 for extension visits this month, as of 30 September.']);
    expect(b.whatTheVisitLogShows.whatANumberIsNot).toEqual(WHAT_A_NUMBER_IS_NOT);
  });

  it('an admin who only reads reads the same levels, with names', async () => {
    const b = await boardAs(GOV, ...JUMA);
    expect(b.whatEachLevelUnderstood.levels.map((l: any) => l.who)).toEqual(['Stephen Nwachukwu', 'Ngozi Duru', 'Musa Ibrahim']);
  });

  it('Ngozi, who checks in, is served none of it', async () => {
    expect(kindsFields(await boardAs(GOV, 'u-ngozi', 'MEMBER'))).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */

const LOANS: Setup = {
  kindOfWork: 'asset loans', initiatorId: 'u-lead', label: 'Asset loan cohort, first repayment cycle',
  people: [
    person('p-amaka', 'u-lead', 'Amaka', 'Nwachukwu', PartyType.INITIATOR), person('p-sunday', 'u-sunday', 'Sunday', 'Eze'),
    person('p-hauwa', 'u-hauwa', 'Hauwa', 'Ibrahim'), person('p-musa', 'u-musa', 'Musa', 'Danjuma'), person('p-yakubu', 'u-yakubu', 'Yakubu', 'Sani'),
  ],
  checkIns: [answered('p-sunday', 1), answered('p-hauwa', 1), answered('p-musa', 1), { ...answered('p-yakubu', 1), status: 'NOT_STARTED', completedAt: null }],
  items: [
    item('l-1', 'loan', 'Grinding machine', { ownerParticipantId: 'p-sunday', stage: 'Repaying' }),
    item('l-2', 'loan', 'Freezer', { ownerParticipantId: 'p-hauwa', stage: 'Repaying' }),
    item('l-3', 'loan', 'Tricycle', { ownerParticipantId: 'p-yakubu', stage: 'Late' }),
  ],
  /* Musa: "I never received the machine. ... I've called the field officer eleven times. Nothing happened." */
  dependencies: [handoff('d-musa', 'p-musa', 'the grinding machine', { onLabel: 'the field officer', status: 'BLOCKING', sourceCheckInId: 'c1-p-musa' })],
};

describe('asset loans', () => {
  it('Amaka, who runs it, reads where the cohort stands, with who is in each group', async () => {
    const b = await boardAs(LOANS, ...LEAD);
    expect(b.whereTheCohortStands).toEqual({
      heading: 'Where the cohort stands',
      says: '4 people are in this cohort.',
      groups: [
        { group: 'repaying', count: 2, says: 'The loan records show 2 loans being repaid.', who: ['Sunday Eze', 'Hauwa Ibrahim'] },
        { group: 'behind', count: 1, says: 'The loan records show 1 loan behind on repayment.', who: ['Yakubu Sani'] },
        { group: 'blocked', count: 1, says: '1 person is waiting on something that stops them, and it has not been cleared.', who: ['Musa Danjuma'] },
        { group: 'not heard from', count: 1, says: '1 person has not checked in yet.', who: ['Yakubu Sani'] },
      ],
    });
    expect(b.supportGiven).toEqual({ heading: 'Support given, and whether it helped', state: 'not-known', why: NO_SUPPORT_ON_RECORD });
    expect(NO_SUPPORT_ON_RECORD).toBe('Nothing on record says what support each person was given, or whether it helped, so this cannot be shown yet.');
  });

  it('an admin who only reads, and the admin who set it up, read the same groups with names', async () => {
    for (const [setup, reader] of [[LOANS, JUMA], [{ ...LOANS, createdByUserId: 'u-setup' }, SETUP_ADMIN]] as const) {
      const b = await boardAs(setup as Setup, reader[0], reader[1]);
      expect(b.whereTheCohortStands.groups.find((g: any) => g.group === 'blocked').who).toEqual(['Musa Danjuma']);
    }
  });

  it('without loan records, it says so rather than counting nothing', async () => {
    const b = await boardAs({ ...LOANS, items: [] }, ...LEAD);
    expect(b.whereTheCohortStands.groups[0]).toEqual({ group: 'repaying', state: 'not-known', why: 'No loan record says who is repaying or who is behind yet.' });
  });

  it('Musa, who checks in, is served none of it, and nobody else\'s loan', async () => {
    const b = await boardAs(LOANS, 'u-musa', 'MEMBER');
    expect(kindsFields(b)).toEqual([]);
    expect(JSON.stringify({ ...b, participants: undefined, whoIsAway: undefined })).not.toMatch(/Freezer|Tricycle|Grinding machine/);
  });
});

/* ---------------------------------------------------------------------------------------------- */

const MATTER_LINES = [
  line('e-frank', 'p-frank', 'PROGRESS', 'The supplier has acknowledged every ticket within two hours so far.'),
  line('e-frank-2', 'p-frank', 'PROGRESS', 'Three fixes have taken over a week.'),
];
const MATTER: Setup = {
  kindOfWork: 'a law firm matter', initiatorId: 'u-lead', label: 'What we think we signed up to',
  people: [person('p-adaeze', 'u-lead', 'Adaeze', 'Obi', PartyType.INITIATOR), person('p-frank', 'u-frank', 'Frank', 'Mbeki')],
  checkIns: [answered('p-frank', 1)],
  lines: MATTER_LINES, turns: theirTurns(MATTER_LINES),
  items: [item('m-1', 'deadline', 'the reply to the supplier', { dueAt: new Date('2026-10-02T00:00:00Z') })],
  report: {
    ...A_RELEASED_REPORT,
    divergences: [{ topic: 'What the service agreement means', positions: [
      { participantLabel: 'The initiator', view: 'Critical issues are resolved within four hours.' },
      { participantLabel: 'Participant A', view: 'All tickets are acknowledged within four hours.' },
    ] }],
  },
};

describe('a law firm matter', () => {
  it('Adaeze, who runs it, reads where it stands, what she needs to decide, and what was said this session', async () => {
    const b = await boardAs(MATTER, ...LEAD);
    expect(b.whereTheMatterStands).toEqual({
      heading: 'Where the matter stands',
      /* `state` added on 5 October (request 134 item 7), like the other sections of this board. */
      state: 'filled',
      says: ['The reply to the supplier is due on 2 October.', 'Nothing is in the way that has not been cleared.', '1 thing is waiting for a decision.'],
    });
    expect(b.whatYouNeedToDecide.heading).toBe('What you need to decide');
    expect(b.whatYouNeedToDecide.items).toEqual([expect.objectContaining({ question: 'People in this check-in said different things about what the service agreement means.', owner: 'You' })]);
    expect(b.whatChangedThisWeek).toEqual({
      heading: 'What changed this week, and what it changed',
      state: 'filled',
      sessionNumber: 1,
      says: 'In session 1, 2 things were said about the matter.',
      lines: [
        expect.objectContaining({ participantId: 'p-frank', text: 'Frank Mbeki said, "The supplier has acknowledged every ticket within two hours so far."' }),
        expect.objectContaining({ participantId: 'p-frank', text: 'Frank Mbeki said, "Three fixes have taken over a week."' }),
      ],
      cannotTell: WHAT_IT_CHANGED_IS_NOT_ON_RECORD,
    });
  });

  it('an admin who only reads reads "What needs deciding", not "you"', async () => {
    const b = await boardAs(MATTER, ...JUMA);
    expect(b.whatYouNeedToDecide.heading).toBe('What needs deciding');
  });

  it('Frank, who checks in, is served none of it', async () => {
    expect(kindsFields(await boardAs(MATTER, 'u-frank', 'MEMBER'))).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */

const WHERE_NEXT: Setup = {
  kindOfWork: 'MarketView where next', initiatorId: 'u-lead', label: 'What the prospect actually needs',
  people: [person('p-julia', 'u-lead', 'Julia', 'Fernandes', PartyType.INITIATOR), person('p-martin', 'u-martin', 'Martin', 'Vogel'), person('p-ade', 'u-ade', 'Ade', 'Bello')],
  checkIns: [answered('p-martin', 1)],
  report: {
    ...A_RELEASED_REPORT,
    divergences: [{ topic: 'What the prospect needs', positions: [
      { participantLabel: 'The initiator', view: 'They have a reporting problem.' },
      { participantLabel: 'Participant A', view: 'They cannot hire enough analysts.' },
    ] }],
  },
};

describe('MarketView where next', () => {
  it('Julia, who runs it, reads that no group is on record, how many answered, and where they disagree', async () => {
    const b = await boardAs(WHERE_NEXT, ...LEAD);
    expect(b.byWhoTheyAre).toEqual({ heading: 'By who they are', state: 'not-known', why: NO_GROUP_ON_RECORD, says: '1 of 2 people has answered.' });
    expect(b.whereTheyDisagree.heading).toBe('Where they disagree');
    expect(b.whereTheyDisagree.items).toHaveLength(1);
    expect(JSON.stringify(b.whereTheyDisagree)).toContain('They cannot hire enough analysts.');
  });

  it('Martin, who checks in, is served none of it', async () => {
    expect(kindsFields(await boardAs(WHERE_NEXT, 'u-martin', 'MEMBER'))).toEqual([]);
  });

  /* Screen match, 16 October (mvnext-board.jpg): where the lead has said who each person is, the people asked are grouped by those words. */
  const DESCRIBED: Setup = {
    ...WHERE_NEXT,
    people: [
      person('p-julia', 'u-lead', 'Julia', 'Fernandes', PartyType.INITIATOR),
      { ...person('p-martin', 'u-martin', 'Martin', 'Vogel'), roleAsDescribed: 'Agroprocessor' } as any,
      { ...person('p-ade', 'u-ade', 'Ade', 'Bello'), roleAsDescribed: 'Researcher' } as any,
    ],
  };
  it('Julia reads the people grouped by who she said each one is, with how many in each answered', async () => {
    const b = await boardAs(DESCRIBED, ...LEAD);
    expect(b.byWhoTheyAre.state).toBe('filled');
    expect(b.byWhoTheyAre.groups).toEqual([
      { group: 'Agroprocessor', count: 1, answered: 1, says: '1 person, 1 answered.' },
      { group: 'Researcher', count: 1, answered: 0, says: '1 person, 0 answered.' },
    ]);
  });
  it('Martin, who checks in, is still served none of it, not even the lead’s words about who anybody is', async () => {
    const b = await boardAs(DESCRIBED, 'u-martin', 'MEMBER');
    expect(kindsFields(b)).toEqual([]);
    expect(JSON.stringify(b)).not.toContain('Researcher');
  });
});

/* ---------------------------------------------------------------------------------------------- */

const KWAMES = line('e-kwame', 'p-kwame', 'PROGRESS', "I've also had follow-up conversations with all 22 of my applications.", {
  checkInId: 'c2-p-kwame', documentSays: '14 applications were followed up in September.', documentSaysId: 'doc-crm',
});
const Q4: Setup = {
  ...SALES_RUN,
  kindOfWork: 'MarketView Q4',
  subjectExternalId: 'credit-q4',
  lines: [KWAMES],
  turns: [...(SALES_RUN.turns ?? []), { checkInId: 'c2-p-kwame', content: KWAMES.text }],
  documents: [{ id: 'doc-crm', fileName: 'follow-ups.csv', visibility: 'OPEN', participantId: 'p-bisi', createdAt: new Date('2026-09-16T12:00:00Z') }],
  metrics: [{ key: 'approved', says: 'Approved facilities this quarter', value: 11, unit: null, asOf: new Date('2026-09-30T09:00:00Z'), sourceSystem: 'The loan system', subjectExternalId: 'credit-q4' }],
};

describe('MarketView Q4', () => {
  it('Bisi, who runs it, reads what the systems show, and where what Kwame said and a document differ', async () => {
    const b = await boardAs(Q4, ...BISI);
    expect(b.whatTheSystemsShow.numbers.map((n: any) => n.says)).toEqual(['The loan system shows 11 for approved facilities this quarter, as of 30 September.']);
    expect(b.whereWhatWasSaidAndTheSystemsDiffer.rows).toEqual([{
      id: 'e-kwame', participantId: 'p-kwame',
      said: 'Kwame Mensah said, "I\'ve also had follow-up conversations with all 22 of my applications."',
      documentSays: 'A document on this check-in says it differently. It says, "14 applications were followed up in September."',
    }]);
  });

  it('an admin who only reads reads the same', async () => {
    const b = await boardAs(Q4, ...JUMA);
    expect(b.whatTheSystemsShow.state).toBe('filled');
    expect(b.whereWhatWasSaidAndTheSystemsDiffer.rows).toHaveLength(1);
  });

  it('a document only Kwame may open is not quoted to anybody else', async () => {
    const b = await boardAs({ ...Q4, documents: [{ ...Q4.documents![0], visibility: 'OWN', participantId: 'p-kwame' }] }, ...BISI);
    expect(b.whereWhatWasSaidAndTheSystemsDiffer.state).toBe('none-yet');
    expect(JSON.stringify(b)).not.toContain('14 applications were followed up');
  });

  it('with no numbers brought in, it says so and invents nothing', async () => {
    const b = await boardAs({ ...Q4, metrics: [] }, ...BISI);
    expect(b.whatTheSystemsShow).toEqual({ heading: 'What the systems show', state: 'not-known', why: NO_NUMBERS_FROM_ANOTHER_SYSTEM });
  });

  it('Kwame, who checks in, is served none of it', async () => {
    expect(kindsFields(await boardAs(Q4, ...KWAME))).toEqual([]);
  });
});

describe('the six kinds that use the switchboard, and a check-in of no known kind', () => {
  it('get none of these fields', async () => {
    for (const kindOfWork of ['sales org', 'engineering release', 'support desk', 'distribution operations', 'trader training programme', null]) {
      expect(kindsFields(await boardAs({ ...SALES_RUN, kindOfWork }, ...BISI))).toEqual([]);
    }
  });
});

describe('no label on a person, and no working note', () => {
  it('in any of the five, for the lead', async () => {
    for (const setup of [GOV, LOANS, MATTER, WHERE_NEXT]) {
      const all = JSON.stringify(await boardAs(setup, ...LEAD));
      expect(all).not.toMatch(/\b(PIP|at risk|underperform|exit|verdict)\b/i);
    }
    expect(JSON.stringify(await boardAs(Q4, ...BISI))).not.toMatch(/\b(PIP|at risk|underperform|verdict)\b/i);
  });
});

describe('every sentence in the five is plain, for each reader', () => {
  it('walks every served sentence of these fields', async () => {
    const { whatIsNotPlainIn, everyProductSentence } = require('../reports/a-product-sentence-is-plain');
    const failures: string[] = [];
    let walked = 0;
    const withNumbers = { ...GOV, metrics: [{ key: 'visits', says: 'Extension visits this month', value: 412, unit: null, asOf: new Date('2026-09-30T09:00:00Z'), sourceSystem: 'The visit log', subjectExternalId: 'rollout-1' }] };
    for (const [setup, readers] of [[withNumbers, [LEAD, JUMA]], [LOANS, [LEAD, JUMA]], [{ ...LOANS, items: [] }, [LEAD]], [MATTER, [LEAD, JUMA]], [WHERE_NEXT, [LEAD, JUMA]], [Q4, [BISI, JUMA]], [{ ...Q4, metrics: [] }, [BISI]]] as const) {
      for (const reader of readers) {
        const b = await boardAs(setup as Setup, reader[0], reader[1]);
        const mine = Object.fromEntries(kindsFields(b).map((k) => [k, b[k]]));
        for (const s of everyProductSentence(mine)) {
          walked++;
          for (const f of whatIsNotPlainIn(s.text, { whole: s.whole, readerIsLead: reader === LEAD || reader === BISI })) failures.push(`${s.path} [${f.rule}] ${JSON.stringify(f.found)}`);
        }
      }
    }
    expect(walked).toBeGreaterThan(40);
    expect(failures).toEqual([]);
  });
});

describe('on an evaluation check-in', () => {
  it('the person reviewed is served none of it, and the admin who set it up reads it', async () => {
    const { GroundScenario } = require('@prisma/client');
    const pip = { ...LOANS, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect(kindsFields(await boardAs(pip, 'u-sunday', 'MEMBER'))).toEqual([]);
    expect(kindsFields(await boardAs(pip, ...SETUP_ADMIN))).toEqual(['supportGiven', 'whereTheCohortStands']);
  });
});
