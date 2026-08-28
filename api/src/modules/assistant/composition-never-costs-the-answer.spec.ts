import { AssistantService } from './assistant.service';

/**
 * AN OUTAGE MUST NOT COST SOMEBODY THEIR ANSWER.
 *
 * Composition is the last thing that happens and the least important. The lane has already worked
 * out what is true; this only decides how it sounds. So every way of failing - the model off,
 * unreachable, slow, or returning something that fails the checks - ends with the person reading
 * the same true sentence they would have read anyway.
 *
 * The `composedBy` stamp is what makes that honest rather than hidden: a sentence a model wrote and
 * a sentence the rules wrote carry different weight, and somebody should be able to tell.
 */
function svc(engineBehaviour: () => Promise<string>) {
  const prisma: any = {
    subject: { findMany: jest.fn(async () => [{ sourceSystem: 'their-tool', syncedAt: new Date(), sourceDeletedAt: null }]), count: jest.fn(async () => 1) },
    person: { count: jest.fn(async () => 2), findFirst: jest.fn(async () => ({ externalId: 'u-1' })), findMany: jest.fn(async () => []) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    /* The turn is remembered and a parked proposal is looked for, both now part of every reply. */
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async (a: any) => ({ id: 'pr1', ...a.data })), update: jest.fn(async () => ({})) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
  };
  const engine: any = { respond: jest.fn(engineBehaviour) };
  return { service: new AssistantService(prisma, engine), engine };
}

const ask = (s: AssistantService) => s.respond('org-a', 'p1', 'what can you see?');

describe('composition never costs the answer', () => {
  it('uses the model when it behaves, and says so', async () => {
    const { service } = svc(async () => '1 objective and 2 people, from their-tool.');
    const r = await ask(service);
    expect(r.composedBy).toBe('model');
    expect(r.styleVersion).toBe('v2');
    expect((r.blocks[0] as any).body).toBe('1 objective and 2 people, from their-tool.');
  });

  it('ships the draft when the model is unreachable', async () => {
    const { service } = svc(async () => { throw new Error('provider is down'); });
    const r = await ask(service);
    expect(r.composedBy).toBe('rules');
    expect((r.blocks[0] as any).body).toContain('1 objective');
  });

  it('ships the draft when the model invents a number', async () => {
    /* The one that would otherwise be invisible: it reads perfectly and is about somebody's work. */
    const { service } = svc(async () => '7 objectives and 2 people.');
    const r = await ask(service);
    expect(r.composedBy).toBe('rules');
    expect((r.blocks[0] as any).body).not.toContain('7 objectives');
  });

  it('ships the draft when the model returns nothing', async () => {
    const { service } = svc(async () => '   ');
    expect((await ask(service)).composedBy).toBe('rules');
  });

  it('never leaves the lane in doubt, whichever way it went', async () => {
    /* Path attribution has to survive composition, or a cost report cannot tell where a call went. */
    const good = await ask(svc(async () => '1 objective, 2 people.').service);
    const bad = await ask(svc(async () => { throw new Error('x'); }).service);
    expect(good.lane).toBe('what_you_can_see');
    expect(bad.lane).toBe('what_you_can_see');
  });

  it('calls the model at most once for a turn', async () => {
    /* The spec allows three across a turn; composition is entitled to one of them and no more. */
    const { service, engine } = svc(async () => '1 objective, 2 people.');
    await ask(service);
    expect(engine.respond).toHaveBeenCalledTimes(1);
  });

  it('does not call it at all for an unplaced input', async () => {
    /*
     * There is nothing to say better - a fixed sentence and some buttons. Rewording it would make
     * the reply a person sees most often vary for no reason, and spend a model call doing it.
     */
    const { service, engine } = svc(async () => 'anything');
    const r = await service.respond('org-a', 'p1', 'can you renegotiate my contract');
    expect(r.composedBy).toBe('rules');
    expect(engine.respond).not.toHaveBeenCalled();
  });
});
