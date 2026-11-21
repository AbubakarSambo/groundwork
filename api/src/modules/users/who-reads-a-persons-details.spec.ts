import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { mayReadTheCv, mayChangeTheCv, mayReadTheEmergencyContact, mayChangeTheEmergencyContact } from './who-reads-a-persons-details';
import { PersonDetailsService } from './person-details.service';

/**
 * A PERSON'S CV AND EMERGENCY CONTACT, AS EACH READER IS SERVED THEM (Hafsah, 21 November 2026).
 *
 * Miriam reports to Wairimu. Grace is an admin. Joseph is Miriam's colleague, a member. Kofi is a guest. The CV is read by Miriam,
 * Grace and Wairimu; the emergency contact by Miriam and Grace only. Whatever a reader may not see is not in what they are sent.
 */
const MIRIAM = { userId: 'u-miriam', reportsToUserId: 'u-wairimu' };
const ROLES: Record<string, string> = { 'u-miriam': 'MEMBER', 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-joseph': 'MEMBER', 'u-kofi': 'GUEST' };

describe('the rule', () => {
  const as = (userId: string) => ({ userId, role: ROLES[userId] });
  it('the CV: the person, an admin and their own manager read it; a colleague and a guest do not', () => {
    expect(mayReadTheCv(as('u-miriam'), MIRIAM)).toBe(true);
    expect(mayReadTheCv(as('u-grace'), MIRIAM)).toBe(true);
    expect(mayReadTheCv(as('u-wairimu'), MIRIAM)).toBe(true);
    expect(mayReadTheCv(as('u-joseph'), MIRIAM)).toBe(false);
    expect(mayReadTheCv(as('u-kofi'), MIRIAM)).toBe(false);
    expect(mayReadTheCv({ userId: 'u-wairimu', role: null }, MIRIAM)).toBe(false);
  });
  it('the CV is changed by the person or an admin, never by their manager', () => {
    expect(mayChangeTheCv(as('u-miriam'), MIRIAM)).toBe(true);
    expect(mayChangeTheCv(as('u-grace'), MIRIAM)).toBe(true);
    expect(mayChangeTheCv(as('u-wairimu'), MIRIAM)).toBe(false);
  });
  it('the emergency contact: the person and an admin only, not even their manager', () => {
    for (const fn of [mayReadTheEmergencyContact, mayChangeTheEmergencyContact]) {
      expect(fn(as('u-miriam'), MIRIAM)).toBe(true);
      expect(fn(as('u-grace'), MIRIAM)).toBe(true);
      expect(fn(as('u-wairimu'), MIRIAM)).toBe(false);
      expect(fn(as('u-joseph'), MIRIAM)).toBe(false);
      expect(fn(as('u-kofi'), MIRIAM)).toBe(false);
    }
  });
});

function aService(stored: { cv?: any; contact?: any } = {}) {
  const cv = stored.cv ?? { fileName: 'Miriam Wanjiku CV.pdf', mimeType: 'application/pdf', bytes: Buffer.from('%PDF-1.4'), size: 8, uploadedAt: new Date('2026-11-20T09:00:00Z') };
  const contact = stored.contact ?? { name: 'Esther Wanjiku', relationship: 'sister', phone: '+254 712 345 678' };
  const prisma: any = {
    organizationMembership: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const id = where.userId_organizationId.userId;
        if (select?.reportsToUserId) return id === 'u-miriam' ? { reportsToUserId: 'u-wairimu' } : ROLES[id] ? { reportsToUserId: null } : null;
        return ROLES[id] ? { role: ROLES[id] } : null;
      }),
    },
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })) },
    personCv: { findUnique: jest.fn(async () => cv), upsert: jest.fn(async () => ({})) },
    emergencyContact: { findUnique: jest.fn(async () => contact), upsert: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({})) },
  };
  return { service: new PersonDetailsService(prisma), prisma };
}

