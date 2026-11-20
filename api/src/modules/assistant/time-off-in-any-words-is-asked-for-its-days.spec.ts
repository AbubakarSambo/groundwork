import { askGroundwork, textOf } from './request-92-harness';
import { LEAVE_IS_NOT_ON, LEAVE_TELL_ME_THE_DAYS } from '../suites/leave-said-in-chat';

/**
 * Hafsah's screenshot of 19 November 2026 (cleantex on staging, Leave requests on). Three messages wanting time off, with no days,
 * were refused: "Your organisation has not written anything down about that here", "I cannot answer that one yet" and "There are no
 * documents here that you can open yet". The model reads each with the one description of what Groundwork can do, says it is asking
 * for leave (how_to, or wants), and Ask asks for the days. The days then go to the leave rules, which say them back and send on a yes.
 */
const HER_THREE: [string, 'how_to' | 'wants'][] = [['how do i apply for leave', 'how_to'], ['I want to apply for leave', 'wants'], ['can i get 3 days off?', 'wants']];

function asCleantex(leaveIsOn: boolean) {
  const engine = {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, h: any[]) => {
      if (!/You read one message/.test(prompt)) return null;
      const said = String(h[0].content).split('\n')[0];
      const hit = HER_THREE.find(([m]) => m === said);
      return hit ? { kind: hit[1], guide: 'ask_for_leave' } : { kind: 'other' };
    }),
  };
  const h = askGroundwork({ userId: 'u-1', role: 'MEMBER', engine });
  h.prisma.organizationSuite = { findUnique: jest.fn(async ({ where }: any) => (where.organizationId_suite?.suite === 'leave' ? { isOn: leaveIsOn } : null)), findMany: jest.fn(async () => (leaveIsOn ? [{ suite: 'leave' }] : [])) };
  return h;
}

describe('time off wanted in any words, with no days said', () => {
  it.each(HER_THREE)('"%s" is asked for the days while Leave requests are on, and nothing is sent', async (said) => {
    const h = asCleantex(true);
    const r: any = await h.service.respond('org-a', 'p1', said);
    expect(textOf(r)).toBe(LEAVE_TELL_ME_THE_DAYS);
    expect(textOf(r)).toBe('Tell me the first day and the last day you want off in one sentence, for example "I want leave from next Monday to next Wednesday". I will say it back to you, and send it only when you say yes.');
    expect(h.created.filter((p: any) => /leave/i.test(p.kind ?? ''))).toEqual([]);
  });

  it.each(HER_THREE)('"%s" is told plainly that leave is off, when it is', async (said) => {
    const r: any = await asCleantex(false).service.respond('org-a', 'p1', said);
    expect(textOf(r)).toBe(LEAVE_IS_NOT_ON);
  });
});
