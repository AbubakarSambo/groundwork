import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');
import { ConfigService } from '@nestjs/config';
import { documentWhereFor } from './who-can-see-a-document';
import { defaultVisibilityForUpload } from './a-document-is-context';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { RecordEntryType, EvidenceType } from '@prisma/client';
import { looksLikeAConversation, NOT_CONFIRMED } from './a-conversation-belongs-to-the-people-in-it';

const ALLOWED_MIME = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'text/x-markdown',
  'application/json',
  'application/xml',
  'text/xml',
  // Common code file mimetypes the browser may report; anything unmatched
  // that starts with 'text/' also falls through to plain-text handling below.
  'application/javascript',
  'text/javascript',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];
const TEXT_EXTRACTABLE = ['text/plain', 'text/csv', 'text/html', 'text/markdown', 'text/x-markdown', 'application/json', 'application/xml', 'text/xml', 'application/javascript', 'text/javascript'];
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * WHAT A BROWSER CALLS A FILE IS NOT WHAT THE FILE IS.
 *
 * `text/markdown` was on the allow-list and a Markdown file was still refused, because most
 * browsers report a `.md` upload as `application/octet-stream` or as an empty string - they only
 * know the extensions their own OS has registered. The allow-list was right about the format and
 * never saw it.
 *
 * So where the browser has told us nothing useful, the extension gets a say. Only for formats that
 * are plain text anyway: being wrong here costs a file that reads as gibberish, and being wrong the
 * other way costs somebody the upload with a message telling them the format is unsupported when
 * it is not.
 */
const UNHELPFUL_MIMES = ['', 'application/octet-stream', 'binary/octet-stream'];
const TEXT_EXTENSIONS = ['.md', '.markdown', '.txt', '.csv', '.json', '.xml', '.yml', '.yaml', '.log', '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rb', '.java', '.sql', '.sh'];