describe('what each reader is sent about Miriam', () => {
  it('Miriam reads both, and may change both', async () => {
    const r = await aService().service.forReader('org-1', 'u-miriam', 'u-miriam');
    expect(r.cv?.fileName).toBe('Miriam Wanjiku CV.pdf');
    expect(r.emergencyContact).toEqual({ name: 'Esther Wanjiku', relationship: 'sister', phone: '+254 712 345 678' });
    expect(r).toMatchObject({ mayChangeCv: true, mayChangeEmergencyContact: true });
  });

  it('Grace, an admin, reads both, and may change both', async () => {
    const r = await aService().service.forReader('org-1', 'u-grace', 'u-miriam');
    expect(r.cv).toBeTruthy();
    expect(r.emergencyContact).toBeTruthy();
    expect(r).toMatchObject({ mayChangeCv: true, mayChangeEmergencyContact: true });
  });

  it('Wairimu, her manager, reads her CV and is never sent her emergency contact', async () => {
    const { service, prisma } = aService();
    const r = await service.forReader('org-1', 'u-wairimu', 'u-miriam');
    expect(r.cv).toBeTruthy();
    expect('emergencyContact' in r).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/Esther|712/);
    expect(prisma.emergencyContact.findUnique).not.toHaveBeenCalled();
  });

  it('Joseph, a colleague, is sent neither, and his own record reads nothing of hers', async () => {
    const { service, prisma } = aService();
    const r = await service.forReader('org-1', 'u-joseph', 'u-miriam');
    expect(r).toEqual({ mayChangeCv: false, mayChangeEmergencyContact: false });
    expect(prisma.personCv.findUnique).not.toHaveBeenCalled();
    expect(prisma.emergencyContact.findUnique).not.toHaveBeenCalled();
  });

  it('Kofi, a guest, is sent neither', async () => {
    const r = await aService().service.forReader('org-1', 'u-kofi', 'u-miriam');
    expect(r).toEqual({ mayChangeCv: false, mayChangeEmergencyContact: false });
  });

  it('a download is refused to a colleague, and served to her manager', async () => {
    const { service } = aService();
    await expect(service.theCv('org-1', 'u-joseph', 'u-miriam')).rejects.toBeInstanceOf(ForbiddenException);
    const file = await service.theCv('org-1', 'u-wairimu', 'u-miriam');
    expect(file).toMatchObject({ fileName: 'Miriam Wanjiku CV.pdf', contentType: 'application/pdf' });
  });

  it('nobody but Miriam or an admin writes them', async () => {
    const { service, prisma } = aService();
    const pdf: any = { buffer: Buffer.from('%PDF'), size: 4, mimetype: 'application/pdf', originalname: 'cv.pdf' };
    await expect(service.setTheCv('org-1', 'u-wairimu', 'u-miriam', pdf)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.setTheEmergencyContact('org-1', 'u-wairimu', 'u-miriam', { name: 'X', phone: '+254700000000' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.setTheEmergencyContact('org-1', 'u-joseph', 'u-miriam', { name: 'X', phone: '+254700000000' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.personCv.upsert).not.toHaveBeenCalled();
    expect(prisma.emergencyContact.upsert).not.toHaveBeenCalled();
  });

  it('a CV is a PDF or a Word file, and a contact has a name and a phone number', async () => {
    const { service } = aService();
    await expect(service.setTheCv('org-1', 'u-miriam', 'u-miriam', { buffer: Buffer.from('x'), size: 1, mimetype: 'image/png', originalname: 'me.png' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setTheEmergencyContact('org-1', 'u-miriam', 'u-miriam', { name: 'Esther' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an admin adds a Word CV, and Miriam saves her contact', async () => {
    const { service, prisma } = aService();
    await service.setTheCv('org-1', 'u-grace', 'u-miriam', { buffer: Buffer.from('PK'), size: 2, mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', originalname: 'Miriam.docx' } as any);
    expect(prisma.personCv.upsert.mock.calls[0][0].create).toMatchObject({ organizationId: 'org-1', userId: 'u-miriam', fileName: 'Miriam.docx', uploadedByUserId: 'u-grace' });
    await service.setTheEmergencyContact('org-1', 'u-miriam', 'u-miriam', { name: ' Esther  Wanjiku ', relationship: 'sister', phone: '+254 712 345 678' });
    expect(prisma.emergencyContact.upsert.mock.calls[0][0].create).toMatchObject({ name: 'Esther Wanjiku', relationship: 'sister', phone: '+254 712 345 678' });
  });

  it('somebody not in this organisation is not found, rather than served an empty row', async () => {
    await expect(aService().service.forReader('org-1', 'u-grace', 'u-stranger')).rejects.toThrow('That person is not in this organisation.');
  });
});
