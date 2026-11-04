import { FC, theCheckAsADatabase, theCheckRebuiltEachEvening, thePersonOfTheCheck, THURSDAY_MORNING, FRIDAY_EVENING, type AGroundOfTheCheck } from './the-final-check-bed';
import { rebuildThePersonsRecords, readThePersonsRecord } from './the-persons-record-store';
import { theRecordInWords } from './the-persons-record-in-words';
import { yourTeamPersonByPerson } from './your-team-person-by-person';
import { readMyWork } from './my-work';
import { theDirectMorningFor } from '../engagement/the-direct-morning';

/**
 * WHAT THE FINAL REAL-MODEL CHECK FOUND IN EACH PERSON'S RECORD, AS EACH READER READS IT (Hafsah, 21 October 2026). The rows are the run's
 * own (gw_final_check, `__fixtures__/the-final-check.json`), read with no database and no model, and rebuilt each evening a check-in
 * finished, as the run kept them. Every expectation is a sentence a person reads: the lead on her board, and the person on My work.
 */
const KIND = { drop: 'sales', fees: 'collections', lit: 'matter' } as const;

async function theTable(g: AGroundOfTheCheck, end = FRIDAY_EVENING) {
  return theCheckRebuiltEachEvening(g, rebuildThePersonsRecords, end);
}
async function theirRecord(g: AGroundOfTheCheck, first: string, self: boolean, end = FRIDAY_EVENING) {
  const t = await theTable(g, end);
  const stored = await readThePersonsRecord({ personRecord: t }, thePersonOfTheCheck(g, first).participantId);
  return theRecordInWords(stored!.record, stored!.coaching, { self, firstName: first }, FC[g].ground.label);
}
async function theLeadsTeam(g: AGroundOfTheCheck, end = FRIDAY_EVENING) {
  const t = await theTable(g, end);
  return (await yourTeamPersonByPerson(theCheckAsADatabase(g, { directMorning: true, personRecord: t, asOf: end }), { groundId: FC[g].ground.id, leadUserId: FC[g].ground.initiatorId, board: {}, kind: KIND[g], now: end })) as any;
}
async function theirMyWork(g: AGroundOfTheCheck, first: string, end = FRIDAY_EVENING) {
  const t = await theTable(g, end);
  return readMyWork(theCheckAsADatabase(g, { directMorning: true, personRecord: t, asOf: end }), null, { groundId: FC[g].ground.id, userId: thePersonOfTheCheck(g, first).userId, personId: null }, end) as Promise<any>;
}
const personOf = (team: any, first: string) => team.people.find((p: any) => p.name.startsWith(`${first} `));
const everyLine = (w: any): string[] => JSON.stringify(w).match(/"(?:[^"\\]|\\.)*"/g)!.map((x) => JSON.parse(x));

describe('Mercy, whose "blockers" were a school with no budget, the school board, and her own idea (item 2)', () => {
  it('her record holds no blocker she raised, and Grace is not told she needs coaching on blockers', async () => {
    const own = await theirRecord('drop', 'Mercy', true);
    expect(own.parts.map((p) => p.heading)).not.toContain('Blockers');
    const team = await theLeadsTeam('drop');
    expect(personOf(team, 'Mercy').whereTheyStand.says).not.toMatch(/blocker/i);
    expect(everyLine(team)).not.toContain('Mercy needs coaching on trying something before raising a blocker.');
  });
  it('her My work does not say she raised blockers without trying, and nobody reads "can look like excuses"', async () => {
    const page = await theirMyWork('drop', 'Mercy');
    const blockers = page.performing.behaviours.find((b: any) => b.key === 'handling-blockers');
    expect(blockers.verdict).toBe('Not enough yet');
    expect(JSON.stringify(page)).not.toMatch(/excuses?/i);
  });
});

