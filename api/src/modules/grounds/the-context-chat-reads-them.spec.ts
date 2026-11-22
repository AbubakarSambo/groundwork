import { whatTheDocumentsSay, stillNeedsSomethingInWriting, NOTHING_ATTACHED, READ_THEM_BACK } from './what-the-documents-say';
import { contextGaps } from './the-context-chat';
import { readFileSync } from 'fs';
import { join } from 'path';

const doc = (fileName: string, uploaderNote?: string) => ({ fileName, content: 'the text', uploaderNote });

describe('the context chat is given the documents, not a count of them', () => {
  it('names what is attached', () => {
    const out = whatTheDocumentsSay([doc('brief.pdf'), doc('scope.docx')], 'THE TEXT');
    expect(out).toContain('WHAT THEY HAVE ATTACHED: brief.pdf, scope.docx.');
    expect(out).toContain('THE TEXT');
  });

  it('carries what they asked to be looked for', () => {
    const out = whatTheDocumentsSay([doc('spec.pdf', 'the interface dates in section 4')], 'x');
    expect(out).toContain('For "spec.pdf" they asked you to look for: the interface dates in section 4');
  });

  it('tells it to say back what it read, which is the whole point', () => {
    /* Somebody who just uploaded forty pages has no way to know it got the right half. */
    const out = whatTheDocumentsSay([doc('brief.pdf')], 'x');
    expect(out).toContain(READ_THEM_BACK);
    expect(READ_THEM_BACK).toContain('say what is in it');
    expect(READ_THEM_BACK).toContain('ask them to correct anything you have wrong');
  });

  it('and forbids treating a document as agreement', () => {
    /* A brief is what one person wrote down, usually before the others arrived. */
    expect(READ_THEM_BACK).toContain('reading it does not make it agreed');
    expect(READ_THEM_BACK).toContain('never treat it as somebody\'s objective');
  });

  it('asks once when nothing is attached, and does not nag', () => {
    expect(whatTheDocumentsSay([], 'x')).toBe(NOTHING_ATTACHED);
    expect(NOTHING_ATTACHED).toContain('take no for an answer');
  });
});

describe('the gap closes on having read it, not on a file existing', () => {
  it('is open when nothing is attached', () => {
    expect(stillNeedsSomethingInWriting(0, false)).toBe(true);
    expect(stillNeedsSomethingInWriting(0, true)).toBe(true);
  });

  it('stays open when a file exists and nothing has read it', () => {
    /* The old test was `count === 0`, so attaching a file closed the gap and the chat went quiet
       without being any better informed. */
    expect(stillNeedsSomethingInWriting(2, false)).toBe(true);
  });

  it('closes only when both are true', () => {
    expect(stillNeedsSomethingInWriting(2, true)).toBe(false);
  });

  it('and the gap says which of the two is missing', () => {
    const unread = contextGaps({
      partyCount: 2, hasSuccessDefinition: true, conditionCount: 1, hasStartingPosition: true,
      cadence: 'FORTNIGHTLY', timelineDays: 90, perPersonObjectiveCount: 2,
      openDocumentCount: 1, documentsWereRead: false,
    } as any).find((g) => g.key === 'documents');
    expect(unread?.ask).toContain('nothing has read it yet');
  });
});

describe('and it is wired', () => {
  const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '');

  it('reads the documents rather than counting them', () => {
    expect(SRC).toContain('const openDocuments = await this.prisma.groundDocument.findMany(');
    expect(SRC).toContain('select: { fileName: true, content: true, uploaderNote: true, ...WITH_ITS_READING }');
  });

  it('bounds them the way the check-in does, and says what did not fit', () => {
    expect(SRC).toContain('whatFitsInTheRoom(openDocuments as any)');
    expect(SRC).toContain('tellThemWhatIsMissing(fitted.leftOut)');
  });

  it('says it read them only when it actually has them', () => {
    /*
     * A hardcoded `true` here would close the "something in writing" gap forever while the chat
     * still had nothing - the exact bug being fixed, reintroduced one line lower. It must be
     * derived from the documents that were fetched.
     */
    expect(SRC).toContain('documentsWereRead: openDocuments.length > 0');
  });

  it('appends them after the refusals rather than before', () => {
    /* The rules about what this conversation may not do stay the first thing the model reads. */
    /* `alreadyHolds` joined the call on 22 September 2026 so the opener says what is here rather
       than greeting somebody who has just pasted a quarter in. The order is what this pins. */
    /* `onRecord` joined it too: the one control on the page could not read the page, so "are these
       targets right?" was unanswerable. Everything in it is already on the lead's screen. */
    expect(SRC).toContain('${contextChatPrompt(ground.label, ground.scenario, gaps, alreadyHolds, onRecord)}${expectationRule}\\n\\n${documentBlock}');
  });
});
