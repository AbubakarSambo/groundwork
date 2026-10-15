import * as fs from 'fs';
import * as path from 'path';
import { defaultVisibilityForUpload, mayBeQuotedAsSomebodysWords } from './a-document-is-context';
import { canSeeDocument } from './who-can-see-a-document';
import { DocumentVisibility } from '@prisma/client';

/**
 * THE SIX PROMISES THE CONTEXT PAGE MAKES, IN ONE PLACE.
 *
 * The design lists them as a set - "the guarantees this page has to keep" - and each is enforced
 * somewhere sensible: a visibility function, a default, a query filter, a prompt block, a 404 message.
 * Five files, no single place saying they are ONE contract.
 *
 * That matters because the page's whole claim is a trade: put real material in, and the questions get
 * better. Somebody only takes that trade if the limits hold, and a limit nobody can see the whole of
 * is a limit that erodes one reasonable-looking change at a time.
 *
 * This file does not re-implement any of them. It asserts each still holds, and names what breaks if
 * it stops.
 */
const read = (p: string) =>
  fs.readFileSync(path.join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const GROUNDS = read('../grounds/grounds.service.ts');
const PROMPTS = read('../conversation/prompt-library.ts');
const DOCS = read('./documents.service.ts');

describe('the context page keeps its promises', () => {
  /**
   * 1. A PERSON NEVER SEES A NOTE WRITTEN ABOUT THEM.
   * Enforced in the QUERY, so a later view that forgets to filter cannot leak it.
   */
  it('a person never sees a note written about them', () => {
    const readBack = GROUNDS.slice(
      GROUNDS.indexOf('const leadContextNotes ='),
      GROUNDS.indexOf('const { patternDetections'),
    );
    expect(readBack).toContain('audience: ContextNoteAudience.EVERYONE');
  });

  /**
   * 2. A NOTE CAN NEVER BE QUOTED, ATTRIBUTED, OR STATED AS FACT.
   * The limit travels in the same prompt block as the text, because the model has the sentence in
   * front of it and no memory of where it came from.
   */
  it('a note can never be quoted, attributed, or stated as fact', () => {
    const block = PROMPTS.slice(PROMPTS.indexOf('SHARED_NOTE -'), PROMPTS.indexOf('SHARED_NOTE -') + 900);
    expect(block).toMatch(/never quote it/i);
    expect(block).toMatch(/never attribute it/i);
    expect(block).toMatch(/NOT evidence/i);
  });

  /**
   * 3. A DOCUMENT IS PRIVATE UNTIL ITS OWNER OPENS IT, AND ONLY ITS OWNER CAN.
   * The tempting change is to default a lead's upload to open. G24 rule 3 refuses it: a performance
   * plan or a note about somebody's health dropped into shared context cannot be recalled.
   */
  it('a document is private until its owner opens it', () => {
    expect(defaultVisibilityForUpload()).toBe(DocumentVisibility.OWN);
    const mine = { participantId: 'p1', visibility: DocumentVisibility.OWN };
    expect(canSeeDocument(mine, { participantId: 'p1', isLead: false }, true)).toBe(true);
    expect(canSeeDocument(mine, { participantId: 'p2', isLead: false }, true)).toBe(false);
    /** Not even the lead, and that is the point of OWN rather than CLOSED. */
    expect(canSeeDocument(mine, { participantId: 'p2', isLead: true }, true)).toBe(false);
  });

  /**
   * 4. A REFUSAL NEVER CONFIRMS THAT A DOCUMENT EXISTS.
   * "Not yours" tells somebody a document exists, which is itself the leak.
   */
  it('a refusal never confirms a document exists', () => {
    expect(DOCS).toContain("throw new NotFoundException('That document could not be found, so refresh the page to see what is there now.')");
    expect(DOCS).not.toMatch(/ForbiddenException\('That document is not yours/);
  });

  /**
   * 5. WHAT A PERSON SAYS UNDER QUESTIONING IS THE ONLY THING THAT BECOMES THEIR ACCOUNT.
   * A note between sessions reaches the session as something to ASK about, once - never as a claim
   * they made.
   */
  it('a note between sessions is a question, not an account', () => {
    const CONV = read('../conversation/conversation.service.ts');
    expect(CONV).toContain('carriedIntoCheckInId: null');
  });

  /**
   * 6. WIDENING THE AUDIENCE NEVER WIDENS THE USE.
   * The one that made a shared note feel impossible until the two axes were separated. A document can
   * be evidence; words somebody typed about a situation cannot be, however many people read them.
   */
  it('widening the audience never widens the use', () => {
    expect(mayBeQuotedAsSomebodysWords({ text: 'x', source: 'document' })).toBe(false);
    expect(mayBeQuotedAsSomebodysWords({ text: 'x', source: 'account' })).toBe(true);
    /** And a note addressed to everyone is still refused as a public judgement of one person. */
    const write = GROUNDS.slice(GROUNDS.indexOf('async addLeadContext('));
    expect(write).toContain('audience === ContextNoteAudience.EVERYONE && dto.participantId');
  });
});
