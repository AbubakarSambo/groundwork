import { theWorkTheyMentioned } from './the-assessment';
import { anAssessmentHolding } from './an-assessment-for-a-spec';
import { ConversationService } from './conversation.service';

/**
 * WHAT SOMEBODY SAID ABOUT A COLLEAGUE'S WORK IS READ FROM THEIR ASSESSMENT (2 November 2026). A separate model read of the
 * transcript (WORK_MENTION_PROMPT) found who they credited, whose work they covered, and who they wait on. The assessment already
 * reads the people they spoke of and what they wait on, so those are the work mentions now, with no read of their own.
 */
const withPeople = (people: any[], blockers: any[] = []) => {
  const a = anAssessmentHolding({ blockers });
  a.people = people.map((p, i) => ({ id: `r1.people.${i}`, from: [1], whoMaySee: 'the people in this check-in' as any, saidWordForWord: true, ...p }));
  return a;
};

describe('the work they mentioned', () => {
  it('a colleague credited, one covered for and one waited on are the three kinds', () => {
    const a = withPeople(
      [
        { name: 'Wanjiru', kind: 'person', theirWork: 'credited', words: 'Wanjiru got the Kilele invoice signed off on Monday.' },
        { name: 'Brian', kind: 'person', theirWork: 'covered for', words: 'I did Brian\'s depot run on Tuesday.' },
        { name: 'Dana', kind: 'person', theirWork: 'none', words: 'I spoke to Dana.' },
        { name: 'Kilele', kind: 'organisation', theirWork: 'credited', words: 'Kilele paid.' },
      ],
      [{ what: 'the stock count', onName: 'Njeri', status: 'WAITING' }],
    );
    expect(theWorkTheyMentioned(a)).toEqual([
      { personName: 'Wanjiru', kind: 'CREDIT', text: 'Wanjiru got the Kilele invoice signed off on Monday.' },
      { personName: 'Brian', kind: 'COVERAGE', text: 'I did Brian\'s depot run on Tuesday.' },
      { personName: 'Njeri', kind: 'BLOCKED_BY', text: 'the stock count' },
    ]);
  });

  it('is written against the colleague it names, and a name that matches nobody is dropped, with no model call', async () => {
    const written: any[] = [];
    const svc = Object.create(ConversationService.prototype) as any;
    svc.prisma = {
      ground: { findUnique: async () => ({ mode: 'SHARED', scenario: 'PULSE_CHECK', participants: [
        { id: 'p-me', email: 'me@x.test', user: { firstName: 'Amani', lastName: 'W' } },
        { id: 'p-wanjiru', email: 'w@x.test', user: { firstName: 'Wanjiru', lastName: 'K' } },
      ] }) },
      workMention: { createMany: async (a: any) => { written.push(...a.data); return { count: a.data.length }; } },
    };
    svc.anthropic = { extract: jest.fn() };
    await svc.extractWorkMentions('c-1', 'p-me', 'g-1', 2, withPeople([
      { name: 'Wanjiru', kind: 'person', theirWork: 'credited', words: 'Wanjiru got the Kilele invoice signed off on Monday.' },
      { name: 'Otieno', kind: 'person', theirWork: 'credited', words: 'Otieno helped.' },
    ]));
    expect(svc.anthropic.extract).not.toHaveBeenCalled();
    expect(written).toEqual([expect.objectContaining({ aboutParticipantId: 'p-wanjiru', sourceParticipantId: 'p-me', kind: 'CREDIT', text: 'Wanjiru got the Kilele invoice signed off on Monday.' })]);
  });
});
