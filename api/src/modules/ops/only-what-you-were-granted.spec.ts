/**
 * The CEO's functions are hers, and the check that says so is a grant lookup.
 *
 * The acceptance test the spec asks for is blunt: somebody in sales or a
 * contributor calling the fundraise route directly gets 403. "Directly" is the
 * word that matters — hiding the menu item is not a permission, and this proves
 * the server refuses whether or not the front end ever offered it.
 */
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsPeopleService } from './ops-people.service';
import { DEFAULT_GRANTS, OPS_CAPABILITIES, can } from './what-somebody-may-do';
import { OpsFunctionalRole } from '@prisma/client';

function guardFor(role: OpsFunctionalRole | null, wanted: string | undefined) {
  const person =
    role === null
      ? null
      : {
          id: 'p1',
          key: 'somebody',
          displayName: 'Somebody',
          userId: 'u1',
          functionalRole: role,
          active: true,
          grants: DEFAULT_GRANTS[role].map((capability) => ({ capability })),
        };

  const prisma = { opsPerson: { findUnique: async () => person } } as never;
  const people = new OpsPeopleService(prisma);
  const reflector = { getAllAndOverride: () => wanted } as unknown as Reflector;
  const request: Record<string, unknown> = { user: { id: 'u1' } };

  return {
    guard: new OpsCapabilityGuard(reflector, people),
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as never,
    request,
  };
}

describe('a route is refused unless the caller holds its capability', () => {
  it('lets the CEO into the fundraise', async () => {
    const { guard, context } = guardFor('CEO', 'fundraise:write');
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('refuses sales', async () => {
    const { guard, context } = guardFor('SALES_MARKETING', 'fundraise:write');
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('refuses a contributor', async () => {
    const { guard, context } = guardFor('CONTRIBUTOR', 'fundraise:write');
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('refuses somebody who is not on this team at all, account or no account', async () => {
    const { guard, context } = guardFor(null, 'sales:read');
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('and names the capability in the refusal, so the reason is not a guess', async () => {
    const { guard, context } = guardFor('CONTRIBUTOR', 'fundraise:write');
    await expect(guard.canActivate(context)).rejects.toThrow(/fundraise:write/);
  });

  it('attaches who is asking even where no capability was required', async () => {
    const { guard, context, request } = guardFor('TECH', undefined);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.opsIdentity).toMatchObject({ key: 'somebody', functionalRole: 'TECH' });
  });
});

describe('the capability a route asks for has to exist', () => {
  it('so a typo is a boot failure rather than a door nobody guards', () => {
    expect(() => NeedsOps('sales:wrtie' as never)).toThrow(/not a capability/);
  });

  it('and every capability in a role default is one of the declared set', () => {
    const unknown: string[] = [];
    for (const [role, granted] of Object.entries(DEFAULT_GRANTS)) {
      for (const capability of granted) {
        if (!(OPS_CAPABILITIES as readonly string[]).includes(capability)) {
          unknown.push(`${role}: ${capability}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });
});

describe('write capabilities the CEO gave away, she does not also hold', () => {
  /**
   * Not tidiness. If the CEO holds every write capability then "who does this"
   * has no answer the system can give, and the ownership columns on every board
   * become decoration.
   */
  it.each(['sales:write', 'product:write', 'tech:write', 'ux:write', 'marketing:write'])(
    '%s belongs to the person who owns that work',
    (capability) => {
      expect(can(DEFAULT_GRANTS.CEO, capability as never)).toBe(false);
    },
  );

  it('but she keeps every approval, because a decision is not delegated work', () => {
    for (const approval of ['roadmap:approve', 'spend:approve', 'resourcing:approve', 'commercial:approve']) {
      expect(can(DEFAULT_GRANTS.CEO, approval as never)).toBe(true);
    }
  });
});
