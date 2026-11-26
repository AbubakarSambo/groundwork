/**
 * A REPORT ON REQUEST: ONE CONVERSATION, THREE DOORS (Batch S, S8).
 *
 * Ask on the web, a mail to the assistant's address and WhatsApp all come here with the person's words, and the same steps answer them:
 * start (say what it can draw on, ask for emails and documents), keep what they add, send an outline, change it in their words, and on their
 * yes write the report from only the sources on the outline. The report goes back where they asked, and is kept so they can ask for it again.
 *
 * In Ask the waiting step is a parked proposal (kind `report_on_request`), resolved like the others in resolveParked. The request itself is
 * its own row, so a mail with documents that comes in two days later still finds it, and moving on to another question in Ask does not lose it.
 *
 * Built on what exists: the assistant's address and the inbound mail (email/), the documents pipeline's reader (DocumentsService.textOutOf),
 * the Desk's own read, and the one rule for who may read a check-in. The year-end draft's versions and approval were not reused: they are
 * keyed to one principal and one year, carry files and a register, and approve a draft that is sent on; this approves an outline that only
 * the person who asked ever reads.
 */
import * as crypto from 'crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { PromptsService } from '../prompts/prompts.service';
import { GroundsService } from '../grounds/grounds.service';
import { theAssistantsAddress } from '../email/the-assistants-address';
import { understandTheMessage } from '../assistant/ask-understands-with-the-model';
import {
  ADD_IT_HERE, COULD_NOT_WRITE_IT, NO_REPORT_KEPT, STOPPED, THE_OUTLINE_KEY, THE_OUTLINE_PROMPT, THE_OUTLINE_SCHEMA,
  READ_THEIR_WORDS_KEY, READ_THEIR_WORDS_PROMPT, aMaterialLabel, anOutlineMadeSafe, anOutlineWithoutTheModel, howToAddMore, theChosenSources, theOpening,
  theOutlineAsked, theOutlineSaid, whatTheyMeanNow, whatWasAddedSaid,
  type AMaterialVia, type ASection, type ASource, type AnExtractor, type TheChannel, type TheStage,
} from './the-report-on-request';
import { theSourcesThisReaderMayUse, type TheReader } from './the-sources-this-reader-may-use';
import { theirReportIsTheYearEndDraft } from '../year-end/her-year-end-record';
import { EmailService } from '../email/email.service';
import {
  READ_A_DOCUMENT_KEY, READ_A_DOCUMENT_PROMPT, READ_A_DOCUMENT_SCHEMA, WORK_A_WORKBOOK_OUT_KEY, WORK_A_WORKBOOK_OUT_PROMPT,
  aReadingForTheModel, aReadingMadeSafe, isAWorkbook, theReadingAsked, theSizeSaid, theWorkbookAsFiles, type TheReading,
} from './reading-a-document';
import {
  READ_ACROSS_KEY, READ_ACROSS_PROMPT, READ_ACROSS_SCHEMA, WRITE_THE_REPORT_KEY, WRITE_THE_REPORT_PROMPT, WRITE_THE_REPORT_SCHEMA,
  aWrittenReportFromTheReadings, shortIdsFor, theAcrossAsked, theAcrossMadeSafe, theWritingAsked, type TheWrittenReport,
} from './writing-the-report';
import { beforeTheFinal, theReportFiles, theReportInTheChat } from './the-report-files';

export const REPORT_ON_REQUEST_KIND = 'report_on_request';
/** After a report: the offer to set up check-ins that ask the right people for what would close its gaps. */
export const REPORT_GAPS_KIND = 'report_gaps_check_ins';

/** Said while documents are still being read: the outline is planned from whole readings, so it waits. */
export const STILL_WRITING = 'I am still writing the report you asked for. It takes a few minutes, and I will send it to you as soon as it is ready.';

export const theyAreStillBeingRead = (left: number, total: number) =>
  `I am still reading ${left === 1 ? 'one' : left} of the ${total} documents you gave me. I plan the outline from all of each document, so ask me for it again in a few minutes.`;

