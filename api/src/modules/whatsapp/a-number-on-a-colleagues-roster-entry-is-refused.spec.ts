import { BadRequestException } from '@nestjs/common';
import { refuseANumberOnSomebodyElse, A_NUMBER_ON_A_COLLEAGUE } from './one-number-for-a-person';
import { formsOfTheSameNumber } from './a-number-whatsapp-can-reach';

/**
 * A NUMBER ON A COLLEAGUE'S ROSTER ENTRY IS REFUSED (browser test, 21 October 2026). In Drop Access (test), Grace kept "+254 712 345 678"
 * for Sam on People and setup. Sam has no sign-in yet, so the number is on his roster entry only. Grace then typed "0712345678" for Lucy
 * on People, and it was saved: two people, one number. It is refused now, naming Sam, and Lucy's own entry never refuses Lucy.
 */
function aDatabase() {
  const users = [{ id: 'u-lucy', email: 'lucy@dropaccess.test', phoneNumber: '+254700500007', deletedAt: null }];
  const people = [
    { organizationId: 'org-da', linkedUserId: null, email: 'sam.1280@dropaccess.test', displayName: 'Sam Kamau', phone: '+254712345678', active: true },
    { organizationId: 'org-da', linkedUserId: 'u-lucy', email: 'lucy@dropaccess.test', displayName: 'Lucy Wanjiku', phone: '+254700500007', active: true },
  ];
  const not = (p: any, w: any) => (w.NOT ?? []).some((n: any) => (n.linkedUserId && p.linkedUserId === n.linkedUserId) || (n.email && p.email?.toLowerCase() === n.email.equals.toLowerCase()));
  const prisma: any = {
    user: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async ({ where }: any) => users.find((u) => where.phoneNumber.in.includes(u.phoneNumber) && u.id !== where.NOT?.id) ?? null,
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
    },
    person: { findFirst: async ({ where }: any) => people.find((p) => p.organizationId === where.organizationId && where.phone.in.includes(p.phone) && p.active && !not(p, where)) ?? null },
    organizationMembership: { findFirst: async () => null },
  };
  return prisma;
}

describe('a number on a colleague’s roster entry is refused', () => {
  it('the two ways Grace typed it are the same number', () => {
    expect(formsOfTheSameNumber('+254712345678')).toEqual(expect.arrayContaining(['+254712345678', '0712345678']));
  });
  it('Grace cannot give Lucy the number kept for Sam, and is told whose it is', async () => {
    await expect(refuseANumberOnSomebodyElse(aDatabase(), '+254712345678', 'u-lucy', 'org-da')).rejects.toThrow(new BadRequestException(A_NUMBER_ON_A_COLLEAGUE('Sam Kamau')));
  });
  it('Lucy keeping her own number is not refused by her own entry', async () => {
    await expect(refuseANumberOnSomebodyElse(aDatabase(), '+254700500007', 'u-lucy', 'org-da')).resolves.toBeUndefined();
  });
  it('a lead keeping Sam’s own number for Sam again is not refused by his own entry', async () => {
    await expect(refuseANumberOnSomebodyElse(aDatabase(), '+254712345678', null, 'org-da', 'sam.1280@dropaccess.test')).resolves.toBeUndefined();
  });
});
