import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  aRoleToInviteAs, theRolesTheyMayGive, theRoleThisPersonMayGive, theRoleTheLinkGives, howPeopleJoinHere,
  HOW_A_NEW_ORG_ADDS_PEOPLE, ONLY_ADMINS_ADD_PEOPLE, ONLY_AS_TAKES_PART, GUESTS_CANNOT_JOIN,
} from './the-role-an-invitation-gives';
import { AuthService } from '../auth/auth.service';
import { TheOrganisationInviteLinkService } from './the-organisation-invite-link.service';
import { groundsAViewerMayList, whatTheyMayRead } from '../grounds/who-may-read-this-check-in';

/**
 * GUESTS CAN JOIN THE ORGANISATION, AND WHO CAN ADD PEOPLE (Hafsah, 21 November 2026).
 *
 * Two settings under "Who can join" on People. Both off by default, so every organisation already here reads as before. With
 * guests on, an admin can invite somebody as a guest, and the invite link can give "Guest". With "Anyone here", anybody who is
 * not a guest may invite people as "Takes part" and nothing else, within the plan's seats. A guest is the GUEST role a lead's
 * guest on one check-in already holds: they read only the check-ins they are added to.
 */
const OFF = HOW_A_NEW_ORG_ADDS_PEOPLE;
const GUESTS_ON = { ...OFF, guestsMayJoin: true };
const ANYONE = { ...OFF, whoMayAddPeople: 'ANYONE' as const };

describe('off by default, for every organisation already here and every new one', () => {
  it('a row with nothing set, or no row, reads as guests off and only admins', () => {
    expect(howPeopleJoinHere(null)).toEqual({ guestsMayJoin: false, whoMayAddPeople: 'ADMINS' });
    expect(howPeopleJoinHere({})).toEqual({ guestsMayJoin: false, whoMayAddPeople: 'ADMINS' });
    /* A value the rule does not know is the stricter setting, never the open one. */
    expect(howPeopleJoinHere({ whoMayAddPeople: 'EVERYONE' })).toEqual({ guestsMayJoin: false, whoMayAddPeople: 'ADMINS' });
  });

  it('the migration adds the columns with those defaults, and drops or changes nothing', () => {
    const sql = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'migrations', '20261121140000_guests_may_join_and_who_adds_people', 'migration.sql'), 'utf8');
    expect(sql).toMatch(/ADD COLUMN "guests_may_join" BOOLEAN NOT NULL DEFAULT false/);
    expect(sql).toMatch(/ADD COLUMN "who_may_add_people" TEXT NOT NULL DEFAULT 'ADMINS'/);
    expect(sql).toMatch(/ADD COLUMN "invite_link_role" TEXT NOT NULL DEFAULT 'MEMBER'/);
    expect(sql).not.toMatch(/DROP|ALTER COLUMN|UPDATE /);
  });

  it('an admin offers the three roles, never a guest, and the link gives "Takes part"', () => {
    expect(theRolesTheyMayGive('ADMIN', OFF)).toEqual(['MEMBER', 'LEAD', 'ADMIN']);
    expect(theRoleTheLinkGives({ guestsMayJoin: false, inviteLinkRole: 'MEMBER' })).toBe('MEMBER');
  });
});

describe('who can add people: "Only admins"', () => {
  it('a member, a lead and a guest are refused, in a sentence that says who can', () => {
    for (const role of ['MEMBER', 'LEAD', 'GUEST', null]) {
      expect(theRolesTheyMayGive(role, OFF)).toEqual([]);
      expect(() => aRoleToInviteAs('MEMBER', role, OFF)).toThrow(new ForbiddenException(ONLY_ADMINS_ADD_PEOPLE));
    }
  });

  it('an admin still gives each of the three roles, and a member when none is chosen', () => {
    expect(aRoleToInviteAs('ADMIN', 'ADMIN', OFF)).toBe('ADMIN');
    expect(aRoleToInviteAs('LEAD', 'ADMIN', OFF)).toBe('LEAD');
    expect(aRoleToInviteAs(undefined, 'ADMIN', OFF)).toBe('MEMBER');
  });
});

