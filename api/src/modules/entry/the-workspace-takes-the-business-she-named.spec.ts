import { EntryService } from './entry.service';
import { theBusinessTheyNamed } from './the-business-they-named';

/*
 * Night quality run 2, Naomi Wekesa's walk. Her first words in setup were "I run Ridge Bakery in Eldoret with
 * seven staff ...", she left "Organisation name (optional)" empty, and every page after sign-in said
 * "Naomi's workspace". The organisation now takes the name she gave, and a name somebody typed is kept.
 */
const naomi = 'I run Ridge Bakery in Eldoret with seven staff: two bakers, three counter staff and two delivery riders. I want a weekly check-in to see what is going wrong with late orders and wasted bread, and who is carrying what.';
const team = ['Mary Chebet', 'Peter Kiprop', 'Faith Jepchirchir', 'Brian Mutai', 'Lucy Wanjiku', 'Samuel Rono', 'Kevin Kosgei'];

describe('the business she named', () => {
  it('is "Ridge Bakery" from Naomi\'s first message', () => {
    expect(theBusinessTheyNamed([naomi], team)).toBe('Ridge Bakery');
  });

  it('is nothing from a lower-case phrase, and never a person she named', () => {
    expect(theBusinessTheyNamed(['I run a field sales team of four selling solar home kits across Nyanza.'])).toBeNull();
    expect(theBusinessTheyNamed(['I started Mary Chebet on the early bake.'], team)).toBeNull();
  });

  it('reads "a company called" too', () => {
    expect(theBusinessTheyNamed(['We are a small company called Lakeshore Solar, selling kits.'])).toBe('Lakeshore Solar');
  });
});

function aService(name: string) {
  const updates: any[] = [];
  const service: any = Object.create(EntryService.prototype);
  service.prisma = {
    organization: {
      findUnique: async () => ({ name }),
      update: async (a: any) => { updates.push(a); return a; },
    },
  };
  service.logger = { log: () => undefined, warn: () => undefined };
  return { service, updates };
}

describe('the organisation takes that name only in place of one Groundwork made up', () => {
  it('"Naomi\'s workspace" becomes "Ridge Bakery"', async () => {
    const { service, updates } = aService("Naomi's workspace");
    await service.renameAMadeUpWorkspaceFromTheirWords('org-1', [naomi], team);
    expect(updates).toEqual([{ where: { id: 'org-1' }, data: { name: 'Ridge Bakery' } }]);
  });

  it('a name she chose herself is never overwritten', async () => {
    const { service, updates } = aService('Ridge Bakers Ltd');
    await service.renameAMadeUpWorkspaceFromTheirWords('org-1', [naomi], team);
    expect(updates).toEqual([]);
  });
});
