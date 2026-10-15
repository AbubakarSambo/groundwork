import 'reflect-metadata';
import { ArgumentMetadata, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { RolesGuard } from '../../common/guards/roles.guard';

/**
 * ONLY AN ADMIN CHANGES THE ORGANISATION (U.3, Hafsah, 26 September).
 *
 * PATCH /auth/me took the organisation's name, contact email, slug and stage from any signed-in
 * person, with no role check, so a member or a guest could rename the company. Now it changes only
 * the person's own profile, and PATCH /users/organization, for admins, is the one way to change the
 * organisation.
 */

/* The same pipe main.ts puts in front of every route. */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body: ArgumentMetadata = { type: 'body', metatype: UpdateProfileDto };

describe('PATCH /auth/me refuses the organisation\'s fields, from anybody', () => {
  for (const field of [
    { orgName: 'Renamed Ltd' },
    { orgEmail: 'thief@elsewhere.test' },
    { orgSlug: 'renamed' },
    { companyStage: 'EARLY_REVENUE' },
  ]) {
    it(`refuses ${Object.keys(field)[0]}`, async () => {
      await expect(pipe.transform(field, body)).rejects.toBeTruthy();
    });
  }

  it('and still takes the person\'s own name', async () => {
    await expect(pipe.transform({ firstName: 'Adam' }, body)).resolves.toMatchObject({ firstName: 'Adam' });
  });

  it('and the service never writes to the organisation, whoever calls it', async () => {
    const prisma: any = {
      user: {
        findUniqueOrThrow: jest.fn(async () => ({ id: 'u1', organizationId: 'o1' })),
        update: jest.fn(async () => ({})),
      },
      organization: { update: jest.fn(), updateMany: jest.fn() },
    };
    const service = new AuthService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
    jest.spyOn(service, 'getProfile').mockResolvedValue({} as any);
    /* Even if something got past the pipe. */
    await service.updateProfile('u1', { firstName: 'Adam', orgName: 'Renamed Ltd', orgEmail: 'x@y.test', orgSlug: 's', companyStage: 'EARLY_REVENUE' } as any);
    expect(prisma.organization.update).not.toHaveBeenCalled();
    expect(prisma.organization.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { firstName: 'Adam' } });
  });
});

describe('PATCH /users/organization is for admins only', () => {
  const guard = new RolesGuard(new Reflector());
  const asRole = (role: string) => ({
    getHandler: () => UsersController.prototype.renameOrganization,
    getClass: () => UsersController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', role } }) }),
  }) as any;

  it.each(['MEMBER', 'LEAD', 'GUEST'])('a %s is refused', (role) => {
    expect(() => guard.canActivate(asRole(role))).toThrow(ForbiddenException);
  });

  it('an admin is let through', () => {
    expect(guard.canActivate(asRole('ADMIN'))).toBe(true);
  });

  it('and an admin can change the name, the billing email and the stage there', async () => {
    const prisma: any = { organization: { update: jest.fn(async (a: any) => ({ id: 'o1', name: a.data.name })) } };
    const users = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
    const controller = new UsersController(users, {} as any, {} as any, {} as any);
    await controller.renameOrganization('o1', { name: 'Nyali Foods', billingEmail: 'finance@nyali.test', companyStage: 'EARLY_REVENUE' } as any);
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { name: 'Nyali Foods', email: 'finance@nyali.test', companyStage: 'EARLY_REVENUE' },
      select: { id: true, name: true },
    });
  });
});
