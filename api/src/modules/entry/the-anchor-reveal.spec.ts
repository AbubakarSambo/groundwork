import { EntryService } from './entry.service';
import { theLeadsReveal, herAnswerToTheHopeQuestion, whatSheSaidOneAtATime, NOT_WRITTEN_DOWN } from './the-anchor-reveal';
import { THE_HOPE_QUESTION } from '../conversation/the-anchor-lead-conversation';
import { THE_SHAPES_KEYS, HOW_I_WILL_WORK_WITH_YOUR_TEAM } from './the-anchor-served-shapes';

/**
 * Request 149: the lead's reveal is served on the entry report, only for the anchor conversation and only
 * while the switch is on, built from her own turns with no model call for the reveal itself.
 */
const HERS = [
  { role: 'assistant' as const, content: 'What are you carrying right now?' },
  { role: 'user' as const, content: 'Everyone delivers their own piece and nobody sees what it takes to keep us going.' },
  { role: 'assistant' as const, content: THE_HOPE_QUESTION },
  { role: 'user' as const, content: 'People would bring ideas without being asked. They would follow up clients.\n- Raise problems earlier' },
];

const REPORT = {
  whatGroundworkSaw: 'x', alignmentStatus: 'Mixed', alignmentBasis: 'y', areasRequiringAlignment: [], alignmentReached: [],
  honestClose: { aligned: 'a', open: 'b', revisit: 'c', risk: 'd' },
  mentionedPeople: [{ name: 'Amani Wekesa', context: 'in the team' }, { name: 'Juma Otieno', context: 'in the team' }],
  suggestedParties: [],
};

function makeService(switchOn: boolean) {
  const anthropic: any = { extract: jest.fn(async () => JSON.parse(JSON.stringify(REPORT))) };
  const prisma: any = { platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : null)) } };
  return new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
}

describe('the lead reads her reveal on the entry report', () => {
  it('serves it for the anchor conversation with the switch on, in her words', async () => {
    const out: any = await makeService(true).report(HERS as any, 'HELP_TEAM_UNDERSTAND', 'Help my team understand');
    const r = out.leadsReveal;
    expect(Object.keys(r).sort()).toEqual([...THE_SHAPES_KEYS.reveal].sort());
    expect(r.title).toBe('Help my team understand');
    expect(r.subtitle).toBe('One-month Groundwork');
    expect(r.whoYouAreTryingToMove).toBe('You are trying to move Amani Wekesa and Juma Otieno with you.');
    expect(r.whatMeaningfulChangeWouldLookLike).toEqual([
      'People would bring ideas without being asked.',
      'They would follow up clients.',
      'Raise problems earlier',
    ]);
    expect(r.carrying).toBe('Groundwork has not yet written down what you are carrying.');
    expect(r.seeingToday).toBe('Groundwork has not yet written down what you are seeing today.');
    expect(r.whatTheTeamNeedsToUnderstand).toBe('Groundwork has not yet written down what you need the team to understand.');
    expect(r.sharedWithTheTeam).toBe(false);
    expect(r.howIWillWorkWithYourTeam).toEqual(HOW_I_WILL_WORK_WITH_YOUR_TEAM);
  });

  it('serves nothing, not even the key, with the switch off', async () => {
    const out: any = await makeService(false).report(HERS as any, 'HELP_TEAM_UNDERSTAND', 'Help my team understand');
    expect('leadsReveal' in out).toBe(false);
  });

  it('serves nothing for any other situation, switch on', async () => {
    const out: any = await makeService(true).report(HERS as any, 'NEW_PROJECT', 'A project');
    expect('leadsReveal' in out).toBe(false);
  });
});

describe('what the reveal holds for each reader', () => {
  const input = { messages: HERS, peopleNamed: ['Amani Wekesa'] };
  it('keeps what she is carrying and what she is seeing to the lead alone', () => {
    for (const reader of ['team', 'lead'] as const) {
      const r = theLeadsReveal({ ...input, reader });
      expect(r.carrying === null).toBe(reader === 'team');
      expect(r.seeingToday === null).toBe(reader === 'team');
    }
  });
  it('tells a participant or an admin who reads it as the team nothing of what she has not shared', () => {
    const r = theLeadsReveal({ ...input, reader: 'team' });
    expect(r.whatTheTeamNeedsToUnderstand).toBeNull();
    expect(JSON.stringify(r)).not.toContain('has not yet written down');
  });
  it('says plainly where she has not yet answered', () => {
    const r = theLeadsReveal({ messages: [{ role: 'user', content: 'hello' }] });
    expect(r.whoYouAreTryingToMove).toBe('Groundwork has not yet heard who you are trying to move with you.');
    expect(r.whatMeaningfulChangeWouldLookLike).toEqual([NOT_WRITTEN_DOWN.change]);
  });
});

describe('reading her answer', () => {
  it('finds the answer after the hope question and nowhere else', () => {
    expect(herAnswerToTheHopeQuestion(HERS as any)).toMatch(/^People would bring ideas/);
    expect(herAnswerToTheHopeQuestion([{ role: 'user', content: 'hi' }])).toBeNull();
  });
  it('splits on sentences, lines and bullets without changing her words', () => {
    expect(whatSheSaidOneAtATime('One thing. Two things; three things\n* four')).toEqual(['One thing.', 'Two things', 'three things', 'four']);
  });
  it('says more than six people as six and a count', () => {
    const r = theLeadsReveal({ messages: [], peopleNamed: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] });
    expect(r.whoYouAreTryingToMove).toBe('You are trying to move A, B, C, D, E, F and 2 other people with you.');
  });
});
