import { whatIsAnswered, whatItAsksAgain, withoutAskingAgain } from './setup-never-asks-twice';
import { EntryService } from './entry.service';

/**
 * SETUP NEVER ASKS WHAT WAS ALREADY ANSWERED (Hafsah, 26 October 2026). Grace said "It is a new target for this quarter, and I run the
 * team", and was asked why now and what her part is anyway.
 */
const GRACE = 'A daily check-in for my field sales team in Kisumu. 200 lamps by 30 November. It is a new target for this quarter, and I run the team.';

describe('what is already answered', () => {
  it('is read from her own words when the reading missed it', () => {
    const a = whatIsAnswered({}, GRACE);
    expect(a.whyNow).toMatch(/new target for this quarter/);
    expect(a.theirPart).toMatch(/I run the team/);
  });
  it('nothing is answered when she has not said it', () => {
    expect(whatIsAnswered({}, 'A daily check-in for my sales team.')).toEqual({ whyNow: null, theirPart: null });
  });
});

describe('a reply that asks again', () => {
  const a = whatIsAnswered({}, GRACE);
  it('"What makes this the right time…?" and "What is your part…?" are caught', () => {
    expect(whatItAsksAgain('Thanks. What makes this the right time to set up a check-in on this?', a)).toEqual(['why now']);
    expect(whatItAsksAgain('What is your part in it? Are you running the team?', a)).toEqual(['their own part']);
    expect(whatItAsksAgain('Who is on the team?', a)).toEqual([]);
  });
  it('the last resort takes the question out, and asks for today\'s picture if nothing is left', () => {
    expect(withoutAskingAgain('Thanks. What makes this the right time to set up a check-in?', a)).toBe('Thanks. Where do things stand today, and what is still open?');
    expect(withoutAskingAgain('Got it. Who is on the team? What prompted this now?', a)).toBe('Got it. Who is on the team?');
  });
});

describe('in the setup conversation', () => {
  const world = (replies: string[]) => {
    const anthropic: any = { extract: jest.fn(async () => ({ mode: 'something_new', initial: 'Solar lamp sales in Kisumu' })) };
    const prisma: any = { user: { findUnique: jest.fn(async () => null) } };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { active: jest.fn(async () => null) } as any);
    const asked = jest.fn(async () => replies.shift() ?? '');
    (service as any).guardedReply = asked;
    (service as any).classifyIntent = jest.fn(async () => null);
    (service as any).whatThisLeadAlreadyHas = jest.fn(async () => null);
    return { service, asked };
  };
  const said = [{ role: 'user', content: GRACE }];

  it('a reply asking why now is written again without it', async () => {
    const { service, asked } = world(['What makes this the right time to set up a check-in?', 'Who is on the team in Kisumu?']);
    const out: any = await service.onboard(said as any);
    expect(out.reply).toBe('Who is on the team in Kisumu?');
    expect(asked).toHaveBeenCalledTimes(2);
    expect((asked.mock.calls[1] as any[])[0]).toContain('THEY HAVE ALREADY ANSWERED THIS');
  });
  it('and if it asks again, the question is taken out', async () => {
    const { service } = world(['What is your part in it?', 'Are you running the team yourself?']);
    const out: any = await service.onboard(said as any);
    expect(out.reply).not.toMatch(/your part|running the team/i);
    expect(out.reply).toMatch(/\?$/);
  });
  it('a reply that asks something new is left alone, with no second call', async () => {
    const { service, asked } = world(['Who is on the team in Kisumu?']);
    const out: any = await service.onboard(said as any);
    expect(out.reply).toBe('Who is on the team in Kisumu?');
    expect(asked).toHaveBeenCalledTimes(1);
  });
});

describe('the same question twice', () => {
  const { theQuestionAskedBefore, withoutTheSameQuestion } = require('./setup-never-asks-twice');
  const earlier = ['Thanks. And how many lamps is each person looking to sell by November 30?'];
  it('Grace is not asked for each person\'s number a second time', () => {
    expect(theQuestionAskedBefore('How many lamps are each of them looking to sell by November 30?', earlier)).toBeTruthy();
    expect(theQuestionAskedBefore('Who approves a price below KES 4,800?', earlier)).toBeNull();
  });
  it('the last resort moves on to "Anything else I should know?" once she has said a lot', () => {
    expect(withoutTheSameQuestion('Thanks. How many lamps are each of them looking to sell by November 30?', earlier, true)).toBe('Thanks. Anything else I should know?');
  });
});

describe('the same question in other words (Achieng, 26 October 2026)', () => {
  const { theQuestionAskedBefore } = require('./setup-never-asks-twice');
  it('"How many of the remaining 160 lamps is each person responsible for selling?" after "How many lamps is each person aiming to sell?"', () => {
    expect(theQuestionAskedBefore('How many of the remaining 160 lamps is each person responsible for selling?', ['Got it. How many lamps is each person aiming to sell towards the 200 by November 30th?'])).toBeTruthy();
  });
  it('a different question about the same team is not a repeat', () => {
    expect(theQuestionAskedBefore('Where do things stand today, and what is still open?', ['How many lamps is each person aiming to sell towards the 200?'])).toBeNull();
    expect(theQuestionAskedBefore('Who approves a price below KES 4,800?', ['How many lamps is each person aiming to sell?'])).toBeNull();
  });
});
