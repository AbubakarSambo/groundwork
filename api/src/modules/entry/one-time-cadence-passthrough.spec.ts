import { EntryService } from './entry.service';
import { Cadence } from '@prisma/client';

/**
 * Item 3: entry.service.ts's commitInner had its OWN separate cadenceMap
 * (distinct from EntryChatPage.tsx's client-side workaround) with the
 * identical latent bug - no ONE_TIME key, so an incoming 'ONE_TIME' string
 * fell through to Cadence.FORTNIGHTLY by omission. Locks that ONE_TIME now
 * passes through correctly on both the self-serve and for-lead paths.
 */

function makeService() {
  const prisma: any = {
    organization: { update: jest.fn(async () => ({})) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = {
    create: jest.fn(async () => ({ id: 'g-self', joinToken: 'jt' })),
    createForLead: jest.fn(async () => ({ id: 'g-lead', joinToken: 'lead-jt' })),
    addParticipant: jest.fn(async () => ({})),
  };
  const conversation: any = {
    extractRecordEntries: jest.fn(async () => undefined),
    buildSoloArtifact: jest.fn(async () => undefined),
  };
  const service = new EntryService(
    {} as any, prisma, grounds, {} as any, {} as any, conversation, {} as any,
  );
  return { service, grounds };
}

describe('entry.service.ts cadenceMap passes ONE_TIME through correctly', () => {
  it('self-serve path: passes Cadence.ONE_TIME, not FORTNIGHTLY', async () => {
    const { service, grounds } = makeService();
    await service.commit('org1', 'user1', {
      groundLabel: 'Solo review', scenario: 'NEW_PROJECT', cadence: 'ONE_TIME',
      history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors: [],
    } as any);
    expect(grounds.create).toHaveBeenCalledTimes(1);
    expect(grounds.create.mock.calls[0][2]).toMatchObject({ cadence: Cadence.ONE_TIME });
  });

  it('for-lead path: passes Cadence.ONE_TIME, not FORTNIGHTLY', async () => {
    const { service, grounds } = makeService();
    await service.commit('org1', 'admin1', {
      groundLabel: 'Q3 review', scenario: 'NEW_PROJECT', cadence: 'ONE_TIME',
      history: [], report: null, brief: 'Context', lead: { email: 'lead@test.com' }, contributors: [],
    } as any);
    expect(grounds.createForLead).toHaveBeenCalledTimes(1);
    expect(grounds.createForLead.mock.calls[0][2]).toMatchObject({ cadence: Cadence.ONE_TIME });
  });
});