describe('Kevin and Mercy, who checked in every day of the run (item 3)', () => {
  it.each(['Kevin', 'Mercy'])('%s reads the same count of check-ins on My work and in the record, and a session not yet open does not count', async (who) => {
    const page = await theirMyWork('drop', who);
    const quality = page.performing.behaviours.find((b: any) => b.key === 'check-in-quality');
    const part = page.record.parts.find((p: any) => /check-ins$/.test(p.heading));
    /* Thursday's session opened at 08:00 on Thursday 15 October and was not done by Friday evening: both say so, the same way. */
    expect(quality.happened).toBe('You did 3 of 4 check-ins on time. 3 of 3 were specific.');
    /* One missed in four is not "Needs work" while the record does not coach on it: the same bar. */
    expect(quality.verdict).toBe('Strength');
    expect(part.says).toBe('You did three of four check-ins, all on time. Three of them named the item, what changed and the day.');
    /* On Thursday morning, before that session opened, it is not counted anywhere. */
    const thursday = await theirRecord('drop', who, true, THURSDAY_MORNING);
    expect(thursday.parts.find((p) => /check-ins$/.test(p.heading))!.says).toBe('You did three of three check-ins, all on time. Three of them named the item, what changed and the day.');
  });
  it('Grace’s own sessions, which are optional for the lead, are never counted as check-ins due', async () => {
    const own = await theirRecord('drop', 'Grace', true);
    expect(own.parts.map((p) => p.heading)).not.toContain('Your check-ins');
  });
});

describe('Njeri, who filed the Equity slip for FN-004 (item 4)', () => {
  it('Wanjiru reads what Njeri recorded as paid, with the slip that shows it, and never that nothing is on record', async () => {
    const n = personOf(await theLeadsTeam('fees'), 'Njeri');
    expect(n.delivered.empty).toBeNull();
    expect(n.delivered.proven).toEqual(['On Monday 12 October Njeri said “I have recorded KES 250,000 for FN-004.” A document Njeri added shows it.']);
    expect(everyLine(n)).not.toContain('Nothing Njeri said was paid, signed or done is on record yet.');
  });
});

describe('Peter, who checked in on Monday and on none of the days after (item 5)', () => {
  it('his record counts each working day his session stayed open, and Grace is not told he is doing well', async () => {
    const own = await theirRecord('drop', 'Peter', false);
    expect(own.parts.find((p) => /check-ins$/.test(p.heading))!.says).toBe('Peter did one of four check-ins, all on time. One of them named the item, what changed and the day.');
    const p = personOf(await theLeadsTeam('drop'), 'Peter');
    expect(p.whereTheyStand.says).toBe('Peter needs coaching on checking in every time.');
    expect(everyLine(p)).not.toContain('Peter is doing well.');
  });
  it('Grace’s Thursday morning says Peter has missed two days, and to call him', async () => {
    const t = await theTable('drop', THURSDAY_MORNING);
    const m: any = await theDirectMorningFor(theCheckAsADatabase('drop', { directMorning: true, personRecord: t, asOf: THURSDAY_MORNING }), { groundId: FC.drop.ground.id, leadUserId: FC.drop.ground.initiatorId, board: { objectives: [], workRecords: [] }, now: THURSDAY_MORNING });
    const team = m.parts.find((x: any) => x.key === 'team').lines.filter((l: any) => !l.boardOnly).map((l: any) => l.text);
    expect(team).toContain('Peter hasn\'t checked in for 2 days, on Tuesday 13 October and Wednesday 14 October, so call Peter.');
  });
});

describe('Brian on the litigation team (item 6)', () => {
  it('is coached on trying something before raising a blocker, never on a "signed order", and his Wednesday words are dated Wednesday (item 18)', async () => {
    const b = personOf(await theLeadsTeam('lit'), 'Brian');
    expect(b.whereTheyStand.says).toBe('Brian needs coaching on trying something before raising a blocker.');
    expect(JSON.stringify(b)).not.toMatch(/signed order/i);
    const blockers = b.record.parts.find((p: any) => p.heading === 'Blockers');
    expect(blockers.evidence[0]).toBe('On Monday 12 October Brian raised a blocker, waiting for the signed verifying affidavit, and did not say what had been tried first. On Wednesday 14 October Brian said what was tried after that, “I did follow up yesterday”.');
  });
});

