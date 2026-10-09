import { GoneException } from '@nestjs/common';
import { GroundsController } from './grounds.controller';
import { GroundsService } from './grounds.service';

/**
 * PIECE 7: THE OLD CONTEXT CHAT SWITCHES OFF ON THE SERVER, WITH ONE SENTENCE THAT POINTS TO ASK.
 *
 * `release.oldContextChat` is OFF when its row is missing, or cannot be read (finished on wip/next: Ask takes a document, a fact and what the check-in already has). Written `{ "on": true }`, it is kept. Off, the three
 * routes of the old chat (the conversation, the confirm and the decline) answer 410 with a sentence naming Ask for the person's organisation, before anything is
 * read or written. Ask's own setup lane calls the same two methods inside the engine and is never stopped by this.
 */
const settings = (rows: Record<string, unknown>, orgName = 'Baridi') => ({
  platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key in rows ? { value: rows[where.key] } : null)) },
  organization: { findUnique: jest.fn(async () => ({ name: orgName })) },
});
const service = (prisma: unknown) => Object.assign(Object.create(GroundsService.prototype), { prisma }) as GroundsService;

describe('the gate', () => {
  it('sends people to Ask with no row, and when the row cannot be read, and lets the old chat through only when the row says on', async () => {
    const broken = { platformSetting: { findUnique: async () => { throw new Error('down'); } }, organization: { findUnique: async () => ({ name: 'Baridi' }) } };
    await expect(service(settings({})).theOldContextChatMustBeOpen('org')).rejects.toBeInstanceOf(GoneException);
    await expect(service(broken).theOldContextChatMustBeOpen('org')).rejects.toBeInstanceOf(GoneException);
    await expect(service(settings({ 'release.oldContextChat': { on: true } })).theOldContextChatMustBeOpen('org')).resolves.toBeUndefined();
  });
  it('says the plain sentence when the row says off, and when there is no row', async () => {
    await expect(service(settings({ 'release.oldContextChat': { on: false } })).theOldContextChatMustBeOpen('org')).rejects.toBeInstanceOf(GoneException);
    await expect(service(settings({})).theOldContextChatMustBeOpen('org')).rejects.toBeInstanceOf(GoneException);
  });
  it('says one plain sentence, naming Ask for the organisation, when it is off', async () => {
    const off = service(settings({}));
    const err: any = await off.theOldContextChatMustBeOpen('org').catch((e) => e);
    expect(err).toBeInstanceOf(GoneException);
    expect(err.message).toBe("Setting up a check-in now happens in Ask Baridi, so open Ask Baridi from this check-in's Context and resources page and say what you want to add.");
  });
  it('says Ask Groundwork where the organisation has no name', async () => {
    const off = service(settings({}, ''));
    const err: any = await off.theOldContextChatMustBeOpen('org').catch((e) => e);
    expect(err.message).toContain('Ask Groundwork');
  });
});

describe('the three routes', () => {
  function controller(open: boolean) {
    const calls: string[] = [];
    const grounds: any = {
      theOldContextChatMustBeOpen: async () => { calls.push('gate'); if (!open) throw new GoneException('Ask it is.'); },
      contextChat: async () => { calls.push('chat'); return { reply: 'ok' }; },
      applyContextProposal: async () => { calls.push('confirm'); return { applied: true }; },
      declineContextOffer: async () => { calls.push('decline'); return { declined: true }; },
    };
    const c = new (GroundsController as any)(grounds) as GroundsController;
    return { c, calls };
  }
  it('while it is open, each asks the gate and then does what it did', async () => {
    const { c, calls } = controller(true);
    await c.contextChat('g1', 'u1', 'org', { history: [] } as any);
    await c.confirmContextProposal('g1', 'u1', 'org', { said: 'yes' });
    await c.declineContextProposal('g1', 'u1', 'org', { offerId: 'o1' });
    expect(calls).toEqual(['gate', 'chat', 'gate', 'confirm', 'gate', 'decline']);
  });
  it('while it is off, none reaches the conversation, the confirm or the decline', async () => {
    const { c, calls } = controller(false);
    await expect(c.contextChat('g1', 'u1', 'org', { history: [] } as any)).rejects.toBeInstanceOf(GoneException);
    await expect(c.confirmContextProposal('g1', 'u1', 'org', { said: 'yes' })).rejects.toBeInstanceOf(GoneException);
    await expect(c.declineContextProposal('g1', 'u1', 'org', { offerId: 'o1' })).rejects.toBeInstanceOf(GoneException);
    expect(calls).toEqual(['gate', 'gate', 'gate']);
  });
});
