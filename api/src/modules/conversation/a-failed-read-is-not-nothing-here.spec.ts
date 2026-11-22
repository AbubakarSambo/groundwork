import { AnthropicService } from './anthropic.service';
import { THE_ASSESSMENT_SCHEMA, thePartsFrom, withTheMarksOnTheItems } from './the-assessment';
import { theReadIsStillToCome, howManyReadsAreStillToCome } from './the-read-is-owed';
import { whereASessionsReportStands } from './where-a-sessions-report-stands';
import { assessTheConversation } from './assess-the-conversation';
import { atAGlanceTiles } from '../reports/what-this-session-holds';
import { theTargetLines } from '../engagement/the-direct-morning';

/**
 * FIX PLAN 16 NOVEMBER, GROUP 1: a read the model could not give is "not read yet", never "nothing here".
 * These read what a person is told, for each page that used to say "nothing" over a read that had only failed.
 */
const sizeOf = (schema: any): number => {
  const svc = Object.create(AnthropicService.prototype) as any;
  let n = 0;
  (function walk(x: any) {
    if (!x || typeof x !== 'object') return;
    for (const v of Object.values(x.properties ?? {})) { n += 1; walk(v); }
    if (x.items) walk(x.items);
  })(svc.convertSchema(schema));
  return n;
};

describe('the request the assessment sends the model', () => {
  it('does not repeat the three marks on every section (the 400 INVALID_ARGUMENT on every read of the 15 November run)', () => {
    const json = JSON.stringify(THE_ASSESSMENT_SCHEMA);
    expect(json.match(/"aboutWhom"/g)).toHaveLength(1);
    expect(json.match(/"wellbeing"/g)).toHaveLength(1);
    expect(json.match(/"cannotBeTrue"/g)).toHaveLength(1);
    /* It was 306 fields with the three marks on every item; it is 215 with them said once. */
    expect(sizeOf(THE_ASSESSMENT_SCHEMA.input_schema)).toBeLessThanOrEqual(220);
  });

  it('reads the marks back onto their items, so who may see a line and what cannot be true are read as before', () => {
    const said = new Map<number, string>([[1, 'Remy has sold 5 units this month'], [2, 'My mum is in hospital'], [3, 'I sold 10,000 freezers today']]);
    const answer = {
      summary: 'x', nothingToRecord: [],
      numbers: [{ words: 'Remy has sold 5 units this month', from: [1], figure: '5' }],
      everythingElse: [{ words: 'My mum is in hospital', from: [2] }],
      claims: [{ words: 'I sold 10,000 freezers today', from: [3], claim: 'sold 10,000 freezers' }],
      marks: [
        { words: 'remy has sold 5 units this month', aboutWhom: 'Remy' },
        { words: 'My mum is in hospital', wellbeing: true },
        { words: 'I sold 10,000 freezers today', cannotBeTrue: 'No one person sells that many in a day.' },
      ],
    };
    expect(withTheMarksOnTheItems(answer).numbers[0].aboutWhom).toBe('Remy');
    const parts: any = thePartsFrom(answer, said, { hasSetup: false, previous: null, givenRole: null, read: 1, isTheLead: true });
    expect(parts.numbers[0].aboutWhom).toBe('Remy');
    expect(parts.everythingElse[0].whoMaySee).toBe('the person only');
    expect(parts.claims[0].cannotBeTrue).toBe('No one person sells that many in a day.');
  });
});

