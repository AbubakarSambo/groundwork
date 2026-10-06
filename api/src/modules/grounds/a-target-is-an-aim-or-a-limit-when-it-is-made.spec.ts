import { aSetupConversation, aPaste } from './request-92-harness';
import { whatWeTookFromThat, theDirectionsInTheList } from './a-dump-is-many-things';
import { proposalFrom } from './what-the-context-chat-heard';
import { proposalsFromAPlan } from './a-plan-is-many-proposals';

/**
 * AN AIM TO REACH, OR A LIMIT NOT TO GO OVER, SAID BACK WHEN A TARGET IS MADE (decision 69).
 *
 * Hafsah, 1 October 2026: the words in the name can suggest it, and the lead confirms it. When the
 * lead has not confirmed, null is stored, not the suggestion, so the guess stays a guess. Each test
 * reads what the lead is shown, and then what the yes writes.
 */

const PEOPLE = [
  { id: 'pR', email: 'rukia@example.test', nameGiven: null, roleAsDescribed: null, managingOnly: false, userId: 'userLead', user: { firstName: 'Rukia', lastName: 'Otieno' } },
];
const PASTE = 'Pumps sold under the new scheme, 40 this quarter. Spending this quarter not to exceed 180,000. '.repeat(8);
const TARGETS = [
  { name: 'Pumps sold under the new scheme', target: 40, notToExceed: false },
  { name: 'Spending this quarter', target: 180000, notToExceed: true },
  { name: 'Get the new depot running', target: null, notToExceed: false },
];

function aLeadsCheckIn() {
  const written: any[] = [];
  const harness = aSetupConversation({
    ground: { participants: PEOPLE, status: 'ACTIVE', endState: null },
    seed: {
      ground: {
        findUnique: async () => ({ id: 'g1', label: 'Pumps, Q4', organizationId: 'org1', initiatorId: 'userLead', scenario: 'OKR_ALIGNMENT', timelineDays: 90, timelineStated: false, cadence: 'WEEKLY', cadenceStated: false, brief: null, status: 'ACTIVE', endState: null, participants: PEOPLE, objectives: [] }),
      },
      groundObjective: { findMany: async () => [], count: async () => 0, createMany: jest.fn(async (a: any) => { written.push(...a.data); return { count: a.data.length }; }) },
      groundParticipant: { findMany: async () => PEOPLE },
    },
    paste: { teamTargets: TARGETS.map((t) => ({ ...t })) },
  });
  jest.spyOn(harness.service as any, 'theTellingAPasteWouldWrite').mockResolvedValue(null);
  return { ...harness, written };
}

describe('a paste in the setup conversation, or in Ask Groundwork', () => {
  it('the list the lead is asked to say yes to says which way each number goes', async () => {
    const { service } = aLeadsCheckIn();
    const chat: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: PASTE }], { yesOrNo: true });
    expect(chat.proposal.say).toContain('\n- Pumps sold under the new scheme: 40, an aim to reach\n');
    expect(chat.proposal.say).toContain('\n- Spending this quarter: 180,000, a limit not to go over\n');
    expect(chat.proposal.say).toContain('\n- Get the new depot running, tracked rather than counted\n');
  });

  it('the yes writes each direction exactly as that list said it', async () => {
    const { service, written } = aLeadsCheckIn();
    const chat: any = await service.contextChat('g1', 'userLead', [{ role: 'user', content: PASTE }], { yesOrNo: true });
    const applied: any = await service.applyContextProposal('g1', 'userLead', {
      said: PASTE,
      history: [{ role: 'user', content: PASTE }, { role: 'assistant', content: chat.proposal.say }],
    });
    expect(applied.changed).toBe('everything');
    expect(written.map((r) => [r.name, r.direction])).toEqual([
      ['Pumps sold under the new scheme', 'AIM'],
      ['Spending this quarter', 'LIMIT'],
      ['Get the new depot running', null],
    ]);
    /* And the receipt says what was recorded, in the same words. */
    expect(applied.say).toContain('- Spending this quarter: 180,000, a limit not to go over');
  });

  it('a yes with no list behind it stores no direction at all, so the board keeps reading the words', async () => {
    const { service, written } = aLeadsCheckIn();
    await service.applyContextProposal('g1', 'userLead', { said: PASTE, history: [{ role: 'user', content: PASTE }] });
    expect(written.map((r) => r.direction)).toEqual([null, null, null]);
  });

  it('reads the directions back off the list, and nothing off any other turn', () => {
    const list = whatWeTookFromThat(aPaste({ teamTargets: TARGETS }), { asking: true })!;
    expect([...theDirectionsInTheList([{ role: 'assistant', content: list }])]).toEqual([
      ['pumps sold under the new scheme', 'AIM'],
      ['spending this quarter', 'LIMIT'],
    ]);
    expect(theDirectionsInTheList([{ role: 'assistant', content: 'Spending this quarter: 180,000, a limit not to go over' }]).size).toBe(0);
  });
});

describe('the measures named in the setup conversation, one at a time', () => {
  it('the say-back states each number as an aim or a limit, so the yes confirms it', () => {
    const p: any = proposalFrom('targets', { targets: [{ name: 'Pumps sold under the new scheme', target: 40 }, { name: 'Spending within budget', target: 180000 }, { name: 'Get the new depot running', target: null }] });
    expect(p.say).toBe('I will set 3 measures for this check-in. "Pumps sold under the new scheme" is an aim of 40 to reach. "Spending within budget" is a limit of 180,000 not to go over. "Get the new depot running" has no number, so it will be followed but not counted. A number can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero. You can change any of them on the board, including what kind of number each one is.');
    expect(p.targets.map((t: any) => t.direction)).toEqual(['AIM', 'LIMIT', null]);
  });
});

describe('a goal from a plan, confirmed one card at a time', () => {
  const PLAN = 'Q4 plan. Forty pumps sold under the new scheme by December. Fuel spending of no more than 12,000 a month.';
  const READ = [
    { kind: 'goal', says: 'The team is to sell 40 pumps under the new scheme by December.', fromThePlan: 'Forty pumps sold under the new scheme by December', what: 'pumps sold under the new scheme', number: 40, date: 'December' },
    { kind: 'goal', says: 'The team is to keep fuel spending to no more than 12,000 a month.', fromThePlan: 'Fuel spending of no more than 12,000 a month', what: 'fuel spending', number: 12000 },
  ];
  it('each card with a number asks the lead which way it goes, and says what the words suggest', () => {
    const [pumps, fuel] = proposalsFromAPlan(PLAN, READ, []);
    expect(pumps.whichWay).toBe('What kind of number is 40? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.');
    expect(pumps.directionSuggested).toBe('AIM');
    expect(fuel.whichWay).toBe('What kind of number is 12,000? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.');
    expect(fuel.directionSuggested).toBe('LIMIT');
  });
});