describe('Aisha, who chased the witness statements every day (items 2 and 7)', () => {
  it('is not coached on raising blockers with nothing tried, and "Jamii cleared our fee note" is a payment she said, not a blocker', async () => {
    const a = personOf(await theLeadsTeam('lit'), 'Aisha');
    expect(a.whereTheyStand.says).not.toMatch(/blocker/i);
    const own = await theirRecord('lit', 'Aisha', true);
    expect(own.parts.find((p) => p.heading === 'Blockers')!.evidence).toEqual([
      'On Wednesday 14 October you raised a blocker, waiting for the last witness statement, and on Monday 12 October you had already said what was tried, “reached out to their HR manager this morning”.',
    ]);
    expect(own.parts.find((p) => /^What you said/.test(p.heading))!.evidence).toEqual([
      'On Wednesday 14 October you said “Jamii said today they\'ve cleared our fee note.” Nothing on file shows it yet.',
    ]);
  });
});

describe('Mercy’s promise to call Mrs. Achola (item 18)', () => {
  it('reads that she said later it was not done, not that nothing was said about it', async () => {
    const own = await theirRecord('drop', 'Mercy', false);
    expect(own.parts.find((p) => p.heading === 'Promises')!.says).toBe('Mercy made one promise that came due, and it was not kept. Mercy said later it was not done.');
  });
});

describe('the praise Grace is offered, and the plan sentence (item 19, and the browser test)', () => {
  it('suggests praise only for somebody doing well or improving, in words from the record', async () => {
    const team = await theLeadsTeam('drop');
    expect(personOf(team, 'Kevin').actions[0].suggested).toBe('Well done on backing what you said with proof.');
    for (const who of ['Joseph', 'Peter', 'Mercy']) expect(personOf(team, who).actions[0].suggested).toBeUndefined();
    expect(JSON.stringify(team)).not.toContain('Well done on your work this month.');
    const aisha = personOf(await theLeadsTeam('lit'), 'Aisha');
    expect(aisha.actions[0].suggested).toBeUndefined();
  });
  it('says truly who reads a plan: the lead and the organisation’s admins', async () => {
    const team = await theLeadsTeam('drop');
    expect(personOf(team, 'Joseph').actions[1].does).toBe('Keeps what you want to help Joseph with, here and under People on References and resources. Only you read it. Nothing is sent to Joseph.');
  });
});

describe('never "Groundwork has not coached" beside coaching (item 20)', () => {
  it.each(['drop', 'fees', 'lit'] as const)('%s: no person is served the not-coached line with coaching or a needs-coaching line', async (g) => {
    for (const p of (await theLeadsTeam(g)).people) {
      const coached = (p.record?.coaching?.length ?? 0) > 0 || /needs (?:coaching|a hard conversation)/.test(p.whereTheyStand?.says ?? '');
      if (coached) expect([p.name, p.record?.coachingEmpty ?? null]).toEqual([p.name, null]);
    }
  });
});

describe('Joseph’s figure for Mama Pima Stores (item 8)', () => {
  it('is a figure that changed, with his reason, never one he put right', async () => {
    const own = await theirRecord('drop', 'Joseph', false);
    const figures = own.parts.find((p) => p.heading === 'Figures that changed')!;
    expect(figures.says).toBe('One figure Joseph gave changed from one check-in to the next, and Joseph said why.');
    expect(figures.evidence).toEqual(['On Monday 12 October Joseph said 10 units for Mama Pima Stores, and on Tuesday 13 October Joseph said “Mama Pima is actually 15 units now, she\'s expanding.”']);
    expect(JSON.stringify(own)).not.toMatch(/put the figure for Mama Pima Stores right/);
  });
});

describe('the board lists no customer’s own budget or approval as a blocker (item 2)', () => {
  it('drops Mercy’s school and school board, keeps her ask of Grace, and keeps a real wait', async () => {
    const { notABlockerTheyRaised } = await import('./not-a-blocker-they-raised');
    const grace = thePersonOfTheCheck('drop', 'Grace').participantId;
    const forTheBoard = { sales: true, keepTheAsks: true, keepWhatCleared: true };
    expect(notABlockerTheyRaised({ what: 'the budget', onLabel: 'the school' }, forTheBoard)).toBe(true);
    expect(notABlockerTheyRaised({ what: 'approval', onLabel: 'the school board' }, forTheBoard)).toBe(true);
    expect(notABlockerTheyRaised({ what: 'thoughts on the payment plan idea for kiosks', onParticipantId: grace }, forTheBoard)).toBe(false);
    expect(notABlockerTheyRaised({ what: 'the pricing for Juja Hardware', onLabel: 'us' }, forTheBoard)).toBe(false);
  });
});

