import { ConversationService } from './conversation.service';

/**
 * ONE ANSWER, ONE REPLY (request 48). The closing reply was read twice. The same answer arriving a
 * second time while the first was still being answered passed the second-press check (the person's
 * turn is saved only after the prompt is built) and wrote a second reply. Now the second waits for
 * the first and gets the same reply, and the work runs once.
 */
function aService() {
  const s = Object.create(ConversationService.prototype) as any;
  s.logger = { log: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  s.aSessionUnderway = jest.fn(async () => ({ id: 'c1' }));
  /* The work itself: held until released, then stopped, so each test counts how often it ran. */
  s.theSameAnswerAgain = jest.fn(async () => { await gate; throw Object.assign(new Error('stop here'), { reached: true }); });
  return { s, release };
}

describe('the same answer, arriving twice while it is answered', () => {
  it('is answered once, and both presses get the same outcome', async () => {
    const { s, release } = aService();
    const first = s.sendMessage('c1', 'u1', 'Please finish my check-in').catch((e: any) => e);
    const second = s.sendMessage('c1', 'u1', 'Please finish my check-in ').catch((e: any) => e);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(s.theSameAnswerAgain).toHaveBeenCalledTimes(1);
  });

  it('a different answer, or somebody else, is its own answer', async () => {
    const { s, release } = aService();
    const ps = [
      s.sendMessage('c1', 'u1', 'One thing').catch(() => null),
      s.sendMessage('c1', 'u1', 'Another thing').catch(() => null),
      s.sendMessage('c1', 'u2', 'One thing').catch(() => null),
    ];
    release();
    await Promise.all(ps);
    expect(s.theSameAnswerAgain).toHaveBeenCalledTimes(3);
  });

  it('and once it is answered, a later press is read by the second-press check as before', async () => {
    const { s, release } = aService();
    release();
    await s.sendMessage('c1', 'u1', 'Same').catch(() => null);
    await s.sendMessage('c1', 'u1', 'Same').catch(() => null);
    expect(s.theSameAnswerAgain).toHaveBeenCalledTimes(2);
  });
});

describe('a second press after the closing reply (request 47)', () => {
  function pressedAgain(reply: string) {
    const s = Object.create(ConversationService.prototype) as any;
    s.logger = { log: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    s.aSessionUnderway = jest.fn(async () => ({ id: 'c1' }));
    const now = Date.now();
    s.prisma = { conversationTurn: { findMany: jest.fn(async () => [
      { role: 'PERSON', content: 'Please finish my check-in', createdAt: new Date(now - 5_000) },
      { role: 'AI', content: reply, createdAt: new Date(now - 2_000) },
    ]) } };
    return s.sendMessage('c1', 'u1', 'Please finish my check-in');
  }

  it('gets the closing reply back with the flag that says it closed', async () => {
    const r = await pressedAgain('Thank you, Rukia. Your report is ready now. Speak soon.');
    expect(r).toEqual({ reply: 'Thank you, Rukia. Your report is ready now. Speak soon.', sessionComplete: true });
  });

  it('and a reply that asked something back, with the flag that says it did not', async () => {
    const r = await pressedAgain('Before you go, what date is the Kano delivery due?');
    expect(r.sessionComplete).toBe(false);
  });
});