/** Said at once on their yes: the report takes minutes, and where it will come. */
export const writingItNow = (documents: number, channel: TheChannel) =>
  `Thank you. I am reading ${documents === 1 ? 'your document' : documents === 2 ? 'both documents' : `all ${documents} documents`} together and writing the report now. It takes a few minutes. ${channel === 'chat' ? 'I will put it here and email you the Word and Excel files when it is ready.' : 'I will email it to you, with the Word and Excel files, when it is ready.'}`;
const OPEN: TheStage[] = ['gathering', 'outline', 'writing'];

export interface WhatWasSaid { said: string; /** Ask on the web opens the file picker for the report. */ upload?: boolean }
export interface AFileToRead { name: string; mimeType: string; bytes: Buffer | null }

interface TheOutlineKept { about: string | null; said: string[]; sections: ASection[] | null }

@Injectable()
export class ReportsOnRequestService {
  private readonly logger = new Logger(ReportsOnRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly documents?: DocumentsService,
    @Optional() private readonly engine?: AnthropicService,
    @Optional() private readonly prompts?: PromptsService,
    @Optional() private readonly grounds?: GroundsService,
    @Optional() private readonly email?: EmailService,
  ) {}

  /* ------------------------------------------------------------------ reading each document whole, once */

  /** Readings under way, so a document is never read twice at once and the outline can wait for them. At most three run together. */
  private readonly reading = new Map<string, Promise<void>>();
  private readonly waiting: (() => void)[] = [];
  private running = 0;
  private static readonly AT_ONCE = 3;
  private async aSlot(): Promise<void> {
    if (this.running >= ReportsOnRequestService.AT_ONCE) await new Promise<void>((go) => this.waiting.push(go));
    this.running++;
  }
  private letTheNextOneIn(): void { this.running--; this.waiting.shift()?.(); }

  /** Read it as soon as there is room. Resolves when it has been read, or could not be. */
  readSoon(materialId: string): Promise<void> {
    const had = this.reading.get(materialId);
    if (had) return had;
    const done = this.aSlot()
      .then(() => this.readOne(materialId).then(() => undefined))
      .catch((err: any) => { this.logger.warn(`A document for a report could not be read: ${err?.message}`); })
      .finally(() => { this.letTheNextOneIn(); this.reading.delete(materialId); });
    this.reading.set(materialId, done);
    return done;
  }

  /** Every document added to this request that has not been read yet. */
  private async unread(requestId: string): Promise<string[]> {
    const rows: any[] = (await this.db.reportMaterial.findMany({ where: { requestId, readAt: null }, select: { id: true } }).catch(() => [])) ?? [];
    return rows.map((r) => r.id);
  }

  /**
   * ONE DOCUMENT, READ WHOLE. A workbook is first worked out with code over its sheets, its formulas and its numbers stored as text; then the
   * model records everything in the document a report could need, with where it sits. The reading is kept, and every later step uses it.
   */
  async readOne(materialId: string): Promise<TheReading | null> {
    const m: any = await this.db.reportMaterial.findUnique({ where: { id: materialId } }).catch(() => null);
    if (!m || m.readAt) return (m?.reading as TheReading) ?? null;
    const extract = this.extractor();
    if (!extract) return null;
    const request: any = await this.db.reportOnRequest.findUnique({ where: { id: m.requestId }, select: { asked: true } }).catch(() => null);
    let workedOut: { said: string; workings: string[] } | null = null;
    let size = theSizeSaid({ words: m.text });
    let words: string = m.text;
    if (m.bytes && isAWorkbook(m.name, m.mimeType) && (this.engine as any)?.workItOut) {
      const book = theWorkbookAsFiles(Buffer.from(m.bytes));
      size = theSizeSaid({ sheets: book.sheets });
      const p = await this.prompt(WORK_A_WORKBOOK_OUT_KEY, WORK_A_WORKBOOK_OUT_PROMPT);
      const question = `Load every attached file with pandas and work this workbook out with code before you answer.\nThe workbook: ${m.name}\nThe files, in order:\n${book.guide}\nWhat the person asked for: ${request?.asked ?? ''}`;
      /* The reading reads the workbook as the same compact sheets, not its raw words: a stock count's raw words were too large to send. */
      words = book.files.map((f) => `--- ${f.name.replace(/\.csv$/, '')} ---\n${f.text}`).join('\n\n');
      const workItOut = () => (this.engine as any).workItOut(p.content, question, book.files).catch((err: any) => { this.logger.warn(`A workbook could not be worked out: ${err?.message}`); return null; });
      workedOut = await workItOut();
      /* A figure the model only read is a guess: when no code ran, it is asked once more. */
      if (!workedOut?.workings.length) workedOut = (await workItOut()) ?? workedOut;
    }
    const p = await this.prompt(READ_A_DOCUMENT_KEY, READ_A_DOCUMENT_PROMPT);
    const raw = await extract(p.content, [{ role: 'user', content: theReadingAsked({ asked: request?.asked ?? '', name: m.name, words, workedOut }) }], READ_A_DOCUMENT_SCHEMA, { long: true }).catch(() => null);
    const reading = aReadingMadeSafe(raw, size, workedOut?.workings);
    this.logger.log(`Read "${m.name}": ${size}${workedOut ? `, worked out with ${workedOut.workings.length} steps of code` : ''}${reading ? '' : ', and nothing could be kept'}.`);
    if (!reading) return null;
    await this.db.reportMaterial.update({ where: { id: materialId }, data: { reading: reading as any, readAt: new Date() } });
    return reading;
  }

