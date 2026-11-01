import { EntryService } from './entry.service';

/**
 * THE PHONE NUMBERS GIVEN IN SETUP ARE KEPT BY THE SAVE ITSELF (Hafsah's blocker, 31 October 2026: "prove in the next round that
 * nothing anyone says in setup is ever lost").
 *
 * A lead types each person's number beside their name in the setup's team box. The numbers used to go through a second request the
 * page made after a signed-in save, so a save finished from the email link, on another browser or through Google kept nobody's
 * number. Now each person's number travels with them in the save, and the save keeps it through the one writer for a lead's number
 * (grounds.addTheirWhatsAppNumber), as the lead who runs the check-in. A number the writer refuses is said, with the person's name,
 * and the person stays on the check-in.
 */
function makeService(numberWriter: jest.Mock) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'wanjiku@law.test' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-lead' }]), findFirst: jest.fn(async () => ({ id: 'p-lead' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = {
    create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })),
    createForLead: jest.fn(),
    addParticipant: jest.fn(async (_g: string, _o: string, _u: string, dto: any) => ({ id: `p-${dto.email.split('@')[0]}`, email: dto.email, invitedAt: new Date() })),
    addTheirWhatsAppNumber: numberWriter,
  };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  return { service, grounds };
}

const THE_TEAM = [
  { email: 'david@law.test', displayName: 'David Omondi', phone: '+254 722 129 895' },
  { email: 'sarah@law.test', displayName: 'Sarah Njeri', phone: '+254 733 239 992' },
  { email: 'kevin@law.test', displayName: 'Kevin Kimani', phone: '+254 700 340 089' },
  { email: 'grace@law.test', displayName: 'Grace Wambui' },
];
const save = (service: EntryService) =>
  service.commit('org1', 'u-wanjiku', { groundLabel: 'Court deadlines', scenario: 'NEW_PROJECT', history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors: THE_TEAM } as any);

describe('a save with the team and their phone numbers', () => {
  it('puts all four on the check-in, with their names, and keeps each number given against the person it was given for', async () => {
    const writer = jest.fn(async () => ({ said: 'kept' }));
    const { service, grounds } = makeService(writer);
    const out: any = await save(service);

    expect(grounds.addParticipant).toHaveBeenCalledTimes(4);
    for (const p of THE_TEAM) {
      expect(grounds.addParticipant).toHaveBeenCalledWith('g1', 'org1', 'u-wanjiku', expect.objectContaining({ email: p.email, displayName: p.displayName }));
    }
    expect(writer).toHaveBeenCalledTimes(3);
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({ groundId: 'g1', participantId: 'p-david', organizationId: 'org1', userId: 'u-wanjiku', phone: '+254 722 129 895' }));
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({ participantId: 'p-kevin', phone: '+254 700 340 089' }));
    expect(out.contributors.map((c: any) => c.email)).toEqual(THE_TEAM.map((p) => p.email));
    expect(out.whyInvitesFailed).toEqual([]);
    expect(out.numbersNotKept).toEqual([]);
  });

  it('a number the writer refuses is said with the person’s name, and they stay on the check-in and invited', async () => {
    const writer = jest.fn(async (input: any) => {
      if (input.participantId === 'p-sarah') throw new Error('That does not look like a phone number. Write it with the country code, for example +254 712 345 678.');
      return { said: 'kept' };
    });
    const { service } = makeService(writer);
    const out: any = await save(service);

    expect(out.contributors.map((c: any) => c.email)).toContain('sarah@law.test');
    expect(out.failedInvites).toEqual([]);
    expect(out.numbersNotKept).toEqual([{
      email: 'sarah@law.test',
      because: 'The phone number for Sarah Njeri did not save, but they are on the check-in. That does not look like a phone number. Write it with the country code, for example +254 712 345 678.',
    }]);
  });
});
