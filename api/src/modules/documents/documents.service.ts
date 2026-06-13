import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const TEXT_EXTRACTABLE = ['application/pdf', 'text/plain', 'text/csv'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function toDocShape(doc: { id: string; fileName: string; mimeType: string; createdAt: Date }) {
  return { id: doc.id, name: doc.fileName, mimeType: doc.mimeType, uploadedAt: doc.createdAt };
}

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async upload(groundId: string, userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be under 10 MB');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Accepted: PDF, TXT, CSV, DOCX, XLSX, JPEG, PNG.');
    }

    const participant = await this.assertParticipant(groundId, userId);

    let content: string;
    if (file.mimetype === 'application/pdf') {
      const result = await pdfParse(file.buffer);
      content = result.text?.trim() ?? '';
      if (!content) throw new BadRequestException('Could not extract text from this PDF. Make sure it is not a scanned image.');
    } else if (TEXT_EXTRACTABLE.includes(file.mimetype)) {
      content = file.buffer.toString('utf-8').trim();
    } else {
      content = `[Attached: ${file.originalname} — text not extractable from this file type. The document is on record.]`;
    }

    const doc = await this.prisma.groundDocument.create({
      data: {
        groundId,
        participantId: participant.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        content,
      },
      select: { id: true, fileName: true, mimeType: true, createdAt: true },
    });
    return toDocShape(doc);
  }

  async list(groundId: string, userId: string) {
    const participant = await this.assertParticipant(groundId, userId);
    const docs = await this.prisma.groundDocument.findMany({
      where: { groundId, participantId: participant.id },
      select: { id: true, fileName: true, mimeType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return docs.map(toDocShape);
  }

  async remove(groundId: string, docId: string, userId: string) {
    const participant = await this.assertParticipant(groundId, userId);
    const doc = await this.prisma.groundDocument.findFirst({
      where: { id: docId, groundId, participantId: participant.id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.groundDocument.delete({ where: { id: docId } });
    return { deleted: true };
  }

  private async assertParticipant(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    return participant;
  }
}