  /** On a restart, what was waiting to be read is read. */
  async onApplicationBootstrap(): Promise<void> {
    const rows: any[] = (await this.db.reportMaterial.findMany({ where: { readAt: null }, select: { id: true, requestId: true } }).catch(() => [])) ?? [];
    if (!rows.length) return;
    const open: any[] = (await this.db.reportOnRequest.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.requestId))] }, status: { in: OPEN } }, select: { id: true } }).catch(() => [])) ?? [];
    const ids = new Set(open.map((o) => o.id));
    for (const r of rows) if (ids.has(r.requestId)) void this.readSoon(r.id);
  }

  private get db(): any { return this.prisma as any; }
  private extractor(): AnExtractor | null { return this.engine ? (s, h, t, o) => (this.engine as any).extract(s, h, t, o) : null; }
  private async prompt(key: string, fallback: string): Promise<{ content: string; id: string | null }> {
    const v: any = await this.prompts?.getActive(key).catch(() => null);
    return v?.content ? { content: v.content, id: v.id ?? null } : { content: fallback, id: null };
  }

  /** The open request, if any. A senior person's report is her year-end draft (Batch D, R1), so for her, and whoever acts for her, none is ever open. */
  async openRequestOf(organizationId: string, userId: string): Promise<any | null> {
    if (await theirReportIsTheYearEndDraft(this.db, organizationId, userId).catch(() => false)) return null;
    return this.db.reportOnRequest.findFirst({ where: { organizationId, userId, status: { in: OPEN } }, orderBy: { createdAt: 'desc' } }).catch(() => null);
  }

  private async reader(organizationId: string, userId: string): Promise<TheReader> {
    const u: any = await this.db.user.findUnique({ where: { id: userId }, select: { role: true, email: true } }).catch(() => null);
    return { userId, organizationId, role: u?.role ?? null, email: u?.email ?? null };
  }

  private async sources(organizationId: string, userId: string, requestId: string | null, channel: TheChannel): Promise<ASource[]> {
    return theSourcesThisReaderMayUse(this.db, this.grounds, await this.reader(organizationId, userId), { requestId, channel });
  }

  private async address(organizationId: string): Promise<string | null> {
    const org: any = await this.db.organization.findUnique({ where: { id: organizationId }, select: { slug: true } }).catch(() => null);
    return org?.slug ? theAssistantsAddress({ slug: org.slug }) : null;
  }

  /** The waiting step in Ask, so their next words there come back here. One per request. */
  private async park(organizationId: string, userId: string, requestId: string, summary: string): Promise<void> {
    const person: any = await this.db.person.findFirst({ where: { organizationId, linkedUserId: userId }, select: { externalId: true } }).catch(() => null);
    if (!person?.externalId) return;
    const waiting: any = await this.db.assistantProposal.findFirst({ where: { organizationId, personExternalId: person.externalId, state: 'PARKED' }, orderBy: { createdAt: 'desc' } }).catch(() => null);
    if (waiting?.kind === REPORT_ON_REQUEST_KIND && (waiting.payload as any)?.requestId === requestId) return;
    await this.db.assistantProposal.create({ data: { organizationId, personExternalId: person.externalId, kind: REPORT_ON_REQUEST_KIND, summary: summary.slice(0, 2000), payload: { requestId } } }).catch(() => undefined);
  }

  private async unpark(organizationId: string, requestId: string, state: 'ACCEPTED' | 'DECLINED'): Promise<void> {
    const rows: any[] = (await this.db.assistantProposal.findMany({ where: { organizationId, kind: REPORT_ON_REQUEST_KIND, state: 'PARKED' } }).catch(() => [])) ?? [];
    for (const r of rows.filter((x) => (x.payload as any)?.requestId === requestId)) await this.db.assistantProposal.update({ where: { id: r.id }, data: { state, resolvedAt: new Date() } }).catch(() => undefined);
  }

  /* ------------------------------------------------------------------ the start */

  /** They asked for a report. An open one is picked up where it stands; a report already written is sent again when that is what they mean. Null for a senior person: her report is the year-end draft (Batch D, R1). */
  async start(a: { organizationId: string; userId: string; message: string; channel: TheChannel; about?: string | null }): Promise<WhatWasSaid | null> {
    if (await theirReportIsTheYearEndDraft(this.db, a.organizationId, a.userId).catch(() => false)) return null;
    const open = await this.openRequestOf(a.organizationId, a.userId);
    if (open) {
      const said = await this.whereItStands(open, a.channel);
      await this.park(a.organizationId, a.userId, open.id, said);
      return { said };
    }
    const built: any[] = (await this.db.reportOnRequest.findMany({ where: { organizationId: a.organizationId, userId: a.userId, status: 'built' }, orderBy: { builtAt: 'desc' }, take: 5 }).catch(() => [])) ?? [];
    const p = await this.prompt(READ_THEIR_WORDS_KEY, READ_THEIR_WORDS_PROMPT);
    const means = await whatTheyMeanNow({ stage: 'new', message: a.message, written: built.map((b) => String(b.asked).slice(0, 120)), extract: this.extractor(), prompt: p.content });
    if (means === 'again' && built.length) return { said: built[0].report ?? NO_REPORT_KEPT };
    const sources = await this.sources(a.organizationId, a.userId, null, a.channel);
    const kept: TheOutlineKept = { about: a.about ?? null, said: [], sections: null };
    const row = await this.db.reportOnRequest.create({ data: { organizationId: a.organizationId, userId: a.userId, status: 'gathering', channel: a.channel, asked: String(a.message).slice(0, 2000), outline: kept as any } });
    const address = await this.address(a.organizationId);
    /* Asked for the outline straight away ("show me the outline first and add a section on what is blocking us"): it is sent now, with how to add more (T8). */
    if (means === 'ready' || means === 'change') {
      const outlined = await this.anOutline({ ...row }, kept, sources, a.message, a.userId);
      return { said: `${outlined}\n\n${howToAddMore(a.channel, address)}` };
    }
    const said = theOpening(this.whatItCanDrawOn(sources), a.channel, address);
    await this.park(a.organizationId, a.userId, row.id, said);
    return { said };
  }

  private whatItCanDrawOn(sources: ASource[]) {
    return {
      checkIns: [...new Set(sources.filter((s) => s.kind === 'check_in').map((s) => s.name))],
      desk: sources.some((s) => s.kind === 'desk'),
      references: sources.some((s) => s.kind === 'references'),
      added: sources.filter((s) => s.kind === 'material').map((s) => s.label),
    };
  }

  private async whereItStands(open: any, channel: TheChannel): Promise<string> {
    if (open.status === 'writing') return STILL_WRITING;
    const sources = await this.sources(open.organizationId, open.userId, open.id, channel);
    const kept = (open.outline ?? {}) as TheOutlineKept;
    if (open.status === 'outline' && kept.sections?.length) return theOutlineSaid(kept.sections, sources, 'waiting');
    return theOpening(this.whatItCanDrawOn(sources), channel, await this.address(open.organizationId));
  }

  /* ------------------------------------------------------------------ their words at each step */

  /** Their words, while a request is open. Null when the words are not about it, so whoever asked carries on as before. */
  async hear(a: { organizationId: string; userId: string; message: string; channel: TheChannel }): Promise<WhatWasSaid | null> {
    const open = await this.openRequestOf(a.organizationId, a.userId);
    if (!open) return null;
    if (open.status === 'writing') return { said: STILL_WRITING };
    const kept = (open.outline ?? { about: null, said: [], sections: null }) as TheOutlineKept;
    const sources = await this.sources(a.organizationId, a.userId, open.id, a.channel);
    const p = await this.prompt(READ_THEIR_WORDS_KEY, READ_THEIR_WORDS_PROMPT);
    const means = await whatTheyMeanNow({ stage: open.status, message: a.message, outline: kept.sections, sources, extract: this.extractor(), prompt: p.content });
    if (means === 'other' || means === 'again') return null;
    if (means === 'stop') {
      await this.db.reportOnRequest.update({ where: { id: open.id }, data: { status: 'stopped' } });
      await this.unpark(a.organizationId, open.id, 'DECLINED');
      return { said: STOPPED };
    }
    if (means === 'add') return a.channel === 'chat' ? { said: ADD_IT_HERE, upload: true } : { said: howToAddMore(a.channel, await this.address(a.organizationId)) };
    if (means === 'approve' && open.status === 'outline' && kept.sections?.length) return { said: await this.write(open, kept, a.channel) };
    /* Ready, a change, or a yes before there is an outline: the outline is made, or changed, in their words. */
    return { said: await this.anOutline(open, kept, sources, a.message, a.userId) };
  }

  /** The outline made, or changed, in their words, kept, and parked for their answer in Ask. It is planned from whole readings, so it waits for them. */
  private async anOutline(open: any, kept: TheOutlineKept, sources: ASource[], message: string, userId: string): Promise<string> {
    const unread = await this.unread(open.id);
    if (unread.length) {
      unread.forEach((id) => void this.readSoon(id));
      const total = sources.filter((s) => s.kind === 'material').length;
      return theyAreStillBeingRead(unread.length, total);
    }
    const first = open.status !== 'outline';
    const said = [...kept.said, String(message).slice(0, 600)].slice(-12);
    const sections = await this.outline(open.asked, said, first ? null : kept.sections, sources);
    await this.db.reportOnRequest.update({ where: { id: open.id }, data: { status: 'outline', outline: { ...kept, said, sections } as any } });
    const text = theOutlineSaid(sections, sources, first);
    await this.park(open.organizationId, userId, open.id, text);
    return text;
  }

  private async outline(asked: string, said: string[], before: ASection[] | null, sources: ASource[]): Promise<ASection[]> {
    const extract = this.extractor();
    if (extract && sources.length) {
      const p = await this.prompt(THE_OUTLINE_KEY, THE_OUTLINE_PROMPT);
      const raw = await extract(p.content, [{ role: 'user', content: theOutlineAsked({ asked, said, outline: before, sources }) }], THE_OUTLINE_SCHEMA, { fast: true }).catch(() => null);
      const safe = anOutlineMadeSafe(raw, sources);
      if (safe) return safe;
    }
    return before ?? anOutlineWithoutTheModel(sources);
  }

  /**
   * THE YES WRITES IT, FROM THE READINGS. Who may read what is asked again now, not trusted from when the outline was made: a source they can no
   * longer read is not used. The report is written in the background, because reading a whole set together and writing from it takes minutes:
   * they are told so at once, and the report comes back in the chat they asked in, with the Word and Excel files emailed to them only.
   */
  private async write(open: any, kept: TheOutlineKept, channel: TheChannel): Promise<string> {
    const now = await this.sources(open.organizationId, open.userId, open.id, channel);
    const chosen = theChosenSources(kept.sections!, now);
    if (!this.extractor() || !chosen.length) return COULD_NOT_WRITE_IT;
    await this.db.reportOnRequest.update({ where: { id: open.id }, data: { status: 'writing' } });
    await this.unpark(open.organizationId, open.id, 'ACCEPTED');
    const writing = this.writeItNow(open, kept, chosen, channel).catch(async (err: any) => {
      this.logger.error(`A report on request could not be written: ${err?.message}`);
      await this.db.reportOnRequest.update({ where: { id: open.id }, data: { status: 'outline' } }).catch(() => undefined);
      await this.sayInTheChat(open, COULD_NOT_WRITE_IT).catch(() => undefined);
      return null;
    });
    this.writing.set(open.id, writing);
    void writing.finally(() => this.writing.delete(open.id));
    const documents = chosen.filter((s) => s.kind === 'material').length;
    return writingItNow(documents, channel);
  }

  /** Reports being written now, by request, so a test or a restart can wait for one. */
  private readonly writing = new Map<string, Promise<TheWrittenReport | null>>();
  whenWritten(requestId: string): Promise<TheWrittenReport | null> { return this.writing.get(requestId) ?? Promise.resolve(null); }

  /** Read across the set, write the report, keep it, and hand it back. */
  async writeItNow(open: any, kept: TheOutlineKept, chosen: ASource[], channel: TheChannel): Promise<TheWrittenReport | null> {
    const extract = this.extractor()!;
    const index = shortIdsFor(chosen);
    const readings = index.map(({ short, source }) => (source.reading ? aReadingForTheModel(short, source.name, source.reading) : `SOURCE ${short}: ${source.label}\n${source.text}`));
    const pa = await this.prompt(READ_ACROSS_KEY, READ_ACROSS_PROMPT);
    const across = theAcrossMadeSafe(await extract(pa.content, [{ role: 'user', content: theAcrossAsked({ asked: open.asked, readings }) }], READ_ACROSS_SCHEMA, { long: true }).catch(() => null), index);
    const p = await this.prompt(WRITE_THE_REPORT_KEY, WRITE_THE_REPORT_PROMPT);
    const raw = await extract(p.content, [{ role: 'user', content: theWritingAsked({ asked: open.asked, outline: kept.sections!, readings, across, index }) }], WRITE_THE_REPORT_SCHEMA, { long: true }).catch(() => null);
    const evidence = index.flatMap(({ source }) => (source.reading?.figures ?? []).filter((f) => f.working).map((f) => ({ figure: f.what, value: f.value, where: f.where, working: f.working ?? '', source: source.name })));
    const written = aWrittenReportFromTheReadings(raw, index, evidence);
    if (!written) throw new Error('the model wrote nothing that could be kept');
    const on = new Date();
    const who: any = await this.db.user.findUnique({ where: { id: open.userId }, select: { email: true } }).catch(() => null);
    const files = await theReportFiles(written, on);
    let emailedTo: string | null = null;
    if (who?.email && this.email) {
      const outcome = await this.email.sendTheYearEndFiles(who.email, written.title, theReportInTheChat(written, { on, documents: written.sources.length, emailedTo: null, channel: 'email' }), files, `report-on-request:${open.id}`, undefined, true).catch(() => null);
      if (outcome === 'sent' || outcome === 'held') emailedTo = who.email;
    }
    const text = theReportInTheChat(written, { on, documents: chosen.filter((s) => s.kind === 'material').length || chosen.length, emailedTo, channel });
    await this.db.reportOnRequest.update({ where: { id: open.id }, data: { status: 'built', report: text, written: written as any, builtAt: on, promptVersionId: p.id, sources: written.sources.map((s) => ({ id: s.id, kind: s.kind, label: s.label })) as any } });
    if (channel === 'chat') await this.sayInTheChat(open, text);
    if (beforeTheFinal(written).length) await this.offerTheCheckIns(open, written).catch(() => undefined);
    return written;
  }

  /** The offer at the end of the report waits for their answer in Ask, so a yes starts the set-up (assistant.service.ts). */
  private async offerTheCheckIns(open: any, written: TheWrittenReport): Promise<void> {
    const person: any = await this.db.person.findFirst({ where: { organizationId: open.organizationId, linkedUserId: open.userId }, select: { externalId: true } }).catch(() => null);
    if (!person?.externalId) return;
    await this.db.assistantProposal.create({ data: { organizationId: open.organizationId, personExternalId: person.externalId, kind: REPORT_GAPS_KIND, summary: `Shall I set up check-ins to ask the people who can close the gaps in "${written.title}" for the updates?`, payload: { requestId: open.id } } });
  }

  /**
   * WHAT THE CHECK-INS ARE FOR, in her words to the set-up: each gap to close before the final report and who can close it, as the report
   * said. The set-up by talking reads it like anything she types, and asks only for what is missing, such as how to reach each person.
   */
  async whatTheCheckInsAreFor(requestId: string): Promise<string | null> {
    const r: any = await this.db.reportOnRequest.findUnique({ where: { id: requestId }, select: { written: true } }).catch(() => null);
    const w = r?.written as TheWrittenReport | null;
    const gaps = w ? beforeTheFinal(w) : [];
    if (!gaps.length) return null;
    return `I want updates that close the gaps in my report "${w!.title}" before the final version. ${gaps.map((g) => `From ${g.who || 'whoever holds it'}, ${g.recordsNeeded.replace(/\.$/, '')}.`).join(' ')}`;
  }

  /** A turn of Ask's own, added to their conversation there, so the report is waiting in the chat when they look. */
  private async sayInTheChat(open: any, text: string): Promise<void> {
    const person: any = await this.db.person.findFirst({ where: { organizationId: open.organizationId, linkedUserId: open.userId }, select: { externalId: true } }).catch(() => null);
    if (!person?.externalId) return;
    await this.db.assistantTurn.create({ data: { organizationId: open.organizationId, personExternalId: person.externalId, role: 'assistant', content: text, lane: 'report_on_request', composedBy: 'model' } });
  }

  /* ------------------------------------------------------------------ what they add */

  /** Files and emails for the open request. Each is read once; the same thing sent twice is said to be had already. Null when no request is open. */
  async add(a: { organizationId: string; userId: string; via: AMaterialVia; files: AFileToRead[]; words?: { name: string; text: string } | null; channel: TheChannel }): Promise<WhatWasSaid | null> {
    const open = await this.openRequestOf(a.organizationId, a.userId);
    if (!open) return null;
    const w = { read: [] as string[], already: [] as string[], couldNotOpen: [] as string[] };
    /* The whole document is kept, and the file itself, so it can be read whole (reading-a-document.ts). Its reading starts now. */
    const keep = async (via: AMaterialVia, name: string, text: string, file?: AFileToRead) => {
      const contentHash = crypto.createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex');
      const label = aMaterialLabel(via, name);
      const had = await this.db.reportMaterial.findUnique({ where: { requestId_contentHash: { requestId: open.id, contentHash } } }).catch(() => null);
      if (had) { w.already.push(label); return; }
      const row = await this.db.reportMaterial.create({ data: { requestId: open.id, organizationId: a.organizationId, userId: a.userId, via, name: name.slice(0, 300), text, contentHash, bytes: file?.bytes ?? null, mimeType: file?.mimeType ?? null }, select: { id: true } });
      void this.readSoon(row.id);
      w.read.push(label);
    };
    if (a.words?.text?.trim()) await keep('email', a.words.name || 'with no subject', a.words.text);
    for (const f of a.files) {
      let text = '';
      try {
        if (f.bytes && this.documents) text = await this.documents.textOutOf({ originalname: f.name, mimetype: f.mimeType, buffer: f.bytes, size: f.bytes.length } as any);
      } catch (err: any) {
        this.logger.warn(`A file for a report could not be read: ${err?.message}`);
      }
      if (text.trim()) await keep(a.via === 'email' ? 'email-file' : a.via, f.name, text, f);
      else w.couldNotOpen.push(f.name);
    }
    await this.db.reportOnRequest.update({ where: { id: open.id }, data: { updatedAt: new Date() } }).catch(() => undefined);
    return { said: whatWasAddedSaid(w, a.channel) };
  }

  /* ------------------------------------------------------------------ the doors */

  /**
   * A MAIL TO THE ASSISTANT. With a request open, a forward or anything attached is material for it, and their own words are heard as in the
   * chat; at the first step, words that are not an instruction are kept too, since that is what they were asked to send. With none open, words
   * that ask for a report (read by the model, as in Ask) start one. Null when it is none of these, and the mail goes on as before.
   */
  async byEmail(a: { organizationId: string; userId: string; subject: string | null; newWords: string; wholeBody: string | null; hasFiles: boolean; files: () => Promise<AFileToRead[]> }): Promise<string | null> {
    const open = await this.openRequestOf(a.organizationId, a.userId);
    const forwarded = /^\s*(?:fwd?|fw)\s*:/i.test(a.subject ?? '') || /-{2,}\s*Forwarded message/i.test(a.wholeBody ?? '');
    const subject = String(a.subject ?? '').replace(/^\s*(?:(?:re|fwd?|fw)\s*:\s*)+/i, '').trim();
    const wordsOnly = !a.hasFiles && !forwarded && !!a.newWords.trim();
    if (open && wordsOnly) {
      const heard = await this.hear({ organizationId: a.organizationId, userId: a.userId, message: a.newWords, channel: 'email' });
      if (heard) return heard.said;
    }
    /* What they forward or attach while one is open is material for it, and so are their words while it is still gathering. */
    if (open && (!wordsOnly || open.status === 'gathering')) {
      const added = await this.add({ organizationId: a.organizationId, userId: a.userId, via: 'email', files: await a.files(), words: (forwarded ? a.wholeBody : a.newWords)?.trim() ? { name: subject, text: `Subject ${subject || 'none'}\n\n${forwarded ? a.wholeBody : a.newWords}` } : null, channel: 'email' });
      return added?.said ?? null;
    }
    /*
     * A REPORT ASKED FOR BY MAIL, also while another waits for its outline to be checked (release test of 22 November 2026, 106): Wairimu's
     * "can you write me a short report on how Sales team Q4 is going this month?" was not heard by the open one, and was answered "You have no
     * check-in open right now". The subject is part of what they asked: "Quarterly report for the board" in the subject and "can you draft it"
     * below was filed as a forwarded document, because only the words below were read (21 November 2026, item 106).
     */
    const asked = [subject, a.newWords.trim()].filter(Boolean).join('\n\n');
    if (a.hasFiles || forwarded || !asked) return null;
    const understood = await understandTheMessage(this.engine as any, this.prompts as any, asked).catch(() => null);
    if (understood?.kind !== 'report') return null;
    return (await this.start({ organizationId: a.organizationId, userId: a.userId, message: asked, channel: 'email', about: understood.about }))?.said ?? null;
  }

  /** WHATSAPP. A document sent while a request is open is material for it; words are heard as in the chat. Null when no request is open, or the words are about something else. */
  async onWhatsApp(a: { organizationId: string; userId: string; arrived: any; fetchMedia: (id: string) => Promise<{ buffer: Buffer; mimeType: string } | null> }): Promise<string | null> {
    const open = await this.openRequestOf(a.organizationId, a.userId);
    if (!open) return null;
    if (a.arrived?.kind === 'media' && a.arrived.what !== 'recording') {
      const fetched = await a.fetchMedia(a.arrived.mediaId).catch(() => null);
      const name = String(a.arrived.fileName ?? 'the document');
      const added = await this.add({ organizationId: a.organizationId, userId: a.userId, via: 'whatsapp', files: [{ name, mimeType: fetched?.mimeType ?? a.arrived.mimeType ?? 'application/octet-stream', bytes: fetched?.buffer ?? null }], channel: 'whatsapp' });
      return added?.said ?? null;
    }
    if (a.arrived?.kind === 'text') return (await this.hear({ organizationId: a.organizationId, userId: a.userId, message: a.arrived.text, channel: 'whatsapp' }))?.said ?? null;
    return null;
  }
}
