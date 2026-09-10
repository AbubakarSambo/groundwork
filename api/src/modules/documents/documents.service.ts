import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');
const JSZip = require('jszip') as typeof import('jszip');
import { ConfigService } from '@nestjs/config';
import { documentWhereFor, whoCanSeeItInWords } from './who-can-see-a-document';
import { defaultVisibilityForUpload } from './a-document-is-context';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { ConversationService } from '../conversation/conversation.service';
import { originFromTheFile, looksGeneratedByAModel, type DocumentOrigin } from './what-kind-of-thing-a-document-is';
import { DOCUMENT_ORIGIN_PROMPT, DOCUMENT_ORIGIN_SCHEMA, DESCRIPTION_CHECK_PROMPT, DESCRIPTION_CHECK_SCHEMA } from '../conversation/prompt-library';
import { RecordEntryType, EvidenceType } from '@prisma/client';
import { slidesInOrder, textFromOneSlide, deckToText } from './slides-are-mostly-headings';
import { looksLikeAConversation, THE_ASSUMPTION_WHEN_UPLOADING } from './a-conversation-belongs-to-the-people-in-it';
import { assertInviteLinkStillOpens } from '../participants/an-invite-link-still-opens';

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
  /* Decks. A roadmap or an architecture overview usually arrives as one. */
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];
const TEXT_EXTRACTABLE = ['text/plain', 'text/csv', 'text/html', 'text/markdown', 'text/x-markdown', 'application/json', 'application/xml', 'text/xml', 'application/javascript', 'text/javascript'];
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
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



