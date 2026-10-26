import { whereSetupEnds, whatToSayAboutTheEndOfSetup, THE_BOARD_IS_COVERED, THEY_ADDED_SOMETHING_IN_SETUP, SETUP_IS_DONE } from './setup-is-the-first-check-in';
import { EntryService } from './entry.service';

/**
 * THE LEAD'S SETUP IS THEIR FIRST CHECK-IN (Hafsah, 26 October 2026). Grace sets up a sales team in Kisumu: once the board has what it
 * needs, she is asked for today's picture if she has not given it, then "Anything else I should know?", and her "no" ends setup with one
 * line saying what was set up and what happens next. No second conversation follows.
 */
describe('where setup ends', () => {
  it('not before "Anything else I should know?"', () => {
    expect(whereSetupEnds(['Who is on the team?'], 'Otieno and Akinyi')).toEqual({ asked: false, close: false });
  });
  it('a "no" to it ends setup', () => {
    expect(whereSetupEnds(['Anything else I should know?', 'Where do things stand today?'], 'No, that is all')).toEqual({ asked: true, close: true });
  });
  it('once the board is covered, "No, that\'s all" ends it even if the last question was not asked in so many words', () => {
    expect(whereSetupEnds(['How often should this run?'], "No, that's all.", true)).toEqual({ asked: false, close: true });
    expect(whereSetupEnds(['How often should this run?'], "No, that's all.", false).close).toBe(false);
  });
  it('something new gets at most two follow-ups', () => {
    expect(whereSetupEnds(['Anything else I should know?'], 'Wekesa starts leave on Monday').close).toBe(false);
    expect(whereSetupEnds(['When is he back?', 'Anything else I should know?'], 'On the 9th').close).toBe(false);
    expect(whereSetupEnds(['Who covers his shops?', 'When is he back?', 'Anything else I should know?'], 'Akinyi').close).toBe(true);
  });
  it('the model is told the board is covered, then about what they added, and nothing on the closing turn', () => {
    expect(whatToSayAboutTheEndOfSetup(false, { asked: false, close: false })).toBeNull();
    expect(whatToSayAboutTheEndOfSetup(true, { asked: false, close: false })).toBe(THE_BOARD_IS_COVERED);
    expect(whatToSayAboutTheEndOfSetup(true, { asked: true, close: false })).toBe(THEY_ADDED_SOMETHING_IN_SETUP);
    expect(whatToSayAboutTheEndOfSetup(true, { asked: true, close: true })).toBeNull();
  });
});

describe('the setup conversation itself', () => {
  const world = (reply: string) => {
    const anthropic: any = { extract: jest.fn(async () => ({ mode: 'something_new', initial: 'Solar lamp sales in Kisumu', decision: 'sell 200 lamps', peopleNamed: ['Otieno'] })) };
    const prisma: any = { user: { findUnique: jest.fn(async () => null) }, ground: { findMany: jest.fn(async () => []) }, groundParticipant: { findMany: jest.fn(async () => []) } };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { active: jest.fn(async () => null) } as any);
    const asked = jest.fn(async () => reply);
    (service as any).guardedReply = asked;
    (service as any).classifyIntent = jest.fn(async () => null);
    (service as any).whatThisLeadAlreadyHas = jest.fn(async () => null);
    return { service, asked };
  };
  const soFar = { mode: 'something_new', initial: 'Solar lamp sales in Kisumu', decision: 'sell 200 lamps' };

  it('once the board is covered, it is not ready yet: today\'s picture and "Anything else" come first', async () => {
    const { service, asked } = world('Where do things stand today, and what is open?');
    const said = [
      { role: 'user', content: 'A daily check-in for my sales team in Kisumu, 200 lamps by 30 November.' },
      { role: 'assistant', content: 'Who is on the team?' },
      { role: 'user', content: 'Otieno, Akinyi and Wekesa.' },
    ];
    const out: any = await service.onboard(said as any, undefined, undefined, undefined, soFar as any);
    expect(out.ready).toBe(false);
    expect((asked.mock.calls[0] as any[])[0]).toContain(THE_BOARD_IS_COVERED);
  });

  it('a "no" to "Anything else I should know?" ends it with the product\'s own last line, and no model reply', async () => {
    const { service, asked } = world('This should not be used.');
    const said = [
      { role: 'user', content: 'A daily check-in for my sales team in Kisumu, 200 lamps by 30 November.' },
      { role: 'assistant', content: 'Anything else I should know?' },
      { role: 'user', content: 'No, that is all.' },
    ];
    const out: any = await service.onboard(said as any, undefined, undefined, undefined, soFar as any);
    expect(out.ready).toBe(true);
    expect(out.reply).toBe(SETUP_IS_DONE);
    expect(asked).not.toHaveBeenCalled();
  });
});
