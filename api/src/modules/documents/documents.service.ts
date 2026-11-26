import { fileTheProofOnItsItem } from './proof-filed-on-its-item';
import { theNumberAsWritten, theSameWords } from '../grounds/a-dump-is-many-things';
import { theFigureAsWritten } from './a-number-keeps-its-unit';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string; total?: number }>; destroy: () => Promise<void> } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');
const JSZip = require('jszip') as typeof import('jszip');
import { ConfigService } from '@nestjs/config';
import { documentWhereFor, whoCanSeeItInWords } from './who-can-see-a-document';
import { defaultVisibilityForUpload } from './a-document-is-context';
import { ALocationPin, aLocationPinOnTheRecord, aLocationPinsName } from './a-location-pin';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { ConversationService } from '../conversation/conversation.service';
import { originFromTheFile, looksGeneratedByAModel, type DocumentOrigin } from './what-kind-of-thing-a-document-is';
import { DOCUMENT_ORIGIN_PROMPT, DOCUMENT_ORIGIN_SCHEMA, DESCRIPTION_CHECK_PROMPT, DESCRIPTION_CHECK_SCHEMA } from '../conversation/prompt-library';
import { CheckInStatus, DocumentVisibility, RecordEntryType } from '@prisma/client';
import { textFromOneSlide, deckToText } from './slides-are-mostly-headings';
import { slidesOfADeck } from './a-file-as-cells';
import { looksLikeAConversation, THE_ASSUMPTION_WHEN_UPLOADING } from './a-conversation-belongs-to-the-people-in-it';
import { aReceiptOrAnInvoice } from './a-receipt-is-not-a-conversation';
import { weCouldNotReadIt } from './a-document-we-could-not-read-is-not-a-source';
import { withoutBankDetails, HIDDEN } from './bank-details-are-never-kept';
import { withThePages, aDocumentReadItemByItem } from './a-document-read-item-by-item';
import { familyFor, BoardFamily } from '../board/board-families';
import { AgreementsService } from '../alignment/agreements.service';
import {
  TERMS_IN_A_DOCUMENT_PROMPT, TERMS_IN_A_DOCUMENT_SCHEMA, theTermsInIt,
} from '../alignment/the-agreement-arrives-as-a-document';
import { assertInviteLinkStillOpens } from '../participants/an-invite-link-still-opens';
import {
  WHAT_A_DOCUMENT_HOLDS_PROMPT, WHAT_A_DOCUMENT_HOLDS_SCHEMA,
  theContextWeHave, theDocumentLine, BANK_DETAILS_LEFT_OUT, whoThisNameIs, theNameWeUseFor, aSentence, type WhatADocumentHolds, type WhatLanded,
} from './what-a-document-holds';
import { whatADocumentSays, notReadWholeYet, readTheWholeOfIt, whileItIsRead, inTurn, type ADocumentsText } from './what-a-document-says';
import { MOST_A_FILE_MAY_WEIGH, A_FILE_TOO_LARGE } from '../../common/the-most-a-file-may-weigh';

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
/** Pages of a scan read by sight in one call: what one answer holds whole, with room to spare. */
const PAGES_READ_BY_SIGHT_AT_ONCE = 8;

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

/*
 * WHAT A DOCUMENT IS, NEVER WHO ADDED IT (release test, 22 November 2026, evening, bug 16). Amani, a sales rep, added Mama Njeri Duka's
 * signed order form in her check-in, and the card read "It looks like you run a shop called Mama Njeri Duka in Kilimani" and "We will use
 * this to verify your trading address". The model was told only that "a party" uploaded it "to their record", so it read the person who
 * added it as the business on it, and it was asked what Groundwork will do without being told what Groundwork does, so it made that up.
 */
