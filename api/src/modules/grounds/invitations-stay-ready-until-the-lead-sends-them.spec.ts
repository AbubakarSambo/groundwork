import { GroundsService } from './grounds.service';
import { whatNeedsYou, theInvitationsReadyToSend, sendTheInvitations } from './what-needs-you';
import * as fs from 'fs';
import * as path from 'path';

/**
 * "CHECK IN ON YOUR OWN FIRST, INVITE LATER" (Hafsah, 3 November 2026, word for word: "the lead's invitations stay ready but unsent until
 * they tap 'Send N invitations'. Until then, Today shows one line, 'N invitations ready to send', with the button. No start date is
 * needed for that.")
 *
 * Wairimu sets up Deal progress with four people and chooses to check in on her own first. What is proved, as each person reads it:
 *   - nobody on her team is written to, and the morning cron does not send them on a start date while she holds them;
 *   - Wairimu's Today says "4 invitations ready to send" with "Send 4 invitations"; a person on the check-in reads no such line;
 *   - pressing it sends each invitation once, leaves anybody whose start date is ahead to the cron, and on a check-in still waiting
 *     for its approval sends nothing (the approval does); only she or an admin may press it.
 */
function world(opts: { status?: string; people?: any[] } = {}) {
  const participants: any[] = (opts.people ?? []).map((p, i) => ({ id: `p-${i + 1}`, groundId: 'g1', partyType: 'PARTICIPANT', invitedAt: null, notifiedAt: null, awaitingSeat: false, leftAt: null, inviteHeldAt: new Date('2026-11-03T09:00:00Z'), startsAt: null, inviteToken: `t${i}`, remitAsGiven: null, ...p }));
  const matches = (p: any, where: any) => Object.entries(where).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && 'not' in v) return p[k] !== v.not;
    return p[k] === v;
  });
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ({ id: 'g1', organizationId: 'org1', initiatorId: 'wairimu', createdByUserId: null, label: 'Deal progress', status: opts.status ?? 'AWAITING_PARTIES' })), update: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu' })) },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => participants.filter((p) => matches(p, where))),
      updateMany: jest.fn(async ({ where, data }: any) => { const hit = participants.filter((p) => matches(p, where)); hit.forEach((p) => Object.assign(p, data)); return { count: hit.length }; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(participants.find((p) => p.id === where.id) ?? {}, data)),
    },
  };
  const email: any = { sendTheInviteThisGroundSends: jest.fn(async () => ({})) };
  const service: any = new GroundsService(prisma, email, { seatsIncludedFor: async () => null } as any, { emit: () => undefined } as any, { emit: async () => undefined } as any, { get: () => 'http://localhost:5173' } as any, { respond: async () => '' } as any);
  return { service, email, participants };
}

const FOUR = [{ email: 'brian@baridi.test' }, { email: 'kevin@baridi.test' }, { email: 'joyce@baridi.test' }, { email: 'amina@baridi.test' }];

describe('Wairimu checks in on her own first', () => {
  it('setup holds every invitation ready, and the morning cron leaves a held one alone', () => {
    const entry = fs.readFileSync(path.join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8');
    expect(entry).toContain("...(dto.inviteLater ? { heldUntilSent: true } : {}),");
    const cron = fs.readFileSync(path.join(__dirname, 'grounds.cron.ts'), 'utf8');
    expect(cron).toMatch(/invitedAt: null,\s*\/\*[^*]*\*\/\s*inviteHeldAt: null,/);
    const service = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8');
    expect(service).toContain('const theMailWaits = heldByTheLead || (!!startsAt && startsAt.getTime() > Date.now());');
    expect(service).toMatch(/awaitingSeat: false, leftAt: null, inviteHeldAt: null \}/);
  });

  it('her Today says how many are ready, with the button, and a person on the check-in reads nothing of it', () => {
    const row = { id: 'g1', label: 'Deal progress', status: 'AWAITING_PARTIES', organizationId: 'org1', initiatorId: 'wairimu', readyToSend: 4, participants: [{ id: 'p0', userId: 'wairimu' }], checkIns: [] };
    const hers = whatNeedsYou([row as any], { userId: 'wairimu', role: 'MEMBER', organizationId: 'org1' } as any, [], new Date('2026-11-03T10:00:00Z'));
    expect(hers.line).toBe('4 invitations ready to send');
    expect(hers.lineReadyToSend).toEqual({ groundId: 'g1', count: 4, label: 'Send 4 invitations' });
    expect(theInvitationsReadyToSend(1)).toBe('1 invitation ready to send');
    expect(sendTheInvitations(1)).toBe('Send 1 invitation');
    const his = whatNeedsYou([{ ...row, readyToSend: null, participants: [{ id: 'p1', userId: 'brian' }] } as any], { userId: 'brian', role: 'MEMBER', organizationId: 'org1' } as any, [], new Date('2026-11-03T10:00:00Z'));
    expect(his.line ?? '').not.toMatch(/ready to send/);
    expect(his.lineReadyToSend).toBeUndefined();
  });
});

describe('she presses "Send 4 invitations"', () => {
  it('each goes once, and pressing again sends nothing more', async () => {
    const { service, email, participants } = world({ people: FOUR });
    expect(await service.sendTheInvitationsReadyToSend('g1', 'org1', 'wairimu', 'MEMBER')).toEqual({ sent: 4 });
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(4);
    expect(participants.every((p) => p.inviteHeldAt === null && p.invitedAt)).toBe(true);
    expect(await service.sendTheInvitationsReadyToSend('g1', 'org1', 'wairimu', 'MEMBER')).toEqual({ sent: 0 });
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(4);
  });

  it('somebody whose start date is ahead is left for the morning they start', async () => {
    const { service, email, participants } = world({ people: [FOUR[0], { ...FOUR[1], startsAt: new Date(Date.now() + 7 * 86_400_000) }] });
    expect(await service.sendTheInvitationsReadyToSend('g1', 'org1', 'wairimu', 'MEMBER')).toEqual({ sent: 1 });
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
    expect(participants[1]).toMatchObject({ inviteHeldAt: null, invitedAt: null });
  });

  it('on a check-in still waiting for its approval, nothing goes until the approval', async () => {
    const { service, email, participants } = world({ status: 'AWAITING_APPROVAL', people: FOUR });
    expect(await service.sendTheInvitationsReadyToSend('g1', 'org1', 'wairimu', 'MEMBER')).toEqual({ sent: 0 });
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
    expect(participants.every((p) => p.inviteHeldAt === null)).toBe(true);
  });

  it('only she, or an admin, may press it', async () => {
    const { service, email } = world({ people: FOUR });
    await expect(service.sendTheInvitationsReadyToSend('g1', 'org1', 'brian', 'MEMBER'))
      .rejects.toThrow('Only the person who runs this check-in, or an administrator of the organisation, can send its invitations.');
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
    expect(await service.sendTheInvitationsReadyToSend('g1', 'org1', 'grace', 'ADMIN')).toEqual({ sent: 4 });
  });
});
