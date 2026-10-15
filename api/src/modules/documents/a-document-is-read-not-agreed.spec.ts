import { theStreamedRouteRunsThePlainRoute } from '../conversation/__fixtures__/the-streamed-route-is-the-plain-route';
import * as fs from 'fs';
import * as path from 'path';
import { whatWasRecordedFromADocument } from './what-was-recorded-from-a-document';

/**
 * READING A DOCUMENT IS NOT AGREEING TO IT.
 *
 * Driven in the browser, 22 September 2026. A sheet of Q4 targets was attached in the middle of a
 * check-in. Nineteen rows appeared on the record - three for the team, three each for two people -
 * and the conversation then said: "Here is the context we have from harvestline-q4-targets.xlsx...
 * Is that right?"
 *
 * The question was about something already done. A target is the yardstick somebody is read against,
 * and every other path in this product asks first: a paste proposes and writes on a yes. So the read
 * waits on the document, with the owner it resolved, and the conversation writes it when a person
 * says yes.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DOCS = strip(fs.readFileSync(path.join(__dirname, 'documents.service.ts'), 'utf8'));
const CONVO = strip(fs.readFileSync(path.join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8'));
/*
 * Decision 50, task A (30 Sep 2026): the write itself - createMany, the takenAt stamp, the dedupe -
 * moved out of whatTheDocumentWaitsFor into write-a-documents-numbers.ts, so Ask Groundwork's yes
 * writes through the SAME code the setup chat and the check-in already used, instead of a third
 * copy. What used to be asserted inside whatTheDocumentWaitsFor's own text now lives here.
 */
const WRITER = strip(fs.readFileSync(path.join(__dirname, 'write-a-documents-numbers.ts'), 'utf8'));

describe('a document is read, not agreed', () => {
  it('reading writes no target at all', () => {
    const reader = DOCS.slice(DOCS.indexOf('private async whatItHolds('));
    expect(reader).not.toContain('groundObjective.createMany');
    expect(reader).not.toContain('groundObjective.create(');
    /* What it found waits on the document, owner already resolved. */
    expect(reader).toContain('const waiting = toWrite.map(');
    expect(reader).toContain('takenAt: null');
  });

  it('and the conversation writes them on a yes, once, through the one shared writer', () => {
    const waits = CONVO.slice(CONVO.indexOf('private async whatTheDocumentWaitsFor('), CONVO.indexOf('private async composeSystemPrompt('));
    expect(waits).toContain('if (holds.takenAt || !waiting.length) continue');
    expect(waits).toContain('writeADocumentsNumbers(this.prisma');
    /* The actual write - createMany, the takenAt stamp, dedupe - lives in the shared file, once. */
    expect(WRITER).toContain('groundObjective.createMany');
    /* Only once: the document is stamped, so a second yes writes nothing. */
    expect(WRITER).toContain('takenAt: new Date().toISOString()');
    /* Nothing twice, and nothing this document did not hold. */
    expect(WRITER).toContain('held.has(');
    expect(WRITER).toContain('name: w.name.slice(0, 120)');
  });

  it('the yes is a yes, not any answer', () => {
    const waits = CONVO.slice(CONVO.indexOf('private async whatTheDocumentWaitsFor('), CONVO.indexOf('private async composeSystemPrompt('));
    /* Changed 29 Sep 2026 (week 14): the yes is read in yes-but-a-new-number, so a "yes, but it's 45 now" keeps its number. */
    expect(waits).toContain('startsWithAYes(answer)');
    expect(waits).toContain('whatTheYesSays(answer, waiting)');
    const YES = fs.readFileSync(path.join(__dirname, '..', 'conversation', 'yes-but-a-new-number.ts'), 'utf8');
    expect(YES).toMatch(/\^\(yes\|yep\|yeah/);
  });

  it('and the receipt says whose numbers went where, and what nobody is measured against yet', () => {
    /* Changed 30 Sep 2026: whatWasRecordedFromADocument is now called from the shared writer, once, for every caller. */
    expect(WRITER).toContain('whatWasRecordedFromADocument(');
    const said = whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 2, forEveryone: 1, reader: 'check-in' });
    expect(said).toBe('I have recorded this from Q3 targets.pdf. Two numbers are now set, each for the person it belongs to. One number is for the whole check-in, and everybody here sees it. Nobody is measured against a number until they have seen it.');
  });

  it('and it is wired into the turn that answers the question, on BOTH paths', () => {
    expect(CONVO).toContain('const tookTheNumbers = await this.whatTheDocumentWaitsFor(checkIn as any, message)');
    /* Changed 4 October 2026: a long paste from the lead is told where it can be put, in the same place
       (a-long-paste-from-the-lead-has-a-better-door). The document's numbers are still first. */
    /* Changed 5 October 2026: the anchor's offer answer (request 149) is said after them; the document's numbers are still first. */
    expect(CONVO).toContain('[contextNotSaid, tookTheNumbers, whereToTakeIt, offerAnswered.weSay, withRoomLeft].filter(Boolean)');
    /*
     * The screen streams. Wiring only the non-streaming path meant a lead said yes in the browser,
     * read "Great. What moved this week?", and nothing was written - found by doing it, not by
     * reading it.
     */
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect(theStreamedRouteRunsThePlainRoute(CONVO)).toBe(true);
  });

  it("and what we said before the model spoke survives the end of the stream", () => {
    /*
     * `done` carries the whole reply and the page replaces the streamed text with it, so a delta
     * that is not folded into `reply` is wiped when the stream finishes. Read in the browser: nine
     * targets were written and the screen said only "Right. The Q4 targets are clear."
     */
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    const plain = CONVO.slice(CONVO.indexOf('async sendMessage(checkInId'), CONVO.indexOf('async *sendMessageStream('));
    /* Changed 4 October 2026: see above. */
    /* Changed 5 October 2026: see above. */
    expect(plain).toContain("const ourOwnWords = [contextNotSaid, tookTheNumbers, whereToTakeIt, offerAnswered.weSay].filter(Boolean).join('\\n\\n')");
    expect(plain).toContain('data: { content: `${ourOwnWords}');
    expect(theStreamedRouteRunsThePlainRoute(CONVO)).toBe(true);
  });
});