const ASSESSMENT_PROMPT = `You are Groundwork. A person on a team just added this document, often in their check-in, as context or as proof for their work. You speak to that person as "you".

A document is often about somebody else: a customer, a client, a supplier or another business. Never take the person who added it to be the business, shop or person the document names, and never say "you run" or "your business" about what it names.

Read the document content below and produce a short assessment in two parts:
1. "suggests": 2-4 points. The first says what the document is and who it is from or about, for example "This is a signed order from Juja Hardware for 30 water dispensers.". The rest say the concrete things it shows, not a summary of its contents. Each point is one plain sentence.
2. "willDo": 1-3 points on what Groundwork will do with it, only from what Groundwork does with a document: keep it on record beside what you said, check what you said against it, and, where it is an order, a payment or a quote, keep it as proof for the sale or the work it is about. Never say it will do anything else, such as verify an address or a relationship.

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



export function toDocShape(
  doc: { id: string; fileName: string; mimeType: string; createdAt: Date; assessment?: any; visibility?: any; participantId?: string | null; holds?: any; uploaderNote?: string | null },
  viewerParticipantId?: string,
  contextEnabled?: boolean,
) {
  return {
    id: doc.id,
    name: doc.fileName,
    mimeType: doc.mimeType,
    uploadedAt: doc.createdAt,
    assessment: doc.assessment ?? null,
    /* WHAT IT HOLDS, ON THE CARD. Read once at upload and kept, so the Context tab says the same
       sentence the chat said rather than a filename and a date. See what-a-document-holds. */
    holds: doc.holds ?? null,
    theContextWeHave: doc.holds ? theContextWeHave(doc.holds as any, { reader: { participantId: viewerParticipantId } }) : null,
    /* Its first line, one field: a page that already names the document shows the block without it (theDocumentLine). */
    theDocumentLine: doc.holds ? theDocumentLine((doc.holds as any).fileName, (doc.holds as any).whatItIs) : null,
    /* The same sentence with the question on it, for the conversation that is waiting on the read. */
    askingAboutIt: doc.holds ? theContextWeHave(doc.holds as any, { asking: true, willNoteIt: { visibility: (doc as any).visibility }, reader: { participantId: viewerParticipantId } }) : null,
    /* ITEM BY ITEM, WITH PAGES (week 14, request 6c): what it took, and what it left out and why.
       Served on the same rows as `holds`, so to exactly the people who may see this document. */
    read: aDocumentReadItemByItem(doc.holds as any),
    /* Null holds on a row that has only just arrived means the read is still running, and the page
       says so rather than showing a file that looks like it was ignored. */
    stillReading: !doc.holds && Date.now() - new Date(doc.createdAt).getTime() < 3 * 60_000,
    /*
     * WHOSE IT IS, because only the uploader may move it and the screen had no way to know.
     * A reader's list holds their own files AND everything OPEN, so a lead looking at a party's
     * shared brief was shown an enabled control that answered "Document not found" - the message
     * for a document that does not exist, said about one they were looking at.
     * Same rule as `visibility`: omitted rather than guessed when the column was not selected.
     */
    ...(doc.participantId !== undefined ? { mine: doc.participantId === viewerParticipantId } : {}),
    /*
     * AND WHOSE IT IS, for the person's own files and for files shared with everyone in the check-in, so the Context
     * tab can list each under the person who sent it (night quality run 1: Amina's WhatsApp photo and pin were on the
     * check-in and her files still read "Nothing attached yet", because no row said whose it was). A file shared with
     * everyone is read by everyone here with who sent it (Hafsah, 12 October 2026); a private one names nobody else.
     */
    ...(doc.participantId !== undefined && (doc.participantId === viewerParticipantId || doc.visibility === 'OPEN')
      ? { participantId: doc.participantId }
      : {}),
    /*
     * WHAT THE UPLOADER SAID IT IS FOR, TO THE UPLOADER ONLY.
     *
     * They wrote it as an instruction to the check-in ("what should it be used for?"), not as a
     * line for everybody else to read, so a shared document does not carry it to anyone else.
     * Omitted when the column was not selected or the reader is not the uploader.
     */
    ...(doc.uploaderNote !== undefined && doc.participantId !== undefined && !!viewerParticipantId && doc.participantId === viewerParticipantId
      ? { usedFor: doc.uploaderNote?.trim() || null }
      : {}),
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

/** Said when a file called a PDF cannot be opened as one (pilots, problem 12). */
export const A_PDF_WE_CANNOT_OPEN = 'This PDF could not be opened, so nothing in it was read and nothing was kept. It may be damaged, or it may not really be a PDF. Save it again as a PDF and add it once more.';

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
    /* Last on purpose: the four before it are bound positionally in two specs, and moving any of
       them would rebind a mock to the wrong parameter silently. */
    private readonly agreements: AgreementsService,
  ) {}

  /**
   * AN UPLOAD HAS TO CHANGE SOMETHING. The person's record lines are read against what they just
   * attached, so a line the document backs stops being recall. Best effort, after the row exists.
   */
  /*
   * ONCE, NOT TWICE (2 November 2026). An upload while their check-in is open is read at that check-in's close, which reads every
   * line against every document once the check-in's own lines exist (readTheLinesJustWritten), so it is not read here as well.
   * An upload with no check-in open, such as on the Context tab, is read now.
   */
  private anchorAfterUpload(participantId: string, groundId: string) {
    Promise.resolve(this.prisma.checkIn?.findFirst?.({ where: { participantId, status: CheckInStatus.IN_PROGRESS }, select: { id: true } }))
      .catch(() => null)
      .then((open) => (open ? undefined : this.conversation.anchorRecordToDocuments(participantId, groundId)))
      .catch((err) => this.logger.warn(`Anchoring after upload failed for participant ${participantId}: ${err?.message}`));
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
    /* In the order the deck shows them (presentation.xml), numbered by that order, so "Slide 4" is the fourth slide a person sees even after
       slides were moved (Dangote brief, change 1: a change is cited by its slide). */
    const slides = await Promise.all(
      (await slidesOfADeck(zip)).map(async ({ name, number }) => ({
        number,
        text: textFromOneSlide((await zip.file(name)!.async('string')) ?? ''),
      })),
    );
    return deckToText(slides);
  }

  /**
   * A FILE READ DURING SETUP, BEFORE ANY CHECK-IN EXISTS (a new company's lead, 26 October 2026: "the lead couldn't upload docs"). The
   * same reading every upload gets (PDF, Word, Excel, PowerPoint, photos, text), for the person signed in, and nothing is stored. Bank details are hidden
   * the same way as every upload, and the text goes back to the setup conversation, which reads it and says what it found.
   */
  async readForSetup(file: Express.Multer.File | undefined): Promise<{ name: string; text: string }> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file to add.');
    const text = (await this.extractContent(file)).trim();
    if (!text) throw new BadRequestException('Nothing could be read from that file. Paste the text instead.');
    /* A long file is read whole here, while they wait, because nothing is kept to read it later (what-a-document-says). */
    const whole = await readTheWholeOfIt(this.anthropic, text, file.originalname).catch(() => null);
    return { name: file.originalname, text: whatADocumentSays({ content: text, synthesis: whole }) };
  }

  /**
   * THE TEXT OF A FILE, WITH ITS BANK DETAILS ALREADY GONE.
   *
   * Every path that stores a document or hands its text to a model starts here: an upload, an
   * invite-link upload, the developer API's upload and a WhatsApp attachment all go through
   * `upload` or `uploadByInviteToken`, and both read the file only through this. So an account or
   * card number is replaced before the row is written, and before the origin, the assessment, what
   * it holds, the terms in it and the anchoring are ever asked for. A photo or a scan is the vision
   * model's transcription, hidden the same way before anything else reads it. See
   * bank-details-are-never-kept.
   */
  /**
   * THE TEXT OF A FILE THAT HAS NO CHECK-IN TO GO IN (executive-onboarding: what a senior person forwards before anything is open). It is read by
   * the same code an upload is, so bank details are left out here as they are there, and a file that cannot be read says why in plain words
   * and never throws. The original is kept by the caller, never here.
   */
  async readForMaterial(file: { originalname: string; mimetype: string; buffer: Buffer }): Promise<{ text: string } | { unreadable: string }> {
    try {
      const text = (await this.extractContent(file as Express.Multer.File)).trim();
      if (!text || /^\[Attached: /.test(text)) return { unreadable: 'it is a kind of file I cannot read the words of yet' };
      return { text };
    } catch {
      /* The exception's own words are written for the screen that uploaded the file, not for the middle of a sentence. */
      return { unreadable: 'it would not open' };
    }
  }

  private async extractContent(file: Express.Multer.File): Promise<string> {
    return withoutBankDetails(await this.readTheText(file));
  }

  private async readTheText(file: Express.Multer.File): Promise<string> {
    /* A file the browser could not name, whose extension says it is text, is read as text. */
    if (UNHELPFUL_MIMES.includes(file.mimetype ?? '') && looksLikeTextFromItsName(file.originalname)) {
      return file.buffer.toString('utf8');
    }
    if (file.mimetype === 'application/pdf') {
      /*
       * A BROKEN PDF IS SAID IN PLAIN WORDS, NEVER A SERVER ERROR (pilots, 13 October 2026, problem 12). A .pdf whose body
       * was not a PDF threw "Invalid PDF structure" out of the parser, and the person read "Something went wrong on our side".
       */
      let text: string;
      let pages = 0;
      try {
        const parser = new PDFParse({ data: file.buffer });
        text = await parser.getText().then((r) => { pages = Number(r.total ?? 0); return r.text?.trim() ?? ''; }).finally(() => parser.destroy());
      } catch {
        throw new BadRequestException(A_PDF_WE_CANNOT_OPEN);
      }
      /* A scanned PDF has a text layer of page markers and nothing else ("-- 1 of 1 --"), which is
         "text" to the parser. Driven with a scanned memo: it came back as that marker in 46ms and the
         vision fallback never ran. Substance, not presence, decides. */
      if (this.hasSubstance(text)) return text;
      this.lastPdfWasAScan = true;
      return this.mediaToText(file.buffer, 'application/pdf', file.originalname, pages);
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
  /**
   * Read the terms out of an uploaded agreement, on a ground that is about one.
   *
   * ONLY ON AN AGREEMENT GROUND. Every situation has documents in it, and a brief, a plan or a job
   * description is not a contract. Reading terms out of one would put clause numbers next to
   * sentences nobody agreed to.
   *
   * A document with no terms in it is the common case even here - a covering email, a schedule of
   * figures, a signed page. `theTermsInIt` returns nothing and nothing is written.
   */
  private async readTheAgreementInIt(groundId: string, doc: ADocumentsText) {
    const content = String(doc.content ?? '');
    if (!content.trim()) return;
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { scenario: true, organizationId: true, label: true },
    });
    if (!ground || familyFor(ground.scenario) !== BoardFamily.AGREEMENT) return;

    const said = await this.anthropic.extract<{ terms?: unknown }>(
      TERMS_IN_A_DOCUMENT_PROMPT,
      [{ role: 'user', content: whatADocumentSays(doc) }],
      TERMS_IN_A_DOCUMENT_SCHEMA as any,
    );
    const terms = theTermsInIt(said ?? null, content);
    if (!terms.length) return;

    const out = await this.agreements.fromADocument(
      ground.organizationId, groundId, ground.label ?? 'The agreement', terms,
    );
    this.logger?.log?.(`Read ${out.wrote} term(s) from a document on ${groundId}${out.why ? ` (${out.why})` : ''}.`);
  }

  private async assessDocument(content: string, fileName: string, synthesis: string | null = null): Promise<{ suggests: string[]; willDo: string[] } | null> {
    if (weCouldNotReadIt(content)) return null;
    try {
      const result = await this.anthropic.extract<{ suggests: string[]; willDo: string[] }>(
        ASSESSMENT_PROMPT,
        [{ role: 'user', content: `Document: "${fileName}"\n\n${whatADocumentSays({ content, synthesis })}` }],
        ASSESSMENT_TOOL,
      );
      if (!result?.suggests?.length) return null;
      /*
       * A FULL SENTENCE, EVEN WHEN THE MODEL HANDS BACK A FRAGMENT. Asked for "one plain sentence" per
       * bullet, but a bare noun phrase ("Higher marketing spend than budgeted") still gets through
       * sometimes, and the Context page joins these bullets straight after each other with nothing
       * between them - a fragment there reads the same wrong way "whatItIs" used to. The same
       * deterministic guard is used here, in code, rather than trusted to the model alone.
       */
      const asSentences = (xs: string[]): string[] => xs.map((x) => aSentence(x)).filter((x): x is string => !!x);
      return { suggests: asSentences(result.suggests), willDo: asSentences(result.willDo ?? []) };
    } catch (err: any) {
      this.logger.warn(`Assessment failed for "${fileName}": ${err?.message}`);
      return null;
    }
  }

  /**
   * THE TEXT OF A FILE, AND NOTHING KEPT (fix list, item 3). For an admin's document for the whole organisation, read
   * through Ask: the same checks and the same reading as an upload to a check-in, with no row written. What happens to
   * the words is the caller's, and is said back before anything is kept.
   */
  async textOutOf(file: Express.Multer.File): Promise<string> {
    this.refuseWhatCannotBeRead(file);
    return (await this.extractContent(file)) ?? '';
  }

  /** What every upload refuses before reading: no file, too large, or a kind of file nothing here can open. */
  private refuseWhatCannotBeRead(file: Express.Multer.File): void {
    if (!file) throw new BadRequestException('No file came through, so choose a file and try again.');
    if (file.size > MOST_A_FILE_MAY_WEIGH) throw new BadRequestException(A_FILE_TOO_LARGE);
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
    /*
     * SENT IN REPLY DURING A WHATSAPP CHECK-IN (Hafsah, 11 October 2026): sending it there is the person
     * choosing to share it, so it is kept already opened to the check-in, the same state an app upload
     * reaches when its uploader opens it. Never set by the app's upload, which keeps the private default.
     */
    opts: { sharedWithTheCheckIn?: boolean; fromTheCheckIn?: boolean } = {},
  ) {
    this.refuseWhatCannotBeRead(file);

    const uploadStartedAt = Date.now();
    const participant = await this.assertParticipant(groundId, userId);
    const contentStartedAt = Date.now();
    const content = await this.extractContent(file);
    this.logger?.log?.(`Took the text out of ${JSON.stringify(file.originalname)} in ${Date.now() - contentStartedAt}ms.`);
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

    /*
     * NOBODY WAITS FOR A MODEL TO FINISH READING THEIR FILE.
     *
     * Measured on 23 September 2026, because "it feels slow" is not a measurement: an upload took
     * 20.2 seconds to answer. Ten milliseconds of that was taking the text out of the file. The rest
     * was two model reads - what it suggests (12.0s) and what it holds (8.2s) - which the person sat
     * through before the screen said anything at all.
     *
     * Neither read is needed to STORE the file, and storing it is what they asked for. So the row is
     * written, the response goes, and the reads land on the row afterwards: the file list says it is
     * being read, and the conversation says what was found when it is found. Her words: "saving
     * document, generating reports at the end of a checkin etc. all seem to load for a long time."
     */
    /*
     * THREE READS AT ONCE, NOT ONE AFTER ANOTHER.
     *
     * Hafsah, 22 September 2026: "saving document, generating reports at the end of a checkin etc.
     * all seem to load for a long time." An upload ran four model calls in series - the text out of
     * the file, what it suggests, what kind of thing it is, and what it holds - and waited for all
     * of them before the screen heard anything. Two of them never depended on each other.
     *
     * Timed, because "it feels slow" is not a measurement and neither is "it feels faster".
     */
    /*
     * THE SAME FILE TWICE IS ONE FILE (Fatima's Dangote office, 23 November 2026). Chinedu sent the May demurrage tracker twice and Ibrahim the
     * March report twice; each was filed again and read back as new, so a month could be counted twice. The same words from the same person on
     * the same check-in are the copy already kept: nothing is stored again, and the caller is told so (`alreadyHad`, with the day it came).
     */
    if (content.trim()) {
      const same = await Promise.resolve().then(() => this.prisma.groundDocument.findFirst({
        where: { groundId, participantId: participant.id, content },
        select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, uploaderNote: true, visibility: true, participantId: true, holds: true, content: true },
      })).catch(() => null);
      if (same && (same as any).content === content) { const { content: _kept, ...shape } = same as any; return { ...shape, alreadyHad: true, firstSentAt: same.createdAt }; }
    }
    /* The only one that is cheap and decides a column the row is created with. */
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
        visibility: this.visibilityWhenKept(opts.sharedWithTheCheckIn),
        fileName: file.originalname,
        mimeType: file.mimetype,
        uploaderNote: uploaderNote?.trim() || null,
        content,
        /* Both reads land after the response - see the note above. */
        assessment: undefined as any,
        origin,
      },
      /* `visibility` and `participantId` too — `toDocShape` omits what was not selected rather
         than guessing, so an upload that did not ask told the person who just attached a file
         everything except who is about to see it. */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, uploaderNote: true, visibility: true, participantId: true, holds: true },
    });

    /**
     * AN AGREEMENT UPLOADED TO AN AGREEMENT GROUND BECOMES ITS TERMS.
     *
     * Nobody types a contract into a form - they upload it, or paste it into the context. The
     * terms table has defaulted every row to the state 'read from the document' since it was
     * written, and nothing in the product could produce that state. This is the path that does.
     *
     * Fire-and-forget, like the claims extraction below and for the same reason: a failure here
     * must never be why somebody could not attach a file.
     */
    /* Read after the person is answered, from the whole of it: see readTheRestOfIt. */

    /*
     * AND WHATEVER NUMBERS IT HOLDS, READ ONCE, HERE, WHATEVER PAGE IT WAS ATTACHED ON. See
     * what-a-document-holds: a sheet attached in the chat and the same sheet attached on the Context
     * page were two different silences. Awaited rather than fired and forgotten, because the caller
     * shows what was read and a page that has to poll for it is a page that says nothing.
     */
    /*
     * AND THE TWO SLOW READS, AFTER THE ANSWER.
     *
     * Deliberately not awaited: the file is stored, which is what the upload was for. The row gets
     * `holds` and `assessment` when they land, the Context page says it is still reading until they
     * do, and the conversation says what was found on its next turn (theContextNotYetSaid) or when
     * the page sees `holds` arrive.
     */
    void this.readTheRestOfIt(doc.id, groundId, participant.id, content, doc.fileName);
    const held = null as any;

    /*
     * PROOF ADDED IN A CHECK-IN, FILED ON ITS ITEM (Release 1B, pull request 2 of 3). Only a file added in a check-in (the web
     * check-in says so; a file sent on WhatsApp during one is), only while the organisation's Release 1B switch is on, and from
     * the words just taken out of it: on one of her own items, which the model reads from them. Awaited, so the check-in's next turn can say where it was filed; a
     * failure here is never why somebody could not attach a file. See proof-filed-on-its-item.ts.
     */
    const filed = (opts.fromTheCheckIn || opts.sharedWithTheCheckIn)
      ? await fileTheProofOnItsItem(this.prisma as any, this.anthropic, { id: doc.id, groundId, participantId: participant.id, fileName: doc.fileName, mimeType: doc.mimeType, uploaderNote: (doc as any).uploaderNote ?? null, content })
        .catch((err: any) => { this.logger?.warn?.(`Could not file ${doc.fileName} as evidence: ${err?.message}`); return null; })
      : null;

    // Extract structured claims from the document content and write them as
    // RecordEntry rows so they flow into the report corpus automatically.
    // Fire-and-forget - a failure here must not block the upload response.
    if (uploaderNote?.trim()) this.checkDescription(doc.id).catch(() => null).then(() => this.anchorAfterUpload(participant.id, groundId));
    else this.anchorAfterUpload(participant.id, groundId);

    this.sayHowLongTheUploadTook(file.originalname, uploadStartedAt);

    /* The uploader's own view of what they just attached, including who can see it. The flag is
       what documents.list already reads: with context off, everything is private to its uploader. */
    return {
      ...toDocShape(doc, doc.participantId ?? undefined, this.config.get<boolean>('app.contextEnabled') === true),
      /* Said back, so the screen can say it too. Absent on anything that is not a conversation. */
      ...(isConversation ? { assumed: THE_ASSUMPTION_WHEN_UPLOADING } : {}),
      /* What it holds, and the product's own words for it, so every page says the same sentence. */
      holds: held ?? null,
      theContextWeHave: held ? theContextWeHave(held) : null,
      theDocumentLine: held ? theDocumentLine(held.fileName, held.whatItIs) : null,
      /*
       * AND THE SAME SENTENCE WITH THE QUESTION ON IT, for the conversation that attached it.
       *
       * Read in the browser, 22 September 2026: a sheet of Q4 targets attached through the context
       * chat was answered with "harvestline-q4-targets.xlsx is filed under this check-in's
       * documents" - a filing receipt. The check-in chat had said what the sheet held and asked
       * whether it was right; the lead's own tab, where the numbers are set, said nothing at all.
       */
      askingAboutIt: held ? theContextWeHave(held, { asking: true, willNoteIt: { visibility: (doc as any).visibility } }) : null,
      numbersWaiting: (held as any)?.waiting?.length ?? 0,
      /* Kept, but nothing in it could be read: the person is asked to say what it shows. */
      couldNotRead: weCouldNotReadIt(content),
      /* Release 1B: where it was filed as evidence, when it was added in a check-in with the switch on. Absent otherwise. */
      ...(filed ? { filedAsEvidence: { on: filed.itemName ?? null } } : {}),
    };
  }

  /**
   * WHAT THE SLOW READS FIND, WRITTEN ONTO THE ROW AFTER THE PERSON HAS BEEN ANSWERED.
   *
   * Two model calls, in parallel with each other because neither needs the other: what the document
   * suggests, which the card shows, and what it holds, which is the numbers waiting on a yes. Twenty
   * seconds of somebody's time, spent while they are already reading the rest of the page.
   */
  private async readTheRestOfIt(docId: string, groundId: string, participantId: string, content: string, fileName: string) {
    const startedAt = Date.now();
    /*
     * A LONG DOCUMENT IS READ WHOLE FIRST (22 November 2026), in parts, and kept once on the row, so the card, what it holds and the
     * terms in it are read from all of it and every later reader reads the same reading (what-a-document-says). A document that fits one
     * read skips this and costs nothing.
     */
    const synthesis = await whileItIsRead(docId, readTheWholeOfIt(this.anthropic, content, fileName)
      .catch((err: any) => { this.logger?.warn?.(`Could not read the whole of ${fileName}: ${err?.message}`); return null; }));
    if (synthesis) {
      await this.prisma.groundDocument.update({ where: { id: docId }, data: { synthesis } as any })
        .catch((err: any) => this.logger?.warn?.(`Could not keep the reading of ${fileName}: ${err?.message}`));
    }
    const [assessment] = await Promise.all([
      this.assessDocument(content, fileName, synthesis).catch((err: any) => { this.logger?.warn?.(`Could not assess ${fileName}: ${err?.message}`); return null; }),
      this.whatItHolds(docId, groundId, participantId, content, fileName, synthesis).catch((err: any) => { this.logger?.warn?.(`Could not read what ${fileName} holds: ${err?.message}`); return null; }),
      this.readTheAgreementInIt(groundId, { content, synthesis }).catch((err: any) => { this.logger?.warn?.(`Could not read the agreement in ${fileName}: ${err?.message}`); }),
    ]);
    if (assessment) {
      await this.prisma.groundDocument.update({ where: { id: docId }, data: { assessment: assessment as any } })
        .catch((err: any) => this.logger?.warn?.(`Could not keep what ${fileName} suggests: ${err?.message}`));
    }
    this.logger?.log?.(`Finished reading ${JSON.stringify(fileName)} in ${Date.now() - startedAt}ms, after the upload was answered.`);
  }

  /** The one number a person feels, logged where it is felt. */
  private sayHowLongTheUploadTook(fileName: string, startedAt: number) {
    this.logger?.log?.(`Upload of ${JSON.stringify(fileName)} answered in ${Date.now() - startedAt}ms.`);
  }

  /**
   * WHAT THIS DOCUMENT HOLDS, AND THE NUMBERS PUT WHERE NUMBERS LIVE.
   *
   * One read, at upload, whatever page it was attached on. See what-a-document-holds for what is read
   * and what is deliberately not. Three rules decide where a number lands:
   *
   *   A NUMBER FOR ONE PERSON needs that person to be on this check-in, matched by the resolver the
   *   spoken path uses. A name that matches nobody is carried back as unmatched and said out loud;
   *   nothing is guessed onto the nearest person.
   *
   *   ONLY THE LEAD MAY SET SOMEBODY ELSE'S NUMBER. A participant's attachment is read for their own
   *   rows and for the group's, and nothing else - the same wall as everywhere else here.
   *
   *   A NUMBER ALREADY ON THE BOARD IS NEVER OVERWRITTEN. The board's own "the record shows 40 for
   *   this, press to accept" is where a conflict belongs.
   */
  private async whatItHolds(
    docId: string,
    groundId: string,
    participantId: string,
    content: string,
    fileName: string,
    synthesis: string | null = null,
  ): Promise<WhatLanded | null> {
    if (!content?.trim()) return null;
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        initiatorId: true,
        participants: {
          select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, user: { select: { firstName: true, lastName: true } } },
        },
        objectives: { select: { name: true, target: true, ownerParticipantId: true } },
      },
    });
    if (!ground) return null;
    const me = ground.participants.find((p) => p.id === participantId);
    const isLead = !!me?.userId && ground.initiatorId === me.userId;

    const read = await this.anthropic.extract<WhatADocumentHolds>(
      WHAT_A_DOCUMENT_HOLDS_PROMPT,
      [{ role: 'user', content: `Document: "${fileName}"\n\n${whatADocumentSays({ content, synthesis })}` }],
      WHAT_A_DOCUMENT_HOLDS_SCHEMA as any,
    );
    if (!read) return null;

    /* One name-matching rule, in one place. See whoThisNameIs. */
    const mayHoldANumber = ground.participants.filter((p) => !p.managingOnly && (isLead || p.id === participantId));
    const resolve = (name: string) => whoThisNameIs(name, mayHoldANumber as any);
    const nameOf = theNameWeUseFor as (p: any) => string;

    /* A fraction the model wrote for a percentage is kept only where the document says that percentage; see theNumberAsWritten. */
    const rows = (read.forOnePerson ?? [])
      .filter((r) => r?.personName?.trim() && r?.what?.trim())
      .map((r) => ({ ...r, target: theNumberAsWritten(r.target, content) as number }))
      .filter((r) => r.target != null);
    const held = new Set((ground.objectives ?? []).map((o) => `${o.ownerParticipantId ?? 'team'}::${(o.name ?? '').trim().toLowerCase()}`));
    const forOnePerson: WhatLanded['forOnePerson'] = [];
    const unmatched: string[] = [];
    const toWrite: { groundId: string; name: string; target: number; ownerParticipantId: string | null; setByParticipantId: string; sortOrder: number }[] = [];
    let sortOrder = 100 + (ground.objectives?.length ?? 0);
    /*
     * A COLLEAGUE'S NUMBER IN A PARTICIPANT'S FILE IS LEFT OUT, NOT "NOT ON THIS CHECK-IN" (week 14).
     * Only the lead may set somebody else's number, so these rows were never going to be kept - and
     * they were said as names missing from the check-in, which was not true: the person is here.
     */
    const onTheCheckIn = ground.participants.filter((p) => !p.managingOnly);
    const notTheirsToSet: string[] = [];
    /* A number the document gives to a person is theirs and not also the group's (checked below). */
    const givenToSomebody: { what: string; target: number }[] = [];
    for (const r of rows) {
      const who = resolve(r.personName);
      givenToSomebody.push({ what: r.what, target: r.target });
      if (!who) {
        const name = r.personName.trim();
        if (!isLead && whoThisNameIs(name, onTheCheckIn as any)) { if (!notTheirsToSet.includes(name)) notTheirsToSet.push(name); continue; }
        if (!unmatched.includes(name)) unmatched.push(name);
        continue;
      }
      const name = r.what.trim().slice(0, 120);
      if (held.has(`${who.id}::${name.toLowerCase()}`)) continue;
      held.add(`${who.id}::${name.toLowerCase()}`);
      toWrite.push({ groundId, name, target: Math.round(r.target), ownerParticipantId: who.id, setByParticipantId: participantId, sortOrder: sortOrder++ });
      forOnePerson.push({ who: nameOf(who as any), what: name, target: Math.round(r.target), by: r.by?.trim() || null, ownerParticipantId: who.id, asWritten: theFigureAsWritten(Math.round(r.target), content, name) });
    }

    /*
     * THE GROUP'S OWN NUMBERS ARE SET BY THE LEAD (B-102, Hafsah 11 October 2026). A member's
     * pipeline sheet listing "Acme 40000 won" was offered back to her as "For everyone in this
     * check-in, the target for Acme is 40,000. Is that right?". A file a member sends is her own
     * evidence, kept in her words; it is never turned into a target for everyone. So the read keeps
     * the document as it is and says what it left out, and nothing waits on a yes.
     */
    const forEverybody: WhatLanded['forEverybody'] = [];
    const notAMembersToSet = !isLead && (read.forEverybody ?? []).some((t) => t?.what?.trim());
    for (const t of (isLead ? (read.forEverybody ?? []) : []).filter((t) => t?.what?.trim()).map((t) => ({ ...t, target: theNumberAsWritten(t.target, content) as number })).filter((t) => t.target != null)) {
      const name = t.what.trim().slice(0, 120);
      /* Found on a quarterly plan (4 October 2026): each priority's number was waiting for its owner AND for everyone. */
      if (givenToSomebody.some((g) => g.target === t.target && theSameWords(g.what, t.what))) continue;
      if (held.has(`team::${name.toLowerCase()}`)) continue;
      held.add(`team::${name.toLowerCase()}`);
      toWrite.push({ groundId, name, target: Math.round(t.target), ownerParticipantId: null, setByParticipantId: participantId, sortOrder: sortOrder++ });
      forEverybody.push({ what: name, target: Math.round(t.target), kind: t.kind ?? null, by: t.by?.trim() || null, asWritten: theFigureAsWritten(Math.round(t.target), content, name) });
    }

    /*
     * NOTHING IS WRITTEN HERE ANY MORE. THE SENTENCE ASKED AND THE CODE HAD ALREADY DONE IT.
     *
     * Driven in the browser, 22 September 2026: a sheet of Q4 targets was attached mid-conversation,
     * nineteen rows appeared on the record, and the chat then said "Here is the context we have...
     * Is that right?" - a question about something already done, which is the one thing this product
     * says it never does. Every other path asks first: the paste proposes and writes on a yes, and a
     * target is the yardstick somebody is read against.
     *
     * So the read is kept ON the document, with the owner it resolved, and the conversation writes it
     * when the person says yes - see whatTheDocumentWaitsFor in the conversation service.
     */
    const waiting = toWrite.map((r) => ({ name: r.name, target: r.target, ownerParticipantId: r.ownerParticipantId }));
    const leftOut: NonNullable<WhatLanded['leftOut']> = [
      /* Bank details the file held go under what it left out, never under what it took (request 40). */
      ...(Object.values(HIDDEN).some((h) => content.includes(h)) ? [{ ...BANK_DETAILS_LEFT_OUT }] : []),
      ...notTheirsToSet.map((name) => ({ what: `The numbers for ${name}`, why: 'Only the lead can set a number for someone else.' })),
      ...(notAMembersToSet ? [{ what: 'Targets for everyone in this check-in', why: 'Only the lead sets a target for everyone. The numbers stay in your file as your own evidence, in your words.' }] : []),
      ...(notReadWholeYet({ content, synthesis })
        ? [{ what: 'The rest of the document', why: 'It is too long to read in one go and the rest of it could not be read, so only the first part was read.' }]
        : []),
    ];
    const read0: WhatLanded = {
      fileName,
      whatItIs: read.whatItIs?.trim() || null,
      forOnePerson,
      forEverybody,
      dates: (read.dates ?? []).filter((d) => d?.what?.trim() && d?.when?.trim()).map((d) => ({ what: d.what.trim(), when: d.when.trim() })),
      unmatched,
      /* What will be written when they say yes, with the owner already resolved. */
      waiting,
      takenAt: null,
      ...(leftOut.length ? { leftOut } : {}),
    };
    /* The page each item came from, found in the text's own page markers. See a-document-read-item-by-item. */
    const landed = withThePages(read0, content, fileName);
    await this.prisma.groundDocument.update({ where: { id: docId }, data: { holds: landed as any } }).catch(() => undefined);
    this.logger?.log?.(`Read ${JSON.stringify(fileName)}: ${forOnePerson.length} for one person, ${forEverybody.length} for everybody, ${landed.dates.length} date(s), ${unmatched.length} unmatched name(s).`);
    return landed;
  }

  /**
   * A LOCATION PIN SENT ON WHATSAPP, KEPT WITH THE CHECK-IN AS PROOF (see a-location-pin.ts).
   *
   * Kept the way an upload is: on the ground, against the person who sent it, with the same default
   * visibility, so whoever sees their other proof sees this and nobody else does. The coordinates,
   * and the name and address WhatsApp sent with it, are its content; nothing is read into it.
   */
  /**
   * Private to the person who kept it, unless they shared it with the check-in as they sent it. Shared
   * means OPEN, exactly what setVisibility writes when an uploader opens a file to the check-in, and
   * only while adding documents is switched on: with it off every document is the uploader's own, so
   * nothing is stored as shared that the read path would not honour.
   */
  private visibilityWhenKept(sharedWithTheCheckIn?: boolean): DocumentVisibility {
    return sharedWithTheCheckIn && this.config.get<boolean>('app.contextEnabled') === true ? DocumentVisibility.OPEN : defaultVisibilityForUpload();
  }

  async keepALocationPin(groundId: string, userId: string, pin: ALocationPin, sentAt: Date, zone?: string, opts: { sharedWithTheCheckIn?: boolean } = {}) {
    const participant: any = await this.assertParticipant(groundId, userId);
    const user = await (this.prisma as any).user?.findUnique?.({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    const who = (user?.firstName ?? '').trim() || (participant?.nameGiven ?? '').trim().split(/\s+/)[0] || 'Somebody';
    const doc = await this.prisma.groundDocument.create({
      data: {
        groundId,
        participantId: participant.id,
        isConversation: false,
        visibility: this.visibilityWhenKept(opts.sharedWithTheCheckIn),
        fileName: aLocationPinsName(sentAt, zone),
        mimeType: 'text/plain',
        content: aLocationPinOnTheRecord(who, pin, sentAt, zone),
        origin: null,
        createdAt: sentAt,
      } as any,
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, uploaderNote: true, visibility: true, participantId: true, holds: true },
    });
    this.anchorAfterUpload(participant.id, groundId);
    return toDocShape(doc, doc.participantId ?? undefined, this.config.get<boolean>('app.contextEnabled') === true);
  }

  /** Update a document's assessment (user-corrected version). */
  async correctAssessment(groundId: string, docId: string, userId: string, assessment: { suggests: string[]; willDo: string[] }) {
    const participant = await this.assertParticipant(groundId, userId);
    const doc = await this.prisma.groundDocument.findFirst({ where: { id: docId, groundId, participantId: participant.id } });
    if (!doc) throw new NotFoundException('That document could not be found, so refresh the page to see what is there now.');
    const updated = await this.prisma.groundDocument.update({
      where: { id: docId },
      data: { assessment: assessment as any },
      /* `visibility` and `participantId` too: `toDocShape` omits what was not selected rather
         than guessing, so an upload that did not ask for them told the person who just attached a
         file everything except who is about to see it. */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true, holds: true },
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
    const fromFile = originFromTheFile(file.mimetype, file.originalname, { isConversation, pdfHadNoTextLayer: this.lastPdfWasAScan, receiptOrInvoice: aReceiptOrAnInvoice(file.originalname, content) });
    this.lastPdfWasAScan = false;
    if (fromFile) return fromFile;
    if (weCouldNotReadIt(content)) return 'typed';
    const cheap = looksGeneratedByAModel(content);
    /* A 74-character offer letter stub came back "generated" from the model on one of three identical
       copies. Too short to judge is typed unless the text itself carries the tells. */
    if (content.trim().length < 400) return cheap ? 'generated' : 'typed';
    try {
      const read = await this.anthropic.extract<{ origin: DocumentOrigin; because: string }>(DOCUMENT_ORIGIN_PROMPT, [{ role: 'user', content: whatADocumentSays({ content }) }], DOCUMENT_ORIGIN_SCHEMA);
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
    const doc = await this.prisma.groundDocument.findUnique({ where: { id: docId }, select: { id: true, content: true, synthesis: true, uploaderNote: true, fileName: true, assessment: true } as any }) as any;
    if (!doc?.uploaderNote?.trim() || weCouldNotReadIt(doc.content)) return null;
    try {
      const read = await this.anthropic.extract<{ matches: boolean; reads: string }>(
        DESCRIPTION_CHECK_PROMPT,
        [{ role: 'user', content: `THEY SAID IT IS: ${doc.uploaderNote.trim()}\n\nFILE "${doc.fileName}":\n${whatADocumentSays(doc)}` }],
        DESCRIPTION_CHECK_SCHEMA,
      );
      if (!read || typeof read.matches !== 'boolean') return null;
      const check = { matches: read.matches, reads: (read.reads ?? '').trim().slice(0, 300), checkedAt: new Date().toISOString() };
      await this.prisma.groundDocument.update({ where: { id: docId }, data: { descriptionCheck: check as any } });
      /* The verdict and the ids. What they wrote and what the document says are both on the row
         this line points at, where only people entitled to them can read them (G4). */
      this.logger.log(`description-check doc=${docId} matches=${check.matches}`);
      return check;
    } catch (err: any) {
      this.logger.warn(`Description check failed for ${docId}: ${err?.message}`);
      return null;
    }
  }

  /*
   * A SCAN IS READ IN PAGE BATCHES (22 November 2026). A scanned PDF went to the model in one call, and one call's answer holds about ten
   * to fifteen pages, so a long scan came back as its first pages and nothing said the rest was gone. A scan with more pages than one
   * batch is read a batch of pages at a time, in order, and a batch that could not be read is named in the text rather than dropped.
   */
  private async mediaToText(buffer: Buffer, mimeType: string, fileName: string, pages = 0): Promise<string> {
    try {
      const base64 = buffer.toString('base64');
      const read = (prompt: string) => this.anthropic.respondWithMedia(
        'You are extracting readable content from an uploaded file for a workplace record.',
        prompt,
        { mimeType, base64 },
      );
      const TRANSCRIBE = 'Transcribe all text visible in this file. For a chart, diagram, spreadsheet, or slide, describe the key data points, labels, and values. For a photo with no text or data, say so briefly. Do not summarize. Transcribe faithfully.';
      if (pages <= PAGES_READ_BY_SIGHT_AT_ONCE) {
        const text = await read(TRANSCRIBE);
        return text || `[Attached: ${fileName} - contained no readable text or data.]`;
      }
      const batches: [number, number][] = [];
      for (let from = 1; from <= pages; from += PAGES_READ_BY_SIGHT_AT_ONCE) batches.push([from, Math.min(pages, from + PAGES_READ_BY_SIGHT_AT_ONCE - 1)]);
      let read0 = 0;
      const said = await inTurn(batches, 4, ([from, to]) => read(`${TRANSCRIBE}\n\nThis file has ${pages} pages. Transcribe pages ${from} to ${to} only, in order, and start each page with "-- Page N --".`)
        .then((t) => { read0++; return t; })
        .catch(() => `-- Pages ${from} to ${to} could not be read, so what they say is not here. --`));
      if (!read0) return `[Attached: ${fileName} - could not be processed.]`;
      return said.join('\n\n');
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
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true, holds: true, uploaderNote: true },
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
    if (!file) throw new BadRequestException('No file came through, so choose a file and try again.');
    if (file.size > MOST_A_FILE_MAY_WEIGH) throw new BadRequestException(A_FILE_TOO_LARGE);
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
    /* The same rule as the other upload path: the file is stored, the person is answered, and the
       slow reads land on the row afterwards - see readTheRestOfIt. An invited person's time is
       nobody's to spend either. */
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
        origin,
      },
      /* `visibility` and `participantId` too: `toDocShape` omits what was not selected rather
         than guessing, so an upload that did not ask for them told the person who just attached a
         file everything except who is about to see it. */
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true, holds: true },
    });

    this.anchorAfterUpload(participant.id, participant.groundId);

    /* AN UPLOAD ON A LINK IS AN UPLOAD LIKE ANY OTHER, including this - and including not making
       somebody wait twenty seconds for a model before their file is theirs. See readTheRestOfIt. */
    void this.readTheRestOfIt(doc.id, participant.groundId, participant.id, content, doc.fileName);
    const held = null as any;

    /* The uploader's own view of what they just attached, including who can see it. The flag is
       what documents.list already reads: with context off, everything is private to its uploader. */
    return {
      ...toDocShape(doc, doc.participantId ?? undefined, this.config.get<boolean>('app.contextEnabled') === true),
      /* Said back, so the screen can say it too. Absent on anything that is not a conversation. */
      ...(isConversation ? { assumed: THE_ASSUMPTION_WHEN_UPLOADING } : {}),
      holds: held ?? null,
      theContextWeHave: held ? theContextWeHave(held) : null,
      theDocumentLine: held ? theDocumentLine(held.fileName, held.whatItIs) : null,
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
      throw new ForbiddenException('Adding documents is switched off here, so ask your Groundwork contact to switch it on.');
    }
    /*
     * The body is a plain type, not a validated DTO, so the string arrives unchecked. That was
     * harmless while both values were harmless; now that one of them decides who else can read a
     * file, an unrecognised value is refused here rather than handed to Prisma to reject.
     */
    if (visibility !== 'OPEN' && visibility !== 'OWN' && visibility !== 'CLOSED') {
      throw new BadRequestException('Choose who may see the document, either everyone in the check-in or only you.');
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
        throw new ForbiddenException('Only the person who runs this check-in can keep a document to themselves, so share it with the check-in instead.');
      }
    }

    const doc = await this.prisma.groundDocument.findFirst({
      where: { id: docId, groundId, participantId: participant.id },
    });
    // Deliberately the same message whether it does not exist or is not theirs:
    // "not yours" tells somebody a document exists, which is itself a leak.
    if (!doc) throw new NotFoundException('That document could not be found, so refresh the page to see what is there now.');

    const updated = await this.prisma.groundDocument.update({
      where: { id: docId },
      data: { visibility: visibility as any },
      select: { id: true, visibility: true },
    });
    this.logger.log(`Document ${docId} on ground ${groundId} moved to ${visibility} by its uploader.`);
    return updated;
  }

  /**
   * WHAT IT SHOULD BE USED FOR, SAID AFTER THE FILE IS READ.
   *
   * "Add a document" shows what was read from a file and then asks what it is for, so the answer can
   * arrive after the upload rather than only with it. The uploader's alone, like moving or deleting
   * it; the same message whether the document does not exist or is somebody else's. Blank clears it.
   * The same check as a note given at upload then runs: whether the file reads as what they said.
   */
  async setNote(groundId: string, docId: string, userId: string, note: string | null | undefined) {
    const participant = await this.assertParticipant(groundId, userId);
    const doc = await this.prisma.groundDocument.findFirst({
      where: { id: docId, groundId, participantId: participant.id },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('That document could not be found, so refresh the page to see what is there now.');
    const said = (note ?? '').toString().trim().slice(0, 500) || null;
    const updated = await this.prisma.groundDocument.update({
      where: { id: docId },
      data: { uploaderNote: said },
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, visibility: true, participantId: true, holds: true, uploaderNote: true },
    });
    if (said) this.checkDescription(docId).catch(() => null);
    return toDocShape(updated, participant.id, this.config.get<boolean>('app.contextEnabled') === true);
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
    if (!doc) throw new NotFoundException('That document could not be found, so refresh the page to see what is there now.');
    await this.prisma.groundDocument.delete({ where: { id: docId } });
    return { deleted: true };
  }

  private async assertParticipant(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
    return participant;
  }
}
