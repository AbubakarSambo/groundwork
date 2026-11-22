import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  mayReadTheCv, mayChangeTheCv, mayReadTheEmergencyContact, mayChangeTheEmergencyContact,
  A_CV_MAY_BE, MOST_A_CV_MAY_WEIGH, NOT_A_CV, type Reader, type Subject,
} from './who-reads-a-persons-details';

const NOT_HERE = 'That person is not in this organisation.';
const CV_NOT_YOURS = 'Only the person, an admin, or the person they report to can open their CV.';
const NOT_YOURS_TO_CHANGE = 'Only the person or an admin can change this.';

export interface EmergencyContactIn { name?: unknown; relationship?: unknown; phone?: unknown }

/** A line typed in a box, trimmed and bounded; empty is nothing. */
function aLine(v: unknown, most: number): string | null {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return s ? s.slice(0, most) : null;
}

/**
 * A PERSON'S CV AND EMERGENCY CONTACT (Hafsah, 21 November 2026), read and written only here, through the rule in
 * who-reads-a-persons-details.ts. The CV is kept the way Groundwork already keeps an original file, its bytes in the database
 * beside its name and type (as `PrincipalMaterial` keeps a senior person's forwarded files), and read back as a download.
 * Both are per organisation, keyed by the organisation and the person, so the same person has their own in each.
 */
@Injectable()
export class PersonDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Who is reading, as the rule reads them: their role from their membership, and nobody's while they wait to be let in. */
  private async theReader(organizationId: string, userId: string): Promise<Reader> {
    const [m, u] = await Promise.all([
      this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { awaitingOrgApproval: true } }),
    ]);
    return { userId, role: u?.awaitingOrgApproval ? null : (m?.role ?? null) };
  }

  private async theSubject(organizationId: string, userId: string): Promise<Subject> {
    const m = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { reportsToUserId: true } });
    if (!m) throw new NotFoundException(NOT_HERE);
    return { userId, reportsToUserId: m.reportsToUserId ?? null };
  }

  /** What this reader may see of this person's details, and what they may change. Anything they may not see is not sent at all. */
  async forReader(organizationId: string, readerId: string, subjectId: string) {
    const [reader, subject] = await Promise.all([this.theReader(organizationId, readerId), this.theSubject(organizationId, subjectId)]);
    const readsCv = mayReadTheCv(reader, subject);
    const readsContact = mayReadTheEmergencyContact(reader, subject);
    const where = { organizationId_userId: { organizationId, userId: subjectId } };
    const [cv, contact] = await Promise.all([
      readsCv ? this.prisma.personCv.findUnique({ where, select: { fileName: true, size: true, uploadedAt: true } }) : null,
      readsContact ? this.prisma.emergencyContact.findUnique({ where, select: { name: true, relationship: true, phone: true } }) : null,
    ]);
    return {
      ...(readsCv ? { cv: cv ? { fileName: cv.fileName, size: cv.size, uploadedAt: cv.uploadedAt } : null } : {}),
      mayChangeCv: mayChangeTheCv(reader, subject),
      ...(readsContact ? { emergencyContact: contact ? { name: contact.name, relationship: contact.relationship, phone: contact.phone } : null } : {}),
      mayChangeEmergencyContact: mayChangeTheEmergencyContact(reader, subject),
    };
  }

  /** The CV itself, for a download. */
  async theCv(organizationId: string, readerId: string, subjectId: string) {
    const [reader, subject] = await Promise.all([this.theReader(organizationId, readerId), this.theSubject(organizationId, subjectId)]);
    if (!mayReadTheCv(reader, subject)) throw new ForbiddenException(CV_NOT_YOURS);
    const cv = await this.prisma.personCv.findUnique({ where: { organizationId_userId: { organizationId, userId: subjectId } } });
    if (!cv) throw new NotFoundException('There is no CV for this person yet.');
    return { fileName: cv.fileName, contentType: cv.mimeType, body: Buffer.from(cv.bytes) };
  }

  /** The person or an admin adds a CV, or replaces the one there. A PDF or a Word file, up to 10 MB. */
  async setTheCv(organizationId: string, readerId: string, subjectId: string, file: Express.Multer.File | undefined) {
    const [reader, subject] = await Promise.all([this.theReader(organizationId, readerId), this.theSubject(organizationId, subjectId)]);
    if (!mayChangeTheCv(reader, subject)) throw new ForbiddenException(NOT_YOURS_TO_CHANGE);
    if (!file?.buffer?.length || !A_CV_MAY_BE[file.mimetype]) throw new BadRequestException(NOT_A_CV);
    if (file.size > MOST_A_CV_MAY_WEIGH) throw new BadRequestException('That file is bigger than 10 MB. Add a smaller copy of the CV.');
    const fileName = (file.originalname ?? '').trim().slice(0, 200) || `CV.${A_CV_MAY_BE[file.mimetype]}`;
    const data = { fileName, mimeType: file.mimetype, bytes: file.buffer, size: file.size, uploadedByUserId: readerId, uploadedAt: new Date() };
    await this.prisma.personCv.upsert({
      where: { organizationId_userId: { organizationId, userId: subjectId } },
      create: { organizationId, userId: subjectId, ...data },
      update: data,
    });
    return this.forReader(organizationId, readerId, subjectId);
  }

  /** The person or an admin writes the emergency contact. All three boxes empty clears it. */
  async setTheEmergencyContact(organizationId: string, readerId: string, subjectId: string, body: EmergencyContactIn) {
    const [reader, subject] = await Promise.all([this.theReader(organizationId, readerId), this.theSubject(organizationId, subjectId)]);
    if (!mayChangeTheEmergencyContact(reader, subject)) throw new ForbiddenException(NOT_YOURS_TO_CHANGE);
    const name = aLine(body?.name, 120);
    const relationship = aLine(body?.relationship, 60);
    const phone = aLine(body?.phone, 40);
    const where = { organizationId_userId: { organizationId, userId: subjectId } };
    if (!name && !relationship && !phone) {
      await this.prisma.emergencyContact.deleteMany({ where: { organizationId, userId: subjectId } });
      return this.forReader(organizationId, readerId, subjectId);
    }
    if (!name || !phone) throw new BadRequestException('Give the emergency contact a name and a phone number.');
    if (!/^\+?[0-9][0-9 ()-]{5,}$/.test(phone)) throw new BadRequestException('That phone number does not look right. Write it with its country code, for example +254 712 345 678.');
    const data = { name, relationship, phone, updatedByUserId: readerId };
    await this.prisma.emergencyContact.upsert({ where, create: { organizationId, userId: subjectId, ...data }, update: data });
    return this.forReader(organizationId, readerId, subjectId);
  }
}

export { CV_NOT_YOURS };
