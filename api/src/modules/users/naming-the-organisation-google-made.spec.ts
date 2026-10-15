import { UsersService } from './users.service';

/**
 * NAMING THE ORGANISATION A FIRST GOOGLE SIGN-IN MADE (U.3).
 *
 * A first Google sign-in makes an organisation straight away, because Google has already proved the
 * address. The person is then shown "Create an organisation", which names that organisation rather
 * than making a second one. So PATCH /users/organization takes the rest of that card: an optional
 * billing email and what they said about the team's size.
 */
function make() {
  const updates: any[] = [];
  const prisma: any = {
    organization: {
      update: jest.fn(async (a: any) => { updates.push(a); return { id: 'o1', name: a.data.name }; }),
    },
  };
  const service = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  return { service, updates };
}

describe('naming the organisation', () => {
  it('the Settings rename still changes only the name', async () => {
    const { service, updates } = make();
    await service.renameOrganization('o1', ' Nyali Foods ');
    expect(updates[0]).toEqual({ where: { id: 'o1' }, data: { name: 'Nyali Foods' }, select: { id: true, name: true } });
  });

  it('keeps the billing email they gave', async () => {
    const { service, updates } = make();
    await service.renameOrganization('o1', 'Nyali Foods', { billingEmail: ' Finance@Nyali.test ' });
    expect(updates[0].data.email).toBe('finance@nyali.test');
  });

  it('and leaves the one it has when they gave none, because it is optional', async () => {
    const { service, updates } = make();
    await service.renameOrganization('o1', 'Nyali Foods', { billingEmail: '  ' });
    expect(updates[0].data).not.toHaveProperty('email');
  });

  it('keeps what they said about the team size', async () => {
    const { service, updates } = make();
    await service.renameOrganization('o1', 'Nyali Foods', { teamSize: { said: 'more', line: 20 } });
    expect(updates[0].data).toMatchObject({ teamSizeSaid: 'more', teamSizeLine: 20 });
  });

  it('refuses a name shorter than two letters in a plain sentence', async () => {
    const { service, updates } = make();
    await expect(service.renameOrganization('o1', ' N ')).rejects.toThrow('Give the organisation a name of at least two letters.');
    expect(updates).toHaveLength(0);
  });
});
