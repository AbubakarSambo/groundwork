import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE WIRING, WHICH IS WHERE THIS ACTUALLY BROKE.
 *
 * `isTheirs` refusing a fabricated sentence is worth nothing if the extractor never consults it, or
 * if it is handed the whole transcript to check against - the session's own words are in there, so
 * checking an entry against them would let every one of them pass.
 *
 * Comments stripped: this explanation names the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/*
 * The lines come from the conversation's assessment since F5 (theRecordLinesFromTheAssessment, the one owner for the record and the end
 * card); the end card's own model read (readTheRecord) is gone. The same checks hold on the one owner.
 */
const EXTRACT = SRC.slice(SRC.indexOf('private async theRecordLinesFromTheAssessment('), SRC.indexOf('private async theAssessmentAtTheClose('));
const ASSESS = readFileSync(join(__dirname, 'assess-the-conversation.ts'), 'utf8');

describe('what a record line is checked against', () => {
  it('finds the owner of the lines, so an empty slice cannot pass', () => {
    expect(EXTRACT.length).toBeGreaterThan(500);
  });

  it('checks each line before it is stored', () => {
    expect(EXTRACT).toContain('isTheirs(l.text, whatTheySaid)');
    expect(EXTRACT).toContain('aNameNobodyTyped(l.text, whatTheySaid, roster)');
  });

  it('checks it against their turns alone, never the whole transcript', () => {
    /* The session's words are in the transcript. Checking against that would pass everything. */
    expect(EXTRACT).toContain('role: TurnRole.PERSON');
    expect(EXTRACT).not.toContain('isTheirs(l.text, transcript)');
  });

  it('the assessment still reads both speakers, because a short answer needs its question', () => {
    /* "All three of the above" means nothing on its own. Removing the session's side is a different way of losing what somebody said. */
    expect(ASSESS).toContain("turns.push({ role: 'groundwork', content })");
    expect(ASSESS).toContain("turns.push({ role: 'person', content, n })");
  });
});