describe('a conversation whose read failed', () => {
  const failed = async () => {
    const row: any = {
      id: 'c1', groundId: 'g1', participantId: 'p1', sessionNumber: 1, startedAt: new Date(), completedAt: new Date(), whatWeHave: null, sessionReport: null,
      turns: [{ id: 't1', role: 'PERSON', content: 'We sold 30 units this week and Joel says leads are the blocker.', createdAt: new Date() }],
      participant: { partyType: 'MEMBER', nameGiven: 'Mary', roleAsDescribed: null, user: { firstName: 'Mary', lastName: 'W', jobTitle: null } },
      ground: { label: 'Sales', initiator: { firstName: 'Lucy', lastName: 'L' } },
    };
    let saved: any = null;
    const prisma: any = {
      checkIn: { findUnique: async () => ({ ...row, sessionReport: saved }), findMany: async () => [], update: async ({ data }: any) => { saved = data.sessionReport; return row; } },
      groundObjective: { findMany: async () => [] }, groundCommitment: { findMany: async () => [] }, groundDocument: { findMany: async () => [] },
      groundParticipant: { findMany: async () => [], findFirst: async () => null },
    };
    const anthropic: any = { extract: async () => { throw new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}'); } };
    await assessTheConversation({ prisma, anthropic }, 'c1', { howItEnded: 'finished by the person', closedAt: new Date() });
    return saved;
  };

  it('is marked not read yet on the check-in, and keeps what the person said whole', async () => {
    const column = await failed();
    expect(theReadIsStillToCome({ sessionReport: column })).toBe(true);
    expect(column.everythingElse[0].words).toContain('We sold 30 units');
  });

  it('is also still to come while the check-in owes the read, and is not once it has landed', () => {
    expect(theReadIsStillToCome({ writesOwed: [{ step: 'the assessment', tries: 1 }] })).toBe(true);
    expect(theReadIsStillToCome({ writesOwed: [{ step: 'the record', tries: 1 }] })).toBe(false);
    expect(theReadIsStillToCome({ writesOwed: null, sessionReport: null })).toBe(false);
  });

  it('is counted for a check-in or for one person', async () => {
    const asked: any[] = [];
    const prisma: any = { checkIn: { findMany: async (a: any) => { asked.push(a.where); return [{ writesOwed: [{ step: 'the assessment' }] }, { writesOwed: null, sessionReport: null }]; } } };
    expect(await howManyReadsAreStillToCome(prisma, 'g1')).toBe(1);
    expect(await howManyReadsAreStillToCome(prisma, 'g1', 'p9')).toBe(1);
    expect(asked[1].participantId).toBe('p9');
  });
});

describe('what each page says while the read is still to come', () => {
  const quiet = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false } as const;

  it('the report tiles say the read is not in, and never "None", "Nothing to compare yet" or "Nothing on record yet"', () => {
    const tiles = atAGlanceTiles({ ...quiet, readsStillToCome: 2 });
    const said = tiles.map((t) => `${t.value}. ${t.sub}`).join(' ');
    expect(said).not.toMatch(/None|Nothing to compare|Nothing on record|No target set|Nobody named/);
    expect(tiles.every((t) => t.value === 'Not read yet' && t.sub === 'Groundwork is still working out what people said. This page will fill in when it has.')).toBe(true);
  });

  it('a tile that found something is left as it was', () => {
    const tiles = atAGlanceTiles({ ...quiet, stillOpen: 1, blocked: 2, readsStillToCome: 1 });
    expect(tiles.find((t) => t.label === 'Differences')!.value).toBe('1');
    expect(tiles.find((t) => t.label === 'Blockers')!.value).toBe('2');
  });

  it('with every read in, the tiles say what they always said', () => {
    expect(atAGlanceTiles({ ...quiet, agreed: 1 }).find((t) => t.label === 'Differences')!.value).toBe('None');
  });

  it('the check-in report says it is being worked out, not that none was kept', () => {
    const now = whereASessionsReportStands({ report: null, finishedAt: new Date(), readIsStillToCome: true });
    expect(now.state).toBe('being-read');
    expect(now.says).toBe('Groundwork is still working out the report for this check-in. What you said is below, and the report will appear here when it is ready.');
    expect(whereASessionsReportStands({ report: null, finishedAt: new Date() }).says).toBe('There is no report for this check-in yet. What you said is below.');
  });

  it('the lead\'s morning says the team target is being worked out, and only says there is none when it is true', () => {
    const board = { objectives: [] };
    expect(theTargetLines(board, new Date(), 'Africa/Lagos', true).lines[0].text).toBe('Groundwork is still working out the team target from what was said, so it is not shown yet.');
    expect(theTargetLines(board, new Date(), 'Africa/Lagos', false).lines[0].text).toBe('No team target is on record yet, so set one in your check-in.');
  });
});