describe('who can add people: "Anyone here"', () => {
  it('a member and a lead may invite as "Takes part"', () => {
    expect(aRoleToInviteAs('MEMBER', 'MEMBER', ANYONE)).toBe('MEMBER');
    expect(aRoleToInviteAs(undefined, 'LEAD', ANYONE)).toBe('MEMBER');
    expect(theRolesTheyMayGive('MEMBER', ANYONE)).toEqual(['MEMBER']);
  });

  it('an admin role is never grantable by a member, nor a lead\'s, an owner\'s or a guest\'s', () => {
    for (const asked of ['ADMIN', 'LEAD', 'OWNER', 'GUEST']) {
      expect(() => aRoleToInviteAs(asked, 'MEMBER', { ...ANYONE, guestsMayJoin: true })).toThrow(new ForbiddenException(ONLY_AS_TAKES_PART));
      expect(() => aRoleToInviteAs(asked, 'LEAD', { ...ANYONE, guestsMayJoin: true })).toThrow(new ForbiddenException(ONLY_AS_TAKES_PART));
    }
  });

  it('a guest still may not add anybody', () => {
    expect(() => aRoleToInviteAs('MEMBER', 'GUEST', ANYONE)).toThrow(new ForbiddenException(ONLY_ADMINS_ADD_PEOPLE));
  });

  it('reads the inviter\'s membership here, not the account\'s role column, and nobody still waiting to be let in', async () => {
    const prisma = (membershipRole: string | null, awaiting = false) => ({
      organization: { findUnique: jest.fn(async () => ({ guestsMayJoin: false, whoMayAddPeople: 'ANYONE' })) },
      organizationMembership: { findUnique: jest.fn(async () => (membershipRole ? { role: membershipRole } : null)) },
      user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: awaiting, role: 'ADMIN' })) },
    });
    await expect(theRoleThisPersonMayGive(prisma('MEMBER'), 'org-1', 'u-1', 'ADMIN')).rejects.toThrow(ONLY_AS_TAKES_PART);
    await expect(theRoleThisPersonMayGive(prisma('MEMBER'), 'org-1', 'u-1', undefined)).resolves.toBe('MEMBER');
    await expect(theRoleThisPersonMayGive(prisma('MEMBER', true), 'org-1', 'u-1', 'MEMBER')).rejects.toThrow(ONLY_ADMINS_ADD_PEOPLE);
    await expect(theRoleThisPersonMayGive(prisma(null), 'org-1', 'u-1', 'MEMBER')).rejects.toThrow(ONLY_ADMINS_ADD_PEOPLE);
  });
});

describe('guests can join the organisation', () => {
  it('off: an admin asking for a guest is told, in a sentence, how to turn it on', () => {
    expect(() => aRoleToInviteAs('GUEST', 'ADMIN', OFF)).toThrow(new BadRequestException(GUESTS_CANNOT_JOIN));
  });

  it('on: an admin may invite as a guest, and the page offers it', () => {
    expect(aRoleToInviteAs('GUEST', 'ADMIN', GUESTS_ON)).toBe('GUEST');
    expect(theRolesTheyMayGive('ADMIN', GUESTS_ON)).toEqual(['MEMBER', 'LEAD', 'ADMIN', 'GUEST']);
  });

  it('the link gives "Guest" only while the admin chose it and guests may join', () => {
    expect(theRoleTheLinkGives({ guestsMayJoin: true, inviteLinkRole: 'GUEST' })).toBe('GUEST');
    expect(theRoleTheLinkGives({ guestsMayJoin: false, inviteLinkRole: 'GUEST' })).toBe('MEMBER');
    expect(theRoleTheLinkGives({ guestsMayJoin: true, inviteLinkRole: 'MEMBER' })).toBe('MEMBER');
  });

  it('joining by a guest link makes a GUEST membership, the same role a check-in guest holds', async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => ({ id: 'org-1', name: 'Baridi Appliances', email: 'amina@baridi.co.ke', joinDomain: null, guestsMayJoin: true, inviteLinkRole: 'GUEST' })) },
      organizationMembership: { findUnique: jest.fn(async () => null), create: jest.fn(async () => ({})) },
      membershipRequest: { findUnique: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => ({ email: 'kofi@baridi.co.ke' })) },
    };
    const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: true })) };
    const auth: any = { switchOrganization: jest.fn(async () => ({ ok: true })) };
    await new TheOrganisationInviteLinkService(prisma, billing, auth).join('baridi-7k2p', 'u-kofi');
    expect(prisma.organizationMembership.create).toHaveBeenCalledWith({ data: { userId: 'u-kofi', organizationId: 'org-1', role: 'GUEST', joinedHow: 'link' } });
  });

  it('the admin cannot set the link to "Guest" while guests cannot join', async () => {
    const prisma: any = { organization: { findUnique: jest.fn(async () => ({ guestsMayJoin: false })), update: jest.fn() } };
    await expect(new TheOrganisationInviteLinkService(prisma, {} as any, {} as any).setRole('org-1', 'GUEST')).rejects.toThrow(GUESTS_CANNOT_JOIN);
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it('a guest here lists and reads only the check-ins they are added to, exactly as a check-in guest does', () => {
    const guest = { userId: 'u-kofi', role: 'GUEST', organizationId: 'org-1' };
    const theirs = { organizationId: 'org-1', scenario: 'TEAM_UPDATES' as any, initiatorId: 'u-wairimu', participants: [{ userId: 'u-kofi' }] };
    const notTheirs = { organizationId: 'org-1', scenario: 'TEAM_UPDATES' as any, initiatorId: 'u-wairimu', participants: [{ userId: 'u-miriam' }] };
    expect(whatTheyMayRead('u-kofi', guest, theirs)).toBe('own');
    expect(whatTheyMayRead('u-kofi', guest, notTheirs)).toBeNull();
    const list = groundsAViewerMayList('u-kofi', guest, 'org-1') as any;
    expect(list.OR).toEqual([
      { initiatorId: 'u-kofi' },
      { createdByUserId: 'u-kofi' },
      { participants: { some: { userId: 'u-kofi' } }, status: { not: 'AWAITING_APPROVAL' } },
    ]);
  });
});

