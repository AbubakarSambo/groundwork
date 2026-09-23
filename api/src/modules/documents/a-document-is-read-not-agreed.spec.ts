import * as fs from 'fs';
import * as path from 'path';

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

describe('a document is read, not agreed', () => {
  it('reading writes no target at all', () => {
    const reader = DOCS.slice(DOCS.indexOf('private async whatItHolds('));
    expect(reader).not.toContain('groundObjective.createMany');
    expect(reader).not.toContain('groundObjective.create(');
    /* What it found waits on the document, owner already resolved. */
    expect(reader).toContain('const waiting = toWrite.map(');
    expect(reader).toContain('takenAt: null');
  });

  it('and the conversation writes them on a yes, once', () => {
    const waits = CONVO.slice(CONVO.indexOf('private async whatTheDocumentWaitsFor('), CONVO.indexOf('private async composeSystemPrompt('));
    expect(waits).toContain('groundObjective.createMany');
    /* Only once: the document is stamped, so a second yes writes nothing. */
    expect(waits).toContain('takenAt: new Date().toISOString()');
    expect(waits).toContain('if (holds.takenAt || !waiting.length) continue');
    /* Nothing twice, and nothing this document did not hold. */
    expect(waits).toContain('held.has(');
    expect(waits).toContain('name: w.name.slice(0, 120)');
  });

  it('the yes is a yes, not any answer', () => {
    const waits = CONVO.slice(CONVO.indexOf('private async whatTheDocumentWaitsFor('), CONVO.indexOf('private async composeSystemPrompt('));
    expect(waits).toMatch(/\^\(yes\|yep\|yeah/);
  });

  it('and the receipt says whose numbers went where, and what nobody is measured against yet', () => {
    const waits = CONVO.slice(CONVO.indexOf('private async whatTheDocumentWaitsFor('), CONVO.indexOf('private async composeSystemPrompt('));
    expect(waits).toContain('against the person who holds');
    expect(waits).toContain('for the whole check-in, which everybody here sees');
    expect(waits).toContain('Nobody is measured against any of it until they have seen it');
  });

  it('and it is wired into the turn that answers the question, on BOTH paths', () => {
    expect(CONVO).toContain('const tookTheNumbers = await this.whatTheDocumentWaitsFor(checkIn as any, message)');
    expect(CONVO).toContain('[contextNotSaid, tookTheNumbers, withRoomLeft].filter(Boolean)');
    /*
     * The screen streams. Wiring only the non-streaming path meant a lead said yes in the browser,
     * read "Great. What moved this week?", and nothing was written - found by doing it, not by
     * reading it.
     */
    expect(CONVO).toContain('const tookFromTheSheet = await this.whatTheDocumentWaitsFor(checkIn as any, message)');
    const stream = CONVO.slice(CONVO.indexOf('async *sendMessageStream('));
    expect(stream).toContain('tookFromTheSheet');
  });

  it("and what we said before the model spoke survives the end of the stream", () => {
    /*
     * `done` carries the whole reply and the page replaces the streamed text with it, so a delta
     * that is not folded into `reply` is wiped when the stream finishes. Read in the browser: nine
     * targets were written and the screen said only "Right. The Q4 targets are clear."
     */
    const stream = CONVO.slice(CONVO.indexOf('async *sendMessageStream('));
    expect(stream).toContain("const ourOwnWords = [contextFirst, tookFromTheSheet].filter(Boolean).join('\\n\\n')");
    expect(stream).toContain('if (ourOwnWords) reply = `${ourOwnWords}');
    /* Folded in BEFORE the turn is written, so the transcript holds it too. */
    expect(stream.indexOf('const ourOwnWords')).toBeLessThan(stream.indexOf('const streamAiTurn = await this.prisma.conversationTurn.create('));
  });
});
