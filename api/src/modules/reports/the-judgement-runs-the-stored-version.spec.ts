import { Logger } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { withTheDirectMorning, THE_DIRECT_JUDGEMENT } from './the-direct-morning-is-written-straight';
import { theRoomJudgementTemplate, theJudgementOverARoom, THE_JUDGEMENT_ROOM_KEY } from './the-judgement-over-the-answers';

/**
 * THE JUDGEMENT RUNS ITS STORED VERSION, AND SAYS WHICH ONE (plan for requests 123 item 7, 134 item 4, 135 item 3).
 *
 * The judgement had no stored version, so nothing proved which instruction wrote a stored judgement. It now reads
 * `the_judgement_room` (or `the_judgement_population`) through `getActive`, falls back to the code text where none is
 * active, and keeps the id of the one that ran inside the judgement as `promptVersionId`.
 */
function judgeWith(stored: { id: string; content: string } | null) {
  const seen: string[] = [];
  const model = { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) };
  const prisma: any = new Proxy({}, { get: (t: any, p: string) => (t[p] ??= model) });
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  svc.prompts = { getActive: jest.fn(async (key: string) => { if (stored && key === THE_JUDGEMENT_ROOM_KEY) return stored; throw new Error('none'); }) };
  svc.anthropic = { extract: jest.fn(async (instruction: string) => { seen.push(instruction); return { theGap: 'Amina Bello has said nothing yet.', whatToDo: [], whatTheNumbersSay: [], whatWeFailedToAsk: [], whatThisCannotTellYou: [] }; }) };
  const room = {
    people: [
      { who: 'the initiator', isLead: true, role: null, finding: null, participantId: 'p1' },
      { who: 'participant A', isLead: false, role: null, finding: 'Amina Bello has said nothing yet.', participantId: 'p2' },
    ],
    leadName: 'Wairimu Kamau',
    differences: [],
  };
  return { run: () => svc.judgeTheAnswers('g1', room), seen };
}

describe('the judgement runs its stored version', () => {
  it('with none stored, it runs the code text and records no version', async () => {
    const { run, seen } = judgeWith(null);
    const out = await run();
    // The instruction that runs is the code text with the direct-morning block appended (reports.service.ts), so say so here.
    expect(seen[0]).toBe(withTheDirectMorning(theJudgementOverARoom('whoever called this check-in', 'what to do next about the people and the work it covers', 'Wairimu Kamau'), THE_DIRECT_JUDGEMENT));
    expect(out.judgement.promptVersionId).toBeNull();
  });

  it('with one stored, it runs that text, filled, and records its id', async () => {
    const content = `${theRoomJudgementTemplate()}\n\nA NEW RULE FOR THIS VERSION.`;
    const { run, seen } = judgeWith({ id: 'pv-judgement-2', content });
    const out = await run();
    expect(seen[0]).toContain('A NEW RULE FOR THIS VERSION.');
    expect(seen[0]).toContain('THE PERSON RUNNING THIS IS Wairimu Kamau');
    expect(seen[0]).not.toMatch(/\{\{/);
    expect(out.judgement.promptVersionId).toBe('pv-judgement-2');
  });
});
