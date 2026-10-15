import { BadRequestException } from '@nestjs/common';
import { draftFromASetUp, whyAPersonIsLeftOut } from './a-set-up-can-start-from-a-recommendation';
import { EntryService } from './entry.service';
import { EntryCommitController } from './entry.controller';

const prisma = (inOrg: string[]) =>
  ({
    user: {
      findUnique: jest.fn(async () => ({ email: 'hafsah@acme.org' })),
      findMany: jest.fn(async ({ where }: any) => where.email.in.filter((e: string) => inOrg.includes(e)).map((email: string) => ({ email }))),
    },
    groundParticipant: { findMany: jest.fn(async () => []) },
  }) as any;

const setUp = (people: any[]) => ({ kind: 'anchor_project_check_in' as const, about: 'The Nairobi project keeps moving between four people.', aim: 'The Nairobi launch', people });

describe('a new check-in starting from what Groundwork recommended', () => {
  it('carries the people the offer named into the draft, when they are in the organisation', async () => {
    const out = await draftFromASetUp(prisma(['omar@acme.org', 'amani.wekesa@acme.org']), 'org1', 'u1', setUp([{ name: 'Omar', email: 'omar@acme.org' }, { name: 'Amani Wekesa', email: 'Amani.Wekesa@acme.org' }]));
    expect(out).toEqual({
      initial: 'The Nairobi project keeps moving between four people.',
      aim: 'The Nairobi launch',
      contributors: [{ email: 'omar@acme.org', displayName: 'Omar' }, { email: 'amani.wekesa@acme.org', displayName: 'Amani Wekesa' }],
      leftOut: [],
    });
  });

  it('leaves out somebody this organisation has no record of, and says so in a full sentence', async () => {
    const out = await draftFromASetUp(prisma(['omar@acme.org']), 'org1', 'u1', setUp([{ name: 'Omar', email: 'omar@acme.org' }, { name: 'Zed', email: 'zed@elsewhere.com' }]));
    expect(out.contributors.map((c) => c.email)).toEqual(['omar@acme.org']);
    expect(out.leftOut).toEqual([{ email: 'zed@elsewhere.com', why: 'Groundwork has no record of Zed in your organisation, so Zed is not added. You can add them yourself on the next step.' }]);
    expect(whyAPersonIsLeftOut('x@y.com')).toMatch(/^Groundwork has no record of x@y.com/);
  });

  it('never lists the lead herself or the same address twice', async () => {
    const out = await draftFromASetUp(prisma(['hafsah@acme.org', 'omar@acme.org']), 'org1', 'u1', setUp([{ name: 'Hafsah', email: 'hafsah@acme.org' }, { name: null, email: 'omar@acme.org' }, { name: null, email: 'OMAR@acme.org' }]));
    expect(out.contributors).toEqual([{ email: 'omar@acme.org', displayName: null }]);
  });

  it('refuses a set-up that is not one Groundwork recommended', async () => {
    await expect(draftFromASetUp(prisma([]), 'org1', 'u1', { kind: 'something_else', about: 'x', aim: null, people: [] } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is reachable by the lead signed in, through the entry controller', () => {
    expect(typeof (EntryCommitController.prototype as any).draftFromSetUp).toBe('function');
    expect(typeof (EntryService.prototype as any).draftFromSetUp).toBe('function');
  });
});
