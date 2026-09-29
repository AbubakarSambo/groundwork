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

/* The read itself lives in readTheRecord since the end card (task 2.7); extractRecordEntries is that read and one write. */
const EXTRACT = SRC.slice(SRC.indexOf('private async readTheRecord('), SRC.indexOf('return valid.map((e) =>'));

describe('what an extracted entry is checked against', () => {
  it('finds the extractor, so an empty slice cannot pass', () => {
    expect(EXTRACT.length).toBeGreaterThan(500);
  });

  it('checks each entry before it is stored', () => {
    expect(EXTRACT).toContain('isTheirs(e.text, whatTheySaid)');
  });

  it('checks it against their turns alone, never the whole transcript', () => {
    /* The session's words are in the transcript. Checking against that would pass everything. */
    expect(EXTRACT).toContain("turns.filter((t) => t.role !== TurnRole.AI)");
    expect(EXTRACT).not.toContain('isTheirs(e.text, transcript)');
  });

  it('still gives the model both speakers, because a short answer needs its question', () => {
    /* "All three of the above" means nothing on its own. Removing the session's side is a different
       way of losing what somebody said. */
    expect(EXTRACT).toContain("t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'");
  });

  it('and tells it which speaker is the party', () => {
    expect(EXTRACT).toContain('${ONLY_THEIR_WORDS}');
  });

  it('says out loud when it drops something, rather than silently', () => {
    /* It is how anybody finds out the extractor has started reaching for the session's words. */
    expect(EXTRACT).toContain('Dropped ${dropped} extracted entr');
  });
});
