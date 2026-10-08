import { AskService } from './ask.service';

/**
 * REQUEST 169: ASK SAYS, ON THE READ THE SCREENS ALREADY MAKE, WHETHER IT CAN ADD CONTEXT FOR THIS READER (and whether the old chat still answers).
 *
 * `addsContext` is true only while Context is in Ask (a missing row reads on) and the reader may confirm setup on at least one check-in that has not
 * ended: the person who runs it, or an admin of the organisation once the lead has left it. The screens draw "Add context with Ask <organisation name>"
 * from it. Read as each person is served it.
 */
type Row = Record<string, unknown>;
function world(opts: { setting?: unknown; grounds: { id: string; initiatorId: string; leadActive?: boolean; ended?: boolean }[]; roles: Record<string, string> }) {
  const live = opts.grounds.filter((g) => !g.ended);
  const prisma: any = {
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: opts.roles[where.userId_organizationId.userId] })) },
    person: { findFirst: jest.fn(async () => ({ id: 'pp', externalId: 'x' })) },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ isEmailVerified: true, role: opts.roles[where.id], organizationId: 'org' })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi' })) },
    organizationSuite: { findMany: jest.fn(async () => []) },
    assistantTurn: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'release.contextInAskGroundwork' && opts.setting !== undefined ? { value: opts.setting } : null)) },
    ground: {
      findMany: jest.fn(async ({ where }: any) => {
        if (where.initiator) return live.filter((g) => g.leadActive === false).map((g) => ({ id: g.id }));
        return live.filter((g) => g.initiatorId === where.OR?.[0]?.initiatorId).map((g) => ({ id: g.id, label: g.id, initiatorId: g.initiatorId, createdByUserId: null }));
      }),
      findFirst: jest.fn(async ({ where }: any): Promise<Row | null> => (live.find((g) => g.initiatorId === where.initiatorId) ? { id: 'own' } : null)),
    },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  const grounds: any = {
    mayOpenSetupChatFor: jest.fn(async (id: string, userId: string) => {
      const g = live.find((x) => x.id === id);
      return !!g && (g.initiatorId === userId || (g.leadActive === false && opts.roles[userId] === 'ADMIN'));
    }),
  };
  const svc = new AskService(prisma, {} as any, {} as any, grounds);
  const read = async (userId: string) => (await svc.forReader({ userId, email: `${userId}@x.test`, organizationId: 'org', role: opts.roles[userId] } as any, null)) as any;
  return { read, prisma };
}
const roles = { 'u-wanjiru': 'LEAD', 'u-miriam': 'MEMBER', 'u-grace': 'ADMIN', 'u-kofi': 'GUEST' };

describe('who is told Ask can add context for them', () => {
  const q4 = { id: 'g-q4', initiatorId: 'u-wanjiru' };
  it('the lead of a check-in that is running: yes, and the line under the caption is served', async () => {
    const r = await world({ grounds: [q4], roles }).read('u-wanjiru');
    expect(r.addsContext).toBe(true);
    expect(r.addLine).toBe('You can also add context or documents to your check-ins here.');
  });
  it('a person who only takes part: no', async () => {
    expect((await world({ grounds: [q4], roles }).read('u-miriam')).addsContext).toBe(false);
  });
  it('an admin while the lead is still there: no', async () => {
    expect((await world({ grounds: [{ ...q4, leadActive: true }], roles }).read('u-grace')).addsContext).toBe(false);
  });
  it('an admin once the lead has left: yes', async () => {
    expect((await world({ grounds: [{ ...q4, leadActive: false }], roles }).read('u-grace')).addsContext).toBe(true);
  });
  it('a guest, and the lead of a check-in that has ended: no', async () => {
    expect((await world({ grounds: [q4], roles }).read('u-kofi')).addsContext).toBe(false);
    expect((await world({ grounds: [{ ...q4, ended: true }], roles }).read('u-wanjiru')).addsContext).toBe(false);
  });
});

describe('the switch, as the screens read it', () => {
  const q4 = { id: 'g-q4', initiatorId: 'u-wanjiru' };
  it('no row at all reads on', async () => {
    expect((await world({ grounds: [q4], roles }).read('u-wanjiru')).addsContext).toBe(true);
  });
  it('{ on: false } switches it off: no button, no line about adding context, and the welcome does not offer it', async () => {
    const r = await world({ setting: { on: false }, grounds: [q4], roles }).read('u-wanjiru');
    expect(r.addsContext).toBe(false);
    expect(r.addLine).toBeNull();
    expect(JSON.stringify([r.welcome, r.starters])).not.toMatch(/context|document/i);
  });
  it('a row that cannot be read reads off', async () => {
    const r = await world({ setting: 'yes', grounds: [q4], roles }).read('u-wanjiru');
    expect(r.addsContext).toBe(false);
  });
  it('and the read for the old chat says it is off unless its own switch is turned on (8 October)', async () => {
    const w = world({ grounds: [q4], roles });
    expect((await w.read('u-wanjiru')).oldContextChatIsOpen).toBe(false);
    const on = world({ grounds: [q4], roles });
    on.prisma.platformSetting.findUnique = jest.fn(async ({ where }: any) => (where.key === 'release.oldContextChat' ? { value: { on: true } } : null));
    expect((await on.read('u-wanjiru')).oldContextChatIsOpen).toBe(true);
  });
});
