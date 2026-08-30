import { EntryService } from './entry.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * THE ENTRY CHAT IS NOT A WAY ROUND WHO MAY OPEN A CHECK-IN.
 *
 * `POST /entry/commit` is authenticated, so anybody already signed in can walk the entry chat -
 * an admin, a lead, or somebody who only takes part in other people's check-ins. It then created
 * the ground with the role hardcoded to ADMIN, on the argument that the entry flow's creator is
 * the admin of the organisation just made for them. True for a brand new sign-up. False for
 * everybody else who reaches it.
 *
 * So a member refused at the create page could open the entry chat, click "Save this", and get a
 * check-in that skipped both the permission and the approval. Found by asking what happens when
 * somebody who already has an account uses the entry chat.
 */
const svc = (role: string) => {
  const created: any[] = [];
  const s = Object.create(EntryService.prototype) as any;
  s.logger = { log: () => {}, warn: () => {}, error: () => {} };
  s.prisma = {
    user: { findUnique: async () => ({ role }) },
    organization: {
      findUnique: async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true }),
      update: async () => ({}),
    },
    /* The draft-recovery reads this path makes before it gets to the question. */
    entryDraft: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async () => null,
      findUnique: async () => null,
    },
    ground: { findUnique: async () => null },
  };
  s.grounds = {
    create: async (_o: string, _i: string, _dto: any, role2: string) => {
      created.push(role2);
      throw new Error('stop here - the role is what this spec is about');
    },
    createForLead: async () => { created.push('for-lead'); throw new Error('stop here'); },
  };
  return { s, created };
};

const dto = { groundLabel: 'A check-in', history: [{ role: 'user', content: 'hello' }], contributors: [] } as any;

describe('somebody signed in who may not open a check-in', () => {
  it('is refused, rather than let through by the other door', async () => {
    const { s, created } = svc('MEMBER');
    await expect(s.commit('org1', 'u1', dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(created).toHaveLength(0);
  });

  it('and is told the same thing the create page tells them', async () => {
    const { s } = svc('MEMBER');
    await expect(s.commit('org1', 'u1', dto)).rejects.toThrow(/named/i);
  });
});

describe('and everybody who may', () => {
  it('passes their real role through, not a hardcoded ADMIN', async () => {
    /* A lead's check-in must still wait for approval. Hardcoding ADMIN skipped that too. */
    const { s, created } = svc('LEAD');
    await expect(s.commit('org1', 'u1', dto)).rejects.toThrow(/stop here/);
    expect(created).toEqual(['LEAD']);
  });

  it('including a brand new sign-up, who genuinely is an admin', async () => {
    const { s, created } = svc('ADMIN');
    await expect(s.commit('org1', 'u1', dto)).rejects.toThrow(/stop here/);
    expect(created).toEqual(['ADMIN']);
  });
});