function looksLikeTextFromItsName(fileName: string): boolean {
  const lower = (fileName ?? '').toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** True for any mimetype we treat as plain readable text, including ones not
 * explicitly listed above (e.g. text/x-python, text/x-java - source code
 * variants browsers report inconsistently). */
function isPlainTextMime(mime: string): boolean {
  return TEXT_EXTRACTABLE.includes(mime) || mime.startsWith('text/');
}

const ASSESSMENT_PROMPT = `You are Groundwork, reviewing a document a party just uploaded to add context to their record.

Read the document content below and produce a short assessment in two parts:
1. "suggests": 2-4 bullet points on what this document suggests or reveals - concrete things it tells us, not a summary of its contents. Each bullet is one plain sentence.
2. "willDo": 1-3 bullet points on what Groundwork will do with this document - e.g. "hold this as evidence for the standards you described", "use this to check what the guide actually says", "keep this on record as the source for X". Be concrete and specific to this document, not generic.

Rules: no verdicts on the document's quality. No dashes of any kind. Straight quotes only. If the document is empty, unreadable, or irrelevant, say so plainly in "suggests" and leave "willDo" as a single item explaining nothing further will be done with it.`;

const ASSESSMENT_TOOL = {
  name: 'emit_document_assessment',
  description: 'Emit a short assessment of an uploaded document',
  input_schema: {
    type: 'object',
    properties: {
      suggests: { type: 'array', items: { type: 'string' }, description: '2-4 bullets on what the document suggests' },
      willDo: { type: 'array', items: { type: 'string' }, description: '1-3 bullets on what will be done with it' },
    },
    required: ['suggests', 'willDo'],
  },
};

const CLAIMS_EXTRACTION_PROMPT = `You are extracting structured claims from a document a party has uploaded before a check-in session.

Extract every concrete, verifiable claim - commitments made, asks raised, worries flagged, intentions stated, tensions described, and any defined success criteria. Skip preamble, small talk, and boilerplate.

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

function toDocShape(
  doc: { id: string; fileName: string; mimeType: string; createdAt: Date; assessment?: any; visibility?: any; participantId?: string | null },
  viewerParticipantId?: string,
) {
  return {
    id: doc.id,
    name: doc.fileName,
    mimeType: doc.mimeType,
    uploadedAt: doc.createdAt,
    assessment: doc.assessment ?? null,
    /*
     * WHOSE IT IS, because only the uploader may move it and the screen had no way to know.
     * A reader's list holds their own files AND everything OPEN, so a lead looking at a party's
     * shared brief was shown an enabled control that answered "Document not found" - the message
     * for a document that does not exist, said about one they were looking at.
     * Same rule as `visibility`: omitted rather than guessed when the column was not selected.
     */
    ...(doc.participantId !== undefined ? { mine: doc.participantId === viewerParticipantId } : {}),
    // Who can read it. Omitted rather than defaulted when the column was not
    // selected, so a screen cannot mistake "not asked" for "private".
    ...(doc.visibility !== undefined ? { visibility: doc.visibility } : {}),
  };
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AnthropicService))
    private anthropic: AnthropicService,
    private config: ConfigService,
  ) {}

  /**
   * Extract readable content from any supported file type. Images and
   * unreadable ("scanned") PDFs are read by Gemini vision directly rather
   * than a separate OCR step, so a photo, brochure, training deck page, or
   * scanned meeting notes page all come back as text Groundwork can reason
   * about.
   */
  private async extractContent(file: Express.Multer.File): Promise<string> {
    /* A file the browser could not name, whose extension says it is text, is read as text. */
    if (UNHELPFUL_MIMES.includes(file.mimetype ?? '') && looksLikeTextFromItsName(file.originalname)) {
      return file.buffer.toString('utf8');
    }
    if (file.mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: file.buffer });
      const text = await parser.getText().then((r) => r.text?.trim() ?? '').finally(() => parser.destroy());
      if (text) return text;
      // Scanned/image-only PDF: fall back to vision on the raw PDF bytes.
      return this.mediaToText(file.buffer, 'application/pdf', file.originalname);
    }
    if (file.mimetype === DOCX_MIME) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = result.value?.trim() ?? '';
      if (!text) throw new BadRequestException('Could not extract text from this Word document.');
      return text;
    }
    if (file.mimetype === XLSX_MIME) {
      return this.xlsxToText(file.buffer, file.originalname);
    }
    if ((IMAGE_MIMES as readonly string[]).includes(file.mimetype)) {
      return this.mediaToText(file.buffer, file.mimetype, file.originalname);
    }
    if (isPlainTextMime(file.mimetype)) {
      return file.buffer.toString('utf-8').trim();
    }
    return `[Attached: ${file.originalname} - text not extractable from this file type. The document is on record.]`;
  }

  /** Ask Gemini for a short "what this suggests / what we will do with it" read. */
  private async assessDocument(content: string, fileName: string): Promise<{ suggests: string[]; willDo: string[] } | null> {
    if (content.startsWith('[Attached:')) return null;
    try {
      const result = await this.anthropic.extract<{ suggests: string[]; willDo: string[] }>(
        ASSESSMENT_PROMPT,
        [{ role: 'user', content: `Document: "${fileName}"\n\n${content.slice(0, 12000)}` }],
        ASSESSMENT_TOOL,
      );
      if (!result?.suggests?.length) return null;
      return { suggests: result.suggests, willDo: result.willDo ?? [] };
    } catch (err: any) {
      this.logger.warn(`Assessment failed for "${fileName}": ${err?.message}`);
      return null;
    }
  }

  async upload(
    groundId: string,
    userId: string,
    file: Express.Multer.File,
    /*
     * WHETHER THEY CONFIRMED THE PEOPLE IN IT KNOW.
     *
     * Only ever read for something that looks like a record of a conversation. For a workplan or a
     * job description it is not asked and not stored, because there is nobody else in those.
     */
    consentConfirmed = false,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be under 10 MB');
    const browserWasNoHelp = UNHELPFUL_MIMES.includes(file.mimetype ?? '');
    const readableByName = browserWasNoHelp && looksLikeTextFromItsName(file.originalname);
    if (!ALLOWED_MIME.includes(file.mimetype) && !isPlainTextMime(file.mimetype) && !readableByName) {
      /*
       * NAMES THE FORMAT THAT WAS REFUSED AND THE ONES THAT WORK. "Unsupported file type" followed
       * by a list makes somebody check their file against nine entries to find out which rule they
       * broke. Slides are the common one and are genuinely not supported - saying so directly beats
       * leaving them to infer it.
       */
      const isSlides = /\.(pptx?|key|odp)$/i.test(file.originalname ?? '');
      throw new BadRequestException(
        isSlides
          ? 'Slides cannot be read yet. Export the deck as a PDF and attach that - it keeps the text and reads fine.'
          : 'That file type cannot be read. Accepted: PDF, Word, Excel, Markdown, plain text, CSV, HTML, code files, and images.',
      );
    }

    const participant = await this.assertParticipant(groundId, userId);
    const content = await this.extractContent(file);
    /*
     * A RECORD OF A CONVERSATION IS REFUSED UNTIL SOMEBODY CONFIRMS THE PEOPLE IN IT KNOW.
     *
     * Refused rather than kept pending: a transcript sitting in a database waiting for permission
     * is exactly the thing this is meant to prevent. The content is read to recognise the shape and
     * then dropped with the request - nothing is written.
     *
     * The check errs towards asking. Being asked about a strategy deck costs one click; a
     * transcript slipping through as an ordinary document costs somebody else their privacy.
     */
    const isConversation = looksLikeAConversation(file.originalname, content);
    if (isConversation && !consentConfirmed) throw new BadRequestException(NOT_CONFIRMED);

    const assessment = await this.assessDocument(content, file.originalname);

    const doc = await this.prisma.groundDocument.create({
      data: {
        groundId,
        participantId: participant.id,
        isConversation,
        /* Who said it, and when they said it. Null on anything that is not a conversation. */
        ...(isConversation ? { consentConfirmedAt: new Date(), consentConfirmedById: userId } : {}),
        // G24 rule 3: private unless somebody says otherwise. See
        // a-document-is-context.ts for why the lead is not an exception.
        visibility: defaultVisibilityForUpload(),
        fileName: file.originalname,
        mimeType: file.mimetype,
        content,
        assessment: assessment as any,
      },
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true },
    });

    // Extract structured claims from the document content and write them as
    // RecordEntry rows so they flow into the report corpus automatically.
    // Fire-and-forget - a failure here must not block the upload response.
    this.extractAndStoreClaims(content, participant.id, file.originalname).catch((err) =>
      this.logger.warn(`Claims extraction failed for doc ${doc.id}: ${err?.message}`),
    );

    return toDocShape(doc);
  }

  /** Update a document's assessment (user-corrected version). */
  async correctAssessment(groundId: string, docId: string, userId: string, assessment: { suggests: string[]; willDo: string[] }) {
    const participant = await this.assertParticipant(groundId, userId);
    const doc = await this.prisma.groundDocument.findFirst({ where: { id: docId, groundId, participantId: participant.id } });
    if (!doc) throw new NotFoundException('Document not found');
    const updated = await this.prisma.groundDocument.update({
      where: { id: docId },
      data: { assessment: assessment as any },
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true },
    });
    return toDocShape(updated);
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
      return lines.join('\n\n').trim() || `[Attached: ${fileName} - spreadsheet contained no readable data.]`;
    } catch {
      return `[Attached: ${fileName} - could not parse spreadsheet.]`;
    }
  }

  /**
   * Read an image or scanned PDF via Gemini vision (respondWithMedia) - the
   * same model that runs everything else in the product, rather than a
   * separate provider just for OCR.
   */
  private async mediaToText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    try {
      const base64 = buffer.toString('base64');
      const text = await this.anthropic.respondWithMedia(
        'You are extracting readable content from an uploaded file for a workplace record.',
        'Transcribe all text visible in this file. If it is a chart, diagram, spreadsheet, or slide, describe the key data points, labels, and values. If it is a photo with no text or data, say so briefly. Do not summarize - transcribe faithfully.',
        { mimeType, base64 },
      );
      return text || `[Attached: ${fileName} - contained no readable text or data.]`;
    } catch (err: any) {
      this.logger.warn(`Media extraction failed for ${fileName}: ${err?.message}`);
      return `[Attached: ${fileName} - could not be processed.]`;
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

  /**
   * WHAT THIS READER CAN SEE, WHICH USED TO BE ONE ANSWER FOR THREE QUESTIONS.
   *
   * `participantId: participant.id` meant every document was private to whoever
   * uploaded it - including from the lead. Nobody chose that; it is a participant
   * guard that ended up in a list query. Right for a participant's own evidence,
   * backwards for the lead's brief or a grant's terms, which reach nobody and are
   * exactly the things everybody should be working from.
   *
   * documentWhereFor answers it properly and carries the CONTEXT_ENABLED flag
   * inside it, so with the flag off this query is byte-for-byte the old one. See
   * who-can-see-a-document.ts.
   */
  async list(groundId: string, userId: string) {
    const participant = await this.assertParticipant(groundId, userId);
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true },
    });
    const docs = await this.prisma.groundDocument.findMany({
      where: documentWhereFor(
        groundId,
        { participantId: participant.id, isLead: ground?.initiatorId === userId },
        this.config.get<boolean>('app.contextEnabled') === true,
      ) as any,
      select: { id: true, fileName: true, mimeType: true, createdAt: true, visibility: true, participantId: true },
      orderBy: { createdAt: 'asc' },
    });
    return docs.map((d) => toDocShape(d, participant.id));
  }

  /** Upload a document from a pre-auth participant identified by invite token. */
  async uploadByInviteToken(token: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be under 10 MB');
    if (!ALLOWED_MIME.includes(file.mimetype) && !isPlainTextMime(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Accepted: PDF, TXT, CSV, HTML, code/text, DOCX, XLSX, JPEG, PNG, HEIC.');
    }

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { inviteToken: token },
    });
    if (!participant) throw new NotFoundException('Invite not found');

    const content = await this.extractContent(file);
    const assessment = await this.assessDocument(content, file.originalname);

    const doc = await this.prisma.groundDocument.create({
      data: {
        groundId: participant.groundId,
        participantId: participant.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        content,
        assessment: assessment as any,
      },
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true },
    });

    this.extractAndStoreClaims(content, participant.id, file.originalname).catch((err) =>
      this.logger.warn(`Claims extraction failed for doc ${doc.id}: ${err?.message}`),
    );

    return toDocShape(doc);
  }

  /**
   * MOVE A DOCUMENT BETWEEN OPEN AND PRIVATE. (G24 rule 3, G38)
   *
   * ONLY THE UPLOADER CAN. Not the lead, even for a document they can read. The
   * person who put a file somewhere decides who reads it, and the alternative -
   * a lead promoting somebody's private evidence into shared context - is the
   * single worst thing this feature could do. Nobody would attach anything
   * afterwards.
   *
   * CLOSED IS THE LEAD'S ONLY, AND THAT IS THE WHOLE OF THE RULE.
   *
   * It used to be unsettable by anyone, for a good reason that turned out to be a
   * reason about participants rather than about CLOSED: a participant moving their
   * own document to CLOSED would be handing it to the lead while believing they
   * had made it MORE private. That trap is real and the guard against it stays.
   *
   * It does not apply to the lead. "The lead's own material" read as a fact about
   * who uploaded a file, but OWN already covers that - a lead's upload is private
   * to them today. What CLOSED actually adds is the one case OWN cannot express:
   * material the lead keeps that a co-lead or org admin reading with the lead's
   * eyes may also read. So it is a state to switch into after all, for exactly one
   * person, and the check is on who is asking rather than on the value asked for.
   */
  async setVisibility(
    groundId: string,
    docId: string,
    userId: string,
    visibility: 'OPEN' | 'OWN' | 'CLOSED',
  ) {
    if (this.config.get<boolean>('app.contextEnabled') !== true) {
      throw new ForbiddenException('Context is not enabled on this deployment');
    }
    /*
     * The body is a plain type, not a validated DTO, so the string arrives unchecked. That was
     * harmless while both values were harmless; now that one of them decides who else can read a
     * file, an unrecognised value is refused here rather than handed to Prisma to reject.
     */
    if (visibility !== 'OPEN' && visibility !== 'OWN' && visibility !== 'CLOSED') {
      throw new BadRequestException('Unknown visibility');
    }
    const participant = await this.assertParticipant(groundId, userId);

    /*
     * Checked before the document is looked up, so a participant who guesses the value gets the
     * same refusal whether or not the id they sent is real.
     */
    if (visibility === 'CLOSED') {
      const ground = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { initiatorId: true },
      });
      if (ground?.initiatorId !== userId) {
        throw new ForbiddenException('Only the person running this check-in can keep a document to themselves');
      }
    }

    const doc = await this.prisma.groundDocument.findFirst({
      where: { id: docId, groundId, participantId: participant.id },
    });
    // Deliberately the same message whether it does not exist or is not theirs:
    // "not yours" tells somebody a document exists, which is itself a leak.
    if (!doc) throw new NotFoundException('Document not found');

    const updated = await this.prisma.groundDocument.update({
      where: { id: docId },
      data: { visibility: visibility as any },
      select: { id: true, visibility: true },
    });
    this.logger.log(`Document ${docId} on ground ${groundId} moved to ${visibility} by its uploader.`);
    return updated;
  }

  /**
   * DELIBERATELY UNCHANGED BY THE VISIBILITY WORK.
   *
   * Being able to READ a document is not being able to delete it. Once the lead
   * can see open context, the obvious next step is letting them tidy it up, and
   * that would mean somebody's evidence for their own account disappearing
   * without them doing it. Deletion stays with the uploader.
   */
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
    if (!ground) throw new NotFoundException('Check-in not found');
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not a party to this check-in');
    return participant;
  }
}
