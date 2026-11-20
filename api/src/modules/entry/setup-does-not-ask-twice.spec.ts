import { HOW_SETUP_ENDS } from '../conversation/a-short-day';
import { EntryService } from './entry.service';

/**
 * SETUP DOES NOT ASK A QUESTION THE LEAD HAS ALREADY BEEN ASKED (fix plan 16 November, group 8; end-to-end check I-7).
 *
 * In the first-time run the lead said "weekly" and was asked how often three more times. The check-in's own conversation is handed back the
 * questions it already asked (you-asked-that-last-turn); setup was not. This reads the prompt the model is given on the turn after the lead
 * answered, as the model reads it.
 */
describe('what the model is told setup has already asked', () => {
  const world = () => {
    const anthropic: any = { extract: jest.fn(async () => ({ mode: 'something_new', initial: 'A sales team', peopleNamed: [] })) };
    const prisma: any = { user: { findUnique: jest.fn(async () => null) }, ground: { findMany: jest.fn(async () => []) }, groundParticipant: { findMany: jest.fn(async () => []) } };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { active: jest.fn(async () => null) } as any);
    const asked = jest.fn(async () => ({ reply: 'What is the first thing you want to know?', closed: false }));
    (service as any).guardedReplyWithClose = asked;
    (service as any).classifyIntent = jest.fn(async () => null);
    (service as any).whatThisLeadAlreadyHas = jest.fn(async () => null);
    return { service, asked };
  };
  const said = [
    { role: 'user', content: 'I want to see how my five sales reps are doing against 30 units.' },
    { role: 'assistant', content: 'How often should they check in?' },
    { role: 'user', content: 'Weekly.' },
    { role: 'assistant', content: 'What do you want to achieve with these check-ins?' },
    { role: 'user', content: 'I want to know who is stuck.' },
  ];

  it('lists both earlier questions, says not to send them again, and still ends on how setup ends', async () => {
    const { service, asked } = world();
    await service.onboard(said as any, undefined, undefined, undefined, { mode: 'something_new', initial: 'A sales team' } as any);
    const prompt = String((asked.mock.calls[0] as any[])[0]);
    expect(prompt).toContain('WHAT YOU HAVE ALREADY ASKED THIS SESSION');
    expect(prompt).toContain('What do you want to achieve with these check-ins?');
    expect(prompt).toContain('How often should they check in?');
    expect(prompt).toContain('Sending a question again in the words it was already sent in is the one thing you may not do.');
    expect(prompt.trim().endsWith(HOW_SETUP_ENDS)).toBe(true);
  });

  it('says nothing about questions on the first turn, when none has been asked', async () => {
    const { service, asked } = world();
    await service.onboard([said[0]] as any, undefined, undefined, undefined, undefined);
    expect(String((asked.mock.calls[0] as any[])[0])).not.toContain('ALREADY ASKED');
  });
});
