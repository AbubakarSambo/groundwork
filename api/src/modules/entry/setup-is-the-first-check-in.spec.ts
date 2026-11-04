import * as setupModule from './setup-is-the-first-check-in';
import { SETUP_IS_DONE } from './setup-is-the-first-check-in';
import { HOW_SETUP_ENDS } from '../conversation/a-short-day';
import { EntryService } from './entry.service';

/**
 * THE LEAD'S SETUP IS THEIR FIRST CHECK-IN (Hafsah, 26 October 2026). Grace sets up a sales team in Kisumu.
 *
 * Changed 3 November 2026 (Hafsah: no question limits and no forced close). Setup no longer asks a scripted "Anything else I should
 * know?", counts two follow-ups, or ends on the product's own goodbye. The model offers to wrap up in its own words, reads back what it
 * set up, and finishes with [[SESSION_COMPLETE]] (HOW_SETUP_ENDS); setup is ready when it does.
 */
describe('how setup ends', () => {
  it('the scripted end is gone', () => {
    for (const gone of ['whereSetupEnds', 'whatToSayAboutTheEndOfSetup', 'THE_BOARD_IS_COVERED', 'THEY_ADDED_SOMETHING_IN_SETUP']) {
      expect(Object.keys(setupModule)).not.toContain(gone);
    }
  });
  /* Changed in F5 (the approved journey, stage 5): nothing is saved yet, so the last line no longer says the board is ready or points below. */
  it('the last line says only what is true before anything is sent', () => {
    expect(SETUP_IS_DONE).toBe('That’s everything I need to start. Send the invitations when you are ready.');
    expect(SETUP_IS_DONE).not.toMatch(/Done:|board is ready|below/);
  });
});

describe('the setup conversation itself', () => {
  const world = (reply: string, closed = false) => {
    const anthropic: any = { extract: jest.fn(async () => ({ mode: 'something_new', initial: 'Solar lamp sales in Kisumu', decision: 'sell 200 lamps', peopleNamed: ['Otieno'] })) };
    const prisma: any = { user: { findUnique: jest.fn(async () => null) }, ground: { findMany: jest.fn(async () => []) }, groundParticipant: { findMany: jest.fn(async () => []) } };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { active: jest.fn(async () => null) } as any);
    const asked = jest.fn(async () => ({ reply, closed }));
    (service as any).guardedReplyWithClose = asked;
    (service as any).classifyIntent = jest.fn(async () => null);
    (service as any).whatThisLeadAlreadyHas = jest.fn(async () => null);
    return { service, asked };
  };
  const soFar = { mode: 'something_new', initial: 'Solar lamp sales in Kisumu', decision: 'sell 200 lamps' };
  const said = [
    { role: 'user', content: 'A daily check-in for my sales team in Kisumu, 200 lamps by 30 November.' },
    { role: 'assistant', content: 'Who is on the team?' },
    { role: 'user', content: 'Otieno, Akinyi and Wekesa.' },
  ];

  it('the model is told how setup ends, last of all, and no "Anything else I should know?" is put to it', async () => {
    const { service, asked } = world('Where do things stand today, and what is open?');
    const out: any = await service.onboard(said as any, undefined, undefined, undefined, soFar as any);
    expect(out.ready).toBe(false);
    const prompt = String((asked.mock.calls[0] as any[])[0]);
    expect(prompt.trim().endsWith(HOW_SETUP_ENDS)).toBe(true);
    expect(prompt).not.toContain('Anything else I should know?');
  });

  it('while the model keeps asking, setup carries on, whatever the count', async () => {
    const { service } = world('When does Wekesa come back from leave?');
    const long = [...said, ...Array.from({ length: 6 }, (_, i) => [
      { role: 'assistant', content: `Question ${i + 1}?` },
      { role: 'user', content: `Answer number ${i + 1} about the shops in Kisumu.` },
    ]).flat()];
    const out: any = await service.onboard(long as any, undefined, undefined, undefined, soFar as any);
    expect(out.ready).toBe(false);
  });

  it('when the model finishes, setup is ready and ends on the board line', async () => {
    const { service } = world('That is everything set up. Thank you, Grace.', true);
    const out: any = await service.onboard(said as any, undefined, undefined, undefined, soFar as any);
    expect(out.ready).toBe(true);
    expect(out.reply.trim().endsWith(SETUP_IS_DONE)).toBe(true);
  });
});
