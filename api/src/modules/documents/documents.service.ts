import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { RecordEntryType, EvidenceType } from '@prisma/client';

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
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const CLAIMS_EXTRACTION_PROMPT = `You are extracting structured claims from a document a party has uploaded before a check-in session.

Extract every concrete, verifiable claim — commitments made, asks raised, worries flagged, intentions stated, tensions described, and any defined success criteria. Skip preamble, small talk, and boilerplate.

For each claim:
- "text": the person's exact words or a minimal faithful paraphrase (1–2 sentences max)
- "type": one of COMMITMENT, ASK, WORRY, INTENT, TENSION, SUCCESS_DEFINITION

Only extract claims that are specific enough to be verified or tracked over time. Skip vague statements.`;

const CLAIMS_TOOL = {
  name: 'extract_claims',
  description: 'Extract structured record-worthy claims from a document',
  input_schema: {
    type: 'object',
    properties: {
      claims: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            type: { type: 'string', enum: ['COMMITMENT', 'ASK', 'WORRY', 'INTENT', 'TENSION', 'SUCCESS_DEFINITION'] },
          },
          required: ['text', 'type'],
        },
      },
    },
    required: ['claims'],
  },
};

function toDocShape(doc: { id: string; fileName: string; mimeType: string; createdAt: Date }) {
  return { id: doc.id, name: doc.fileName, mimeType: doc.mimeType, uploadedAt: doc.createdAt };
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private rawClient: Anthropic;

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicService,
    private config: ConfigService,
  ) {
    this.rawClient = new Anthropic({ apiKey: this.config.get<string>('anthropic.apiKey') });
  }

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
    } else if (file.mimetype === DOCX_MIME) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      content = result.value?.trim() ?? '';
      if (!content) throw new BadRequestException('Could not extract text from this Word document.');
    } else if (TEXT_EXTRACTABLE.includes(file.mimetype)) {
      content = file.buffer.toString('utf-8').trim();
    } else if (file.mimetype === XLSX_MIME) {
      content = this.xlsxToText(file.buffer, file.originalname);
    } else if ((IMAGE_MIMES as readonly string[]).includes(file.mimetype)) {
      content = await this.imageToText(file.buffer, file.mimetype as typeof IMAGE_MIMES[number], file.originalname);
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

    // Extract structured claims from the document content and write them as
    // RecordEntry rows so they flow into the report corpus automatically.
    // Fire-and-forget — a failure here must not block the upload response.
    this.extractAndStoreClaims(content, participant.id, file.originalname).catch((err) =>
      this.logger.warn(`Claims extraction failed for doc ${doc.id}: ${err?.message}`),
    );

    return toDocShape(doc);
  }

  private xlsxToText(buffer: Buffer, fileName: string): string {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const lines: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        lines.push(`--- Sheet: ${sheetName} ---`);
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        lines.push(csv.trim());
      }
      return lines.join('\n\n').trim() || `[Attached: ${fileName} — spreadsheet contained no readable data.]`;
    } catch {
      return `[Attached: ${fileName} — could not parse spreadsheet.]`;
    }
  }

  private async imageToText(buffer: Buffer, mimeType: 'image/jpeg' | 'image/png' | 'image/webp', fileName: string): Promise<string> {
    try {
      const base64 = buffer.toString('base64');
      const res = await this.rawClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: base64 },
              },
              {
                type: 'text',
                text: 'Transcribe all text visible in this image. If it is a chart or diagram, describe the key data points, labels, and values. If it is a photo with no text or data, say so briefly.',
              },
            ],
          },
        ],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return text || `[Attached: ${fileName} — image contained no readable text or data.]`;
    } catch (err: any) {
      this.logger.warn(`Image extraction failed for ${fileName}: ${err?.message}`);
      return `[Attached: ${fileName} — image could not be processed.]`;
    }
  }

  private async extractAndStoreClaims(content: string, participantId: string, fileName: string): Promise<void> {
    // Skip placeholder content for non-extractable file types
    if (content.startsWith('[Attached:')) return;

    const truncated = content.slice(0, 12000); // keep within a reasonable token budget

    const result = await this.anthropic.extract<{ claims: { text: string; type: string }[] }>(
      CLAIMS_EXTRACTION_PROMPT,
      [{ role: 'user', content: `Document: "${fileName}"\n\n${truncated}` }],
      CLAIMS_TOOL,
    );

    if (!result?.claims?.length) return;

    const VALID_TYPES = new Set(Object.values(RecordEntryType));
    const entries = result.claims
      .filter((c) => c.text?.trim() && VALID_TYPES.has(c.type as RecordEntryType))
      .map((c) => ({
        participantId,
        type: c.type as RecordEntryType,
        evidenceType: EvidenceType.DOCUMENT_AT_AGREEMENT,
        text: c.text.trim(),
        recallBased: false,
      }));

    if (entries.length) {
      await this.prisma.recordEntry.createMany({ data: entries });
      this.logger.log(`Extracted ${entries.length} claims from "${fileName}" for participant ${participantId}`);
    }
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

  /** Upload a document from a pre-auth participant identified by invite token. */
  async uploadByInviteToken(token: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be under 10 MB');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Accepted: PDF, TXT, CSV, DOCX, XLSX, JPEG, PNG.');
    }

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { inviteToken: token },
    });
    if (!participant) throw new NotFoundException('Invite not found');

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
        groundId: participant.groundId,
        participantId: participant.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        content,
      },
      select: { id: true, fileName: true, mimeType: true, createdAt: true },
    });
    return toDocShape(doc);
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
