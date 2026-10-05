import { Logger } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { onlyNumbersTheBlocksHold, numbersNotHeld, theNumbersTheMaterialHolds } from './a-number-the-blocks-hold';

/**
 * REQUEST 135 ITEM 3: "Amani Wekesa has named four different activities in two locations", about two crops in two
 * places. A number the blocks do not hold is not written. The crisis case of the 5 October run (the alert at 02:14
 * called "the 7 AM alerts") is a number the blocks DO hold, on the wrong thing: this check cannot catch it, and the
 * test says so, so nobody mistakes the check for the fix.
 */
const AMANI_BLOCK = [
  '2 people, 1 session.',
  '',
  '--- the initiator (RUNS THIS CHECK-IN - not one of the people being checked in on)',
  '',
  '--- participant A',
  '    what the record holds: participant A says maize and soya are being grown in Kaduna and Kano.',
].join('\n');

describe('a number in the judgement is one the blocks hold', () => {
  it('leaves out "four different activities", and keeps "two crops in two places"', () => {
    const { judgement, leftOut } = onlyNumbersTheBlocksHold({
      theGap: 'Participant A has named four different activities in two locations. Participant A grows two crops in two places.',
      whatToDo: [
        { move: 'Ask participant A which of the four activities is the best place to expand.', because: 'Four activities were named.', startWith: 'participant A' },
        { move: 'Ask participant A which of the two places is the best place to expand.', because: 'Two places were named.', startWith: 'participant A' },
      ],
      whatTheNumbersSay: [],
      whatThisCannotTellYou: [],
      whatWeFailedToAsk: [],
    }, AMANI_BLOCK);
    expect(judgement.theGap).toBe('Participant A grows two crops in two places.');
    expect(judgement.whatToDo.map((m: any) => m.move)).toEqual(['Ask participant A which of the two places is the best place to expand.']);
    expect(leftOut.length).toBe(2);
  });

  it('leaves alone a date, a year, a time the block holds, words in quotation marks, and small counts', () => {
    const held = theNumbersTheMaterialHolds('Tunde said the alert fired at 02:14, and 11 applications are with credit.');
    for (const line of [
      'Ask Tunde about the 11 applications by 30 September.',
      'In 2026 the alert fired at 2:14.',
      'Tunde said "we lost 40 crates".',
      'Speak with the two of them, one at a time, about the three suppliers.',
    ]) expect(numbersNotHeld(line, held)).toEqual([]);
  });

  it('cannot catch a number the blocks hold, put on the wrong thing (the crisis case), which is the prompt\'s job', () => {
    const held = theNumbersTheMaterialHolds('Elena Rossi saw alerts at 7 AM on Tuesday. The alert fired at 02:14 and went to a rota nobody updated.');
    expect(numbersNotHeld('Nobody responded to the 7 AM alerts.', held)).toEqual([]);
  });
});

describe('the room judgement is held to it when it is written', () => {
  it('a line with a number no block holds is not stored', async () => {
    const model = { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) };
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = new Proxy({}, { get: (t: any, p: string) => (t[p] ??= model) });
    svc.logger = new Logger('test');
    svc.prompts = { getActive: jest.fn(async () => { throw new Error('none'); }) };
    svc.anthropic = { extract: jest.fn(async () => ({
      theGap: 'Participant A has named four different activities in two locations.',
      whatToDo: [{ move: 'Ask participant A which place comes first.', because: 'Participant A named two places.', startWith: 'participant A' }],
      whatTheNumbersSay: [{ says: 'Participant A has named four activities.', soWhat: 'Too many to fund.' }],
      whatWeFailedToAsk: [], whatThisCannotTellYou: [],
    })) };
    const out = await svc.judgeTheAnswers('g1', {
      people: [
        { who: 'the initiator', isLead: true, role: null, finding: null, participantId: 'p1' },
        { who: 'participant A', isLead: false, role: null, finding: 'participant A says maize and soya are being grown in Kaduna and Kano.', participantId: 'p2' },
      ],
      leadName: 'Wairimu Kamau',
      differences: [],
    });
    expect(out.judgement.whatTheNumbersSay).toEqual([]);
    expect(out.judgement.whatToDo.map((m: any) => m.move)).toEqual(['Ask participant A which place comes first.']);
    /* The only sentence of the gap is kept and logged, because the gap is what the reader reads first. */
    expect(out.judgement.theGap).toBe('Participant A has named four different activities in two locations.');
  });
});