describe('the plan\'s seats still apply to whoever invites', () => {
  function anAuthService(room: { allowed: boolean; reason?: string }) {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => null) },
      organization: { findUnique: jest.fn(async () => ({ name: 'Baridi Appliances', guestsMayJoin: false, whoMayAddPeople: 'ANYONE' })) },
      organizationMembership: { findUnique: jest.fn(async () => ({ role: 'MEMBER' })), create: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn({
        user: { create: jest.fn(async () => ({ id: 'new-user' })) },
        emailVerificationToken: { create: jest.fn(async () => ({})) },
      })),
    };
    prisma.user.findUnique.mockImplementation(async (args: any) => (args?.select?.awaitingOrgApproval ? { awaitingOrgApproval: false } : null));
    const email: any = { sendUserInvite: jest.fn(async () => undefined) };
    const billing: any = { canInviteMember: jest.fn(async () => room) };
    return { service: new AuthService(prisma, {} as any, {} as any, email, {} as any, billing, { emit: () => undefined } as any), billing, email };
  }

  it('a member\'s invitation is refused when the plan is full, and nobody is emailed', async () => {
    const { service, billing, email } = anAuthService({ allowed: false, reason: 'Your plan is full.' });
    const role = await service.theRoleTheyMayGive('org-1', 'u-miriam', undefined);
    expect(role).toBe('MEMBER');
    await expect(service.teamInvite('Baridi Appliances', 'faith@baridi.co.ke', 'org-1', { role })).rejects.toBeInstanceOf(BadRequestException);
    expect(billing.canInviteMember).toHaveBeenCalledWith('org-1');
    expect(email.sendUserInvite).not.toHaveBeenCalled();
  });

  it('and goes when there is room', async () => {
    const { service, email } = anAuthService({ allowed: true });
    const role = await service.theRoleTheyMayGive('org-1', 'u-miriam', 'MEMBER');
    await service.teamInvite('Baridi Appliances', 'faith@baridi.co.ke', 'org-1', { role });
    expect(email.sendUserInvite).toHaveBeenCalled();
  });
});

describe('every route that adds people to the organisation asks the one rule', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const users = strip(readFileSync(join(__dirname, 'users.controller.ts'), 'utf8'));
  const auth = strip(readFileSync(join(__dirname, '..', 'auth', 'auth.controller.ts'), 'utf8'));

  it('POST /users/invitations, POST /users and POST /auth/team-invite each ask it before inviting', () => {
    expect(users).toMatch(/@Post\('invitations'\)[\s\S]*?theRoleTheyMayGive\(user\.organizationId, user\.id, body\?\.role\)[\s\S]*?inviteMany\(/);
    expect(users).toMatch(/async create\([\s\S]*?theRoleTheyMayGive\(user\.organizationId, user\.id, dto\.role\)[\s\S]*?usersService\.create\(/);
    expect(auth).toMatch(/@Post\('team-invite'\)[\s\S]*?theRoleTheyMayGive\(user\.organizationId, user\.id, body\.role\)[\s\S]*?teamInvite\(orgName/);
  });

  it('and the old way round it, the role read without asking who is inviting, is gone', () => {
    expect(users).not.toMatch(/aRoleToInviteAs\(/);
    expect(auth).not.toMatch(/aRoleToInviteAs\(/);
  });

  it('only an admin changes either setting', () => {
    expect(users).toMatch(/@Patch\('organization\/adding-people'\)\s*@Roles\(Role\.ADMIN\)/);
  });
});

describe('the signed-in person carries whether they may add people, from the same rule', () => {
  const shape = (role: string, org: any, awaitingOrgApproval = false) => (new AuthService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any) as any)
    .theUserShape({ id: 'u', email: 'u@x.com', firstName: 'U', lastName: '', role, organizationId: 'o', isPlatformAdmin: false, awaitingOrgApproval, organization: { id: 'o', name: 'Baridi', slug: 'b', email: null, ...org } }, false);

  it('an admin always; a member only where anyone may add people; a guest never', () => {
    expect(shape('ADMIN', {}).mayAddPeople).toBe(true);
    expect(shape('MEMBER', {}).mayAddPeople).toBe(false);
    expect(shape('MEMBER', { whoMayAddPeople: 'ANYONE' }).mayAddPeople).toBe(true);
    expect(shape('GUEST', { whoMayAddPeople: 'ANYONE' }).mayAddPeople).toBe(false);
    expect(shape('MEMBER', { whoMayAddPeople: 'ANYONE' }, true).mayAddPeople).toBe(false);
  });
});