function toDocShape(
  doc: { id: string; fileName: string; mimeType: string; createdAt: Date; assessment?: any; visibility?: any; participantId?: string | null },
  viewerParticipantId?: string,
  contextEnabled?: boolean,
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
    /*
     * AND THE SAME FACT AS A SENTENCE. `OWN` is a column value, not an answer to "who will read
     * this" — which is the only question somebody has at the moment they attach a contract. The
     * flag is passed in because with context off every document is private whatever the column
     * says, and a sentence that contradicted the read path would be worse than none.
     */
    ...(doc.visibility !== undefined
      ? { whoCanSeeIt: whoCanSeeItInWords(doc.visibility, contextEnabled === true) }
      : {}),
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
    @Inject(forwardRef(() => ConversationService))
    private conversation: ConversationService,
  ) {}

  /**
   * AN UPLOAD HAS TO CHANGE SOMETHING. The person's record lines are read against what they just
   * attached, so a line the document backs stops being recall. Best effort, after the row exists.
   */
  private anchorAfterUpload(participantId: string, groundId: string) {
    this.conversation.anchorRecordToDocuments(participantId, groundId).catch((err) =>
      this.logger.warn(`Anchoring after upload failed for participant ${participantId}: ${err?.message}`),
    );
  }

  /**
   * Extract readable content from any supported file type. Images and
   * unreadable ("scanned") PDFs are read by Gemini vision directly rather
   * than a separate OCR step, so a photo, brochure, training deck page, or
   * scanned meeting notes page all come back as text Groundwork can reason
   * about.
   */
  /**
   * SLIDE TEXT, IN SLIDE ORDER.
   *
   * A `.pptx` is a zip; every run of text on a slide is an `<a:t>` element in
   * `ppt/slides/slideN.xml`. No new parser, and nothing here reconstructs layout or reads speaker
   * notes - see slides-are-mostly-headings.ts for what it deliberately does not claim to do.
   */
  private async pptxToText(buffer: Buffer): Promise<string> {
    let zip: import('jszip');
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      throw new BadRequestException('That presentation could not be opened. If it is an older .ppt, save it as .pptx and try again.');
    }
    const slides = await Promise.all(
      slidesInOrder(Object.keys(zip.files)).map(async ({ name, number }) => ({
        number,
        text: textFromOneSlide((await zip.file(name)!.async('string')) ?? ''),
      })),
    );
    return deckToText(slides);
  }

  private async extractContent(file: Express.Multer.File): Promise<string> {
    /* A file the browser could not name, whose extension says it is text, is read as text. */
    if (UNHELPFUL_MIMES.includes(file.mimetype ?? '') && looksLikeTextFromItsName(file.originalname)) {
      return file.buffer.toString('utf8');
    }
    if (file.mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: file.buffer });
      const text = await parser.getText().then((r) => r.text?.trim() ?? '').finally(() => parser.destroy());
      /* A scanned PDF has a text layer of page markers and nothing else ("-- 1 of 1 --"), which is
         "text" to the parser. Driven with a scanned memo: it came back as that marker in 46ms and the
         vision fallback never ran. Substance, not presence, decides. */
      if (this.hasSubstance(text)) return text;
      this.lastPdfWasAScan = true;
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
    if (file.mimetype === PPTX_MIME || /\.pptx$/i.test(file.originalname ?? '')) {
      return this.pptxToText(file.buffer);
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
    /* What they want looked for in it, in their words. Kept exactly - see the schema note. */
    uploaderNote?: string,
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
      /*
       * .pptx is read now. The formats still refused are the ones nothing here can open: Keynote,
       * OpenDocument, and the pre-2007 binary .ppt. Each gets the way through rather than a list.
       */
      const isOtherSlides = /\.(ppt|key|odp)$/i.test(file.originalname ?? '');
      throw new BadRequestException(
        isOtherSlides
          ? 'That slide format cannot be read. Save or export it as .pptx or PDF and attach that - either keeps the text.'
          : 'That file type cannot be read. Accepted: PDF, Word, Excel, PowerPoint, Markdown, plain text, CSV, HTML, code files, and images.',
      );
    }

    const participant = await this.assertParticipant(groundId, userId);
    const content = await this.extractContent(file);
    /*
     * A RECORD OF A CONVERSATION IS TAKEN ON THE UPLOADER'S WORD, AND THE WORD IS STATED.
     *
     * This refused a transcript until `consentConfirmed` was sent - the person had to press a button
     * saying the people in it knew. Reversed by the product owner on 11 September 2026: nothing is
     * refused; the assumption is said instead, in the response, and shown to them. See
     * a-conversation-belongs-to-the-people-in-it.ts for the reasoning. The flag is still accepted so
     * no client breaks, and no longer read: uploading IS the confirmation, so the record of who and
     * when is stamped from the upload itself.
     */
    const isConversation = looksLikeAConversation(file.originalname, content);
    void consentConfirmed;

    const assessment = await this.assessDocument(content, file.originalname);
    const origin = await this.decideOrigin(file, content, isConversation);

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
        uploaderNote: uploaderNote?.trim() || null,
        content,
        assessment: assessment as any,
        origin,
      },
      /* `visibility` and `participantId` too — `toDocShape` omits what was not selected rather
         than guessing, so an upload that did not ask told the person who just attached a file
         everything except who is about to see it. */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, uploaderNote: true, visibility: true, participantId: true },
    });

    // Extract structured claims from the document content and write them as
    // RecordEntry rows so they flow into the report corpus automatically.
    // Fire-and-forget - a failure here must not block the upload response.
    if (uploaderNote?.trim()) this.checkDescription(doc.id).catch(() => null).then(() => this.anchorAfterUpload(participant.id, groundId));
    else this.anchorAfterUpload(participant.id, groundId);

    /* The uploader's own view of what they just attached, including who can see it. The flag is
       what documents.list already reads: with context off, everything is private to its uploader. */
    return {
      ...toDocShape(doc, doc.participantId ?? undefined, this.config.get<boolean>('app.contextEnabled') === true),
      /* Said back, so the screen can say it too. Absent on anything that is not a conversation. */
      ...(isConversation ? { assumed: THE_ASSUMPTION_WHEN_UPLOADING } : {}),
    };
  }

  /** Update a document's assessment (user-corrected version). */
  async correctAssessment(groundId: string, docId: string, userId: string, assessment: { suggests: string[]; willDo: string[] }) {
    const participant = await this.assertParticipant(groundId, userId);
    const doc = await this.prisma.groundDocument.findFirst({ where: { id: docId, groundId, participantId: participant.id } });
    if (!doc) throw new NotFoundException('Document not found');
    const updated = await this.prisma.groundDocument.update({
      where: { id: docId },
      data: { assessment: assessment as any },
      /* `visibility` and `participantId` too: `toDocShape` omits what was not selected rather
         than guessing, so an upload that did not ask for them told the person who just attached a
         file everything except who is about to see it. */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true },
    });
    /* Same flag, same reason: a corrected assessment must not come back relabelled private. */
    return toDocShape(updated, updated.participantId ?? undefined, this.config.get<boolean>('app.contextEnabled') === true);
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
  /** Set by extractContent when a PDF had no usable text layer, read once by the upload that called it. */
  private lastPdfWasAScan = false;

  private hasSubstance(text: string): boolean {
    const stripped = (text ?? '').replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').replace(/\s+/g, ' ').trim();
    return stripped.length >= 40;
  }

  /**
   * WHAT KIND OF THING THIS IS. The file type decides for images and scans; for text the content is
   * read, cheaply first and then by the model, so notes somebody generated with a model do not get
   * the standing of a contract. See what-kind-of-thing-a-document-is.ts.
   */
  private async decideOrigin(file: { mimetype: string; originalname: string }, content: string, isConversation: boolean): Promise<DocumentOrigin> {
    const fromFile = originFromTheFile(file.mimetype, file.originalname, { isConversation, pdfHadNoTextLayer: this.lastPdfWasAScan });
    this.lastPdfWasAScan = false;
    if (fromFile) return fromFile;
    if (content.startsWith('[Attached:')) return 'typed';
    const cheap = looksGeneratedByAModel(content);
    /* A 74-character offer letter stub came back "generated" from the model on one of three identical
       copies. Too short to judge is typed unless the text itself carries the tells. */
    if (content.trim().length < 400) return cheap ? 'generated' : 'typed';
    try {
      const read = await this.anthropic.extract<{ origin: DocumentOrigin; because: string }>(DOCUMENT_ORIGIN_PROMPT, [{ role: 'user', content: content.slice(0, 6000) }], DOCUMENT_ORIGIN_SCHEMA);
      if (read?.origin === 'generated' || cheap) return 'generated';
      if (read?.origin === 'pasted') return 'pasted';
    } catch (err: any) {
      this.logger.warn(`Origin read failed for "${file.originalname}": ${err?.message}`);
    }
    return cheap ? 'generated' : 'typed';
  }

  /**
   * DOES THE FILE READ AS THEY DESCRIBED IT. Run when a description exists: at upload if one came
   * with the file, and from the check-in when the person answers "what does this show". Stored on
   * the document. A mismatch backs nothing (anchoring skips it) and is put to the uploader as a
   * question in their next turn, never as a correction.
   */
  async checkDescription(docId: string): Promise<{ matches: boolean; reads: string } | null> {
    /* Not a card read: this feeds the check, not a list, so it selects the name under its own key rather than
       as `fileName`, which the-list-carries-what-was-read.spec treats as a card read. */
    const doc = await this.prisma.groundDocument.findUnique({ where: { id: docId }, select: { id: true, content: true, uploaderNote: true, fileName: true, assessment: true } });
    if (!doc?.uploaderNote?.trim() || doc.content.startsWith('[Attached:')) return null;
    try {
      const read = await this.anthropic.extract<{ matches: boolean; reads: string }>(
        DESCRIPTION_CHECK_PROMPT,
        [{ role: 'user', content: `THEY SAID IT IS: ${doc.uploaderNote.trim()}\n\nFILE "${doc.fileName}":\n${doc.content.slice(0, 8000)}` }],
        DESCRIPTION_CHECK_SCHEMA,
      );
      if (!read || typeof read.matches !== 'boolean') return null;
      const check = { matches: read.matches, reads: (read.reads ?? '').trim().slice(0, 300), checkedAt: new Date().toISOString() };
      await this.prisma.groundDocument.update({ where: { id: docId }, data: { descriptionCheck: check as any } });
      this.logger.log(`description-check doc=${docId} matches=${check.matches} said=${JSON.stringify(doc.uploaderNote.trim().slice(0, 120))} reads=${JSON.stringify(check.reads)}`);
      return check;
    } catch (err: any) {
      this.logger.warn(`Description check failed for ${docId}: ${err?.message}`);
      return null;
    }
  }

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

  /*
   * THERE USED TO BE A WRITER HERE, extractAndStoreClaims, and it was a category error. It read the
   * uploaded document and wrote the document's own claims into record_entries under the uploader's
   * participantId, with no check-in, marked document-backed. A document then backed lines the
   * document itself had written, and those 23 rows were the entire documented count before
   * anchoring existed. Everything downstream read them as things a person had said. The writer is
   * gone and its rows were purged; the document's content reaches the record only through
   * anchorRecordToDocuments, which backs what a PERSON said with what a DOCUMENT says.
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
      /*
       * `assessment` TOO, WHICH THE LIST HAS NEVER ASKED FOR.
       *
       * Every upload is read and assessed, the result is stored on the row, and the upload RESPONSE
       * carries it - so the person who has just attached a file sees what was read from it, and
       * then it disappears the moment the page reloads, because the list that draws the same cards
       * never selected the column. `toDocShape` omits what was not selected rather than guessing,
       * so nothing broke and nothing said anything: the card became a filename and a date, and a
       * person could not tell their document had been read at all.
       *
       * Found by putting the read on the card and watching it not appear.
       */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true },
      orderBy: { createdAt: 'asc' },
    });
    /*
     * THE FLAG, WHICH THE LIST HAS NEVER PASSED.
     *
     * `whoCanSeeIt` is the sentence a person reads beside their document, and with the flag absent
     * it defaults to the flag-off truth: "Only you can see this. Nobody else on the check-in can
     * open it." Said about an OPEN document - one the lead deliberately shared with everybody -
     * which the same query had just handed to somebody who is not its uploader. So the row a
     * participant reads told her a document her lead had shared with the whole check-in was private
     * to her, and she would never think to mention it.
     *
     * The upload path has always passed it, so a document was described correctly at the moment it
     * was attached and mislabelled on every page load after. The same shape as the assessment the
     * list forgot to select, in the same function, found the same way.
     */
    return docs.map((d) => toDocShape(d, participant.id, this.config.get<boolean>('app.contextEnabled') === true));
  }

  /** Upload a document from a pre-auth participant identified by invite token. */
  async uploadByInviteToken(token: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be under 10 MB');
    if (!ALLOWED_MIME.includes(file.mimetype) && !isPlainTextMime(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Accepted: PDF, TXT, CSV, HTML, code/text, DOCX, XLSX, JPEG, PNG, HEIC.');
    }

    /*
     * THE SAME DOOR AS THE SIGNED-IN UPLOAD, WITH THE SAME QUESTIONS.
     *
     * This looked the token up bare - no expiry, no single-use - so an invite email from months ago
     * still attached files to the ground; and it asked none of what the signed-in path asks, so a
     * transcript arrived with no record that it was one, no visibility, and nobody's word behind it.
     * The token rule is the invitation's (an-invite-link-still-opens.ts). The conversation check and
     * the stated assumption are the upload's. The token no longer travels in the query string, where
     * it landed in every access log on the path: see the controller.
     */
    const participant = assertInviteLinkStillOpens(
      await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } }),
    );

    const content = await this.extractContent(file);
    const isConversation = looksLikeAConversation(file.originalname, content);
    const assessment = await this.assessDocument(content, file.originalname);
    const origin = await this.decideOrigin(file, content, isConversation);

    const doc = await this.prisma.groundDocument.create({
      data: {
        groundId: participant.groundId,
        participantId: participant.id,
        isConversation,
        /* Taken on the word of whoever holds the invitation; they have no account yet, so no user id. */
        ...(isConversation ? { consentConfirmedAt: new Date(), consentConfirmedById: participant.userId ?? null } : {}),
        visibility: defaultVisibilityForUpload(),
        fileName: file.originalname,
        mimeType: file.mimetype,
        content,
        assessment: assessment as any,
        origin,
      },
      /* `visibility` and `participantId` too: `toDocShape` omits what was not selected rather
         than guessing, so an upload that did not ask for them told the person who just attached a
         file everything except who is about to see it. */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true },
    });

    this.anchorAfterUpload(participant.id, participant.groundId);

    /* The uploader's own view of what they just attached, including who can see it. The flag is
       what documents.list already reads: with context off, everything is private to its uploader. */
    return {
      ...toDocShape(doc, doc.participantId ?? undefined, this.config.get<boolean>('app.contextEnabled') === true),
      /* Said back, so the screen can say it too. Absent on anything that is not a conversation. */
      ...(isConversation ? { assumed: THE_ASSUMPTION_WHEN_UPLOADING } : {}),
    };
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
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    return participant;
  }
}
