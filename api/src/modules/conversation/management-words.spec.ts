import { managementWordsIn, sayItInPlainWords } from './management-words';

describe('management words are not ours to bring in', () => {
  it('finds the ones Groundwork reached for itself, in any form', () => {
    expect(managementWordsIn('That plan is a concrete deliverable. What will you do next?')).toEqual(['deliverable']);
    expect(managementWordsIn('How many times did you have to escalate a problem with them?')).toEqual(['escalate']);
    expect(managementWordsIn('Where is the bottleneck, and who is waiting on it?')).toEqual(['bottleneck']);
  });

  it('leaves the word alone when the person used it first', () => {
    expect(managementWordsIn('How many deals in your pipeline are stuck?', ['I have eleven in the pipeline right now.'])).toEqual([]);
    expect(managementWordsIn('Who did you escalate it to?', ['I escalated it on Monday.'])).toEqual([]);
  });

  it('leaves ordinary sentences alone', () => {
    expect(managementWordsIn('What is holding the four approvals up, and since when?')).toEqual([]);
  });

  it('quotes the sentence and offers a plain way to say it', () => {
    const say = sayItInPlainWords(['deliverable'], 'Good. That plan is a concrete deliverable. What next?');
    expect(say).toContain('"That plan is a concrete deliverable."');
    expect(say).toContain('instead of "deliverable", say the piece of work');
  });
});

describe('and the check-in asks again when it reached for one', () => {
  it('is wired in before the other word guard, which stays last, on what the person has said', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const jargonHere = managementWordsIn\(screened\.text, theirWords\)/);
    expect(src).toMatch(/sayItInPlainWords\(jargonHere, screened\.text\)/);
    expect(src.indexOf('const jargonHere')).toBeLessThan(src.indexOf('const notOurWords = wordsWeDoNotUse'));
  });
});