describe('a sentence about the process is not a payment said (item 10)', () => {
  it('"how quickly everything went through" is not a claim; "it went through on Friday" is', async () => {
    const { aClaimIn } = await import('./the-persons-record');
    expect(aClaimIn('With Kilele Hotel, Mr. Ochieng was really happy with how quickly everything went through.')).toBeNull();
    expect(aClaimIn('For Jamii Clinics, FN-007, I think they\'ve paid, it went through on Friday.')).toBe('payment');
  });
});

describe('Kevin’s numbers on My work say the deposit apart (item 10)', () => {
  it('reads 46 sold, 40 paid with proof, 6 on a deposit, and his proof is not called missing', async () => {
    const { myWorkFrom } = await import('./my-work');
    const row = (name: string, units: string, more: Record<string, any>) => ({ id: name, kind: 'deal', name, stage: 'Won', group: 'won', ownerParticipantId: 'p-kevin', fields: { Units: units }, ...more });
    const page: any = myWorkFrom({
      reader: 'self', person: { participantId: 'p-kevin', name: 'Kevin Omondi', firstName: 'Kevin' }, leadFirst: 'Grace', kindOfWork: 'sales team',
      items: [row('Kilele Hotel', '40', { paymentRecord: true }), row('Savannah Cafe', '6', { paymentRecord: true, deposit: { paid: 15000, of: 30000, currency: 'KES', says: 'Deposit paid, KES 15,000 of KES 30,000.' } })] as any,
      commitments: [], waitsOnThem: [], raised: [], credits: [], checkIns: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null,
      target: { count: 46, target: 30 }, now: new Date('2026-10-16T14:30:00Z'), timeZone: 'Africa/Nairobi',
    } as any, 'Sales team, Q4');
    expect(page.numbers[0]).toEqual({ value: '46', label: 'sold, 40 paid with proof, 6 on a deposit' });
    expect(page.performing.behaviours.find((b: any) => b.key === 'backing-claims-with-proof')).toMatchObject({ verdict: 'Strength', happened: 'Every one of your 2 sales has proof.' });
  });
});

describe('Wanjiru, who runs the fee notes, is not told she raised blockers when she waits on her own team', () => {
  it('her My work does not say she raised four blockers with nothing tried', async () => {
    const page = await theirMyWork('fees', 'Wanjiru');
    expect(page.performing.behaviours.find((b: any) => b.key === 'handling-blockers').verdict).toBe('Not enough yet');
    const own = await theirRecord('fees', 'Wanjiru', true);
    expect(JSON.stringify(own)).not.toMatch(/raised four blockers/);
  });
});

describe('Grace reads Kevin’s Savannah Cafe as sold on a deposit (item 10)', () => {
  it('never "a payment record shows it"', async () => {
    const { whatTheyDelivered } = await import('./what-the-lead-reads-about-each-person');
    const board = { workRecords: [{ section: 'Deal grid', rows: [
      { kind: 'deal', name: 'Savannah Cafe', group: 'won', ownerParticipantId: 'p-kevin', fields: { Units: '6', Value: 'KES 30,000' }, paymentRecord: true, mpesaCode: 'RBT7Y3KQ2P', deposit: { paid: 15000, of: 30000, currency: 'KES', says: 'Deposit paid, KES 15,000 of KES 30,000.' } },
    ] }] };
    const d = whatTheyDelivered({ participantId: 'p-kevin', name: 'Kevin', role: null, kind: 'sales', board, stored: null });
    expect(d.proven).toEqual(['Savannah Cafe is won for 6 units on a deposit, and the M-Pesa code RBT7Y3KQ2P shows it. Deposit paid, KES 15,000 of KES 30,000.']);
  });
});

/** Mercy, polish round 2: "Nobody bought anything" was read as a sale with nothing on file, and the board said she needed coaching on proof. */
describe('a sentence that says nothing was sold is not a claim', () => {
  const { aClaimIn: claim } = require('./the-persons-record');
  it.each(['Nobody bought anything today.', 'No one paid yet.', 'None of them signed.'])('%s', (s) => {
    expect(claim(s)).toBeNull();
  });
});
