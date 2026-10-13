import { readFileSync } from 'fs';
import { join } from 'path';
import { TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * THE END CARD IS WAITED FOR (task 2.7, sent back by the reviewer). The card arrives 10 to 47 seconds
 * after the goodbye. The screen read it only when the transcript loaded, so nobody saw it; and
 * finishing before it was ready read the record again, so the card was not what was written. Now
 * finishing waits for it and returns it, and the screen has a read it can wait on.
 */

const CARD = { inYourRecord: [{ says: "I'll visit Westgate Deli on Friday.", how: 'You said you will do this. I will ask you how it went.', mark: 'said' }] };
const ROWS = [{ participantId: 'p1', checkInId: 'ci1', type: 'COMMITMENT', text: "I'll visit Westgate Deli on Friday." }];

function aService(prisma: any) {
  const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
  return new ConversationService(prisma, {} as any, { extract: jest.fn(async () => null) } as any, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any;
}

describe('the screen waits for the card', () => {
  it('gets the card once it is built, not the empty transcript from before it', async () => {
    let stored: any = null;
    const prisma: any = {
      conversationTurn: {
        update: jest.fn(async ({ data }: any) => { stored = data.endCard; return {}; }),
        findMany: jest.fn(async () => [{ role: TurnRole.PERSON }, { role: TurnRole.AI, endCard: stored }]),
      },
    };
    const service = aService(prisma);
    service.loadOwnedCheckIn = jest.fn(async () => ({ id: 'ci1', participantId: 'p1', groundId: 'g1' }));
    let finish!: () => void;
    service.theEndCardFor = jest.fn(() => new Promise((resolve) => { finish = () => { stored = CARD; resolve(CARD); }; }));
    service.startTheEndCard({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9');
    const asked = service.theEndCardWhenReady('ci1', 'u1');
    setTimeout(() => finish(), 20);
    expect(await asked).toEqual({ endCard: CARD });
  });

  it('is only for the person whose check-in it is', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const body = src.slice(src.indexOf('  async theEndCardWhenReady('));
    expect(body.slice(0, 400)).toContain('await this.loadOwnedCheckIn(checkInId, requestingUserId)');
    const ctl = readFileSync(join(__dirname, 'conversation.controller.ts'), 'utf8');
    expect(ctl).toContain("@Get(':id/end-card')");
    expect(ctl).toContain('this.conversation.theEndCardWhenReady(id, userId)');
  });
});

describe('finishing waits for the card, writes its lines, and returns it', () => {
  it('writes exactly the lines on the card that was still being built', async () => {
    let turn: any = { id: 'turn-9', createdAt: new Date(), recordDraft: null, endCard: null };
    const prisma: any = {
      conversationTurn: { findFirst: jest.fn(async () => turn), count: jest.fn(async () => 0) },
      recordEntry: { createMany: jest.fn(async () => ({})) },
    };
    const service = aService(prisma);
    service.extractRecordEntries = jest.fn();
    service.theEndCardFor = jest.fn(() => new Promise((resolve) => setTimeout(() => { turn = { ...turn, recordDraft: ROWS, endCard: CARD }; resolve(CARD); }, 20)));
    service.startTheEndCard({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9');
    await service.waitForTheCardBeingBuilt('ci1');
    const card = await service.writeTheRecordAtTheEnd({ id: 'ci1', participantId: 'p1' });
    expect(card).toEqual(CARD);
    expect(prisma.recordEntry.createMany).toHaveBeenCalledWith({ data: [{ ...ROWS[0], checkInId: 'ci1', participantId: 'p1', createdAt: expect.any(Date) }] });
    expect(service.extractRecordEntries).not.toHaveBeenCalled();
  });

  it('finishing a session waits, and the answer carries the card', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const body = src.slice(src.indexOf('  private async finishTheSession('), src.indexOf('  async ensureNextSession('));
    expect(body).toContain('if (how.waitForTheCard) await this.waitForTheCardBeingBuilt(checkIn.id);');
    expect(body.indexOf('waitForTheCardBeingBuilt')).toBeLessThan(body.indexOf('writeTheRecordAtTheEnd'));
    expect(body).toMatch(/return \{ status: 'completed', groundId: checkIn\.groundId, \.\.\.\(endCard \? \{ endCard \} : \{\}\), /);
  });

  it('a card that fails is not waited for', async () => {
    const service = aService({});
    jest.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    service.theEndCardFor = jest.fn(() => Promise.reject(new Error('model down')));
    service.startTheEndCard({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9');
    const at = Date.now();
    await service.waitForTheCardBeingBuilt('ci1');
    expect(Date.now() - at).toBeLessThan(1000);
  });
});

describe('"Finish my check-in now" before the conversation closed (journey 3, round 4)', () => {
  /* Pia at session 1: she answered, Groundwork asked "What else should I know?", and she pressed the
     button to finish. No card had been built, so she read "I could not show you what I wrote down just now". */
  it('builds the card from her answers then, on the last thing Groundwork said, and shows it', async () => {
    let stored: any = null;
    const prisma: any = {
      conversationTurn: {
        update: jest.fn(async ({ data }: any) => { stored = data.endCard; return {}; }),
        findMany: jest.fn(async () => [
          { id: 'turn-1', role: TurnRole.AI, endCard: null },
          { id: 'turn-2', role: TurnRole.PERSON, endCard: null },
          { id: 'turn-3', role: TurnRole.AI, endCard: stored },
        ]),
      },
    };
    const service = aService(prisma);
    service.loadOwnedCheckIn = jest.fn(async () => ({ id: 'ci1', participantId: 'p1', groundId: 'g1', status: 'IN_PROGRESS' }));
    service.theEndCardFor = jest.fn(async (_c: any, turnId: string) => { await prisma.conversationTurn.update({ where: { id: turnId }, data: { endCard: CARD, recordDraft: ROWS } }); return CARD; });
    expect(await service.theEndCardWhenReady('ci1', 'u1')).toEqual({ endCard: CARD });
    expect(service.theEndCardFor).toHaveBeenCalledWith(expect.objectContaining({ id: 'ci1' }), 'turn-3');
  });

  it('builds nothing for somebody who has not answered, or a check-in already finished', async () => {
    for (const [status, turns] of [
      ['IN_PROGRESS', [{ id: 't1', role: TurnRole.AI, endCard: null }]],
      ['COMPLETED', [{ id: 't1', role: TurnRole.AI, endCard: null }, { id: 't2', role: TurnRole.PERSON, endCard: null }, { id: 't3', role: TurnRole.AI, endCard: null }]],
    ] as const) {
      const prisma: any = { conversationTurn: { findMany: jest.fn(async () => turns) } };
      const service = aService(prisma);
      service.loadOwnedCheckIn = jest.fn(async () => ({ id: 'ci1', participantId: 'p1', groundId: 'g1', status }));
      service.theEndCardFor = jest.fn();
      expect(await service.theEndCardWhenReady('ci1', 'u1')).toEqual({ endCard: null });
      expect(service.theEndCardFor).not.toHaveBeenCalled();
    }
  });
});
