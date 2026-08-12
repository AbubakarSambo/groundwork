import { readFileSync } from 'fs';
import { join } from 'path';
import { buildNotesBlock } from './between-session-notes';

/**
 * A NOTE WRITTEN BETWEEN SESSIONS IS NOT PART OF THE RECORD.
 *
 * The ground reads like a channel now, and a channel invites you to type. Between
 * sessions there is no check-in to type into, so the composer accepts a private
 * note instead of showing a dead input.
 *
 * THE WHOLE RISK IS IN WHERE THAT SENTENCE GOES. `RecordEntry` is the obvious
 * home and the wrong one: `reports.service.ts` reads it to build the shared
 * report, and `context.service.ts` reads the OTHER party's entries. So a note
 * stored there would become part of an account that gets compared against
 * somebody else's - a claim nobody asked for, nobody probed, and nobody can now
 * separate from the things that were said under questioning.
 *
 * That is the failure this product exists to prevent, so it is guarded in code
 * rather than by remembering. The note gets its own table, and it reaches a
 * session as a QUESTION TO ASK rather than a fact to accept.
 */
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const GROUNDS = readFileSync(join(__dirname, '../grounds/grounds.service.ts'), 'utf8');
const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');

describe('where a between-session note is stored', () => {
  it('has a table of its own', () => {
    expect(SCHEMA).toContain('model ParticipantNote');
  });

  it('and writing one never touches the record', () => {
    // addMyNote must create a ParticipantNote and nothing else. A recordEntry.create
    // anywhere in that method is the bug this file exists for.
    const method = GROUNDS.slice(GROUNDS.indexOf('async addMyNote('), GROUNDS.indexOf('async getMyNotes('));
    expect(method).toContain('participantNote.create');
    expect(method).not.toContain('recordEntry');
  });

  it('and one person cannot delete or read another person\'s', () => {
    const del = GROUNDS.slice(GROUNDS.indexOf('async deleteMyNote('), GROUNDS.indexOf('async getMySpecificity('));
    // Scoped by participantId as well as id, so an id guessed from elsewhere fails.
    expect(del).toMatch(/where: \{ id: noteId, participantId: participant\.id \}/);
    const read = GROUNDS.slice(GROUNDS.indexOf('async getMyNotes('), GROUNDS.indexOf('async deleteMyNote('));
    expect(read).toContain('participantId: participant.id');
  });
});

describe('what a note actually says to the engine', () => {
  // The assembled text, not the code that assembles it. Proving this at the source
  // was the first version of this file, and it failed on its own concatenation -
  // which is the argument for testing the string.
  const block = buildNotesBlock([{ text: 'the deadline moved and nobody said so' }]);

  it('quotes the note', () => {
    expect(block).toContain('- "the deadline moved and nobody said so"');
  });

  it('says plainly that nothing in it has been checked', () => {
    expect(block).toContain('These are notes, not answers.');
    expect(block).toContain('nothing in them has been checked');
  });

  it('forbids the two different failures', () => {
    // Putting it on record is the record being corrupted. Reading it back as
    // though they said it is the engine putting words in their mouth, which the
    // product's rules forbid everywhere else too.
    expect(block).toContain('Do not put any of it on record as established.');
    expect(block).toContain('Do not read it back as though they told you.');
  });

  it('asks for a question in the engine\'s own words', () => {
    expect(block).toContain('Raise what is relevant as a question, in your own words');
    expect(block).toContain('let what they say under');
  });

  it('and lets a note that does not matter go', () => {
    // Without this the engine has to do something with every note, which turns a
    // scratch thought into an agenda item.
    expect(block).toContain('If a note turns out not to matter, let it go.');
  });

  it('is empty when there are no notes, so nothing is appended', () => {
    expect(buildNotesBlock([])).toBe('');
    expect(buildNotesBlock([{ text: '   ' }])).toBe('');
  });
});

describe('the block reaches the assembled prompt', () => {
  it('is concatenated, not just built', () => {
    // The lesson from the ensureNextSession fix: a block that is built and never
    // concatenated is a comment with extra steps.
    expect(SERVICE).toMatch(/docPromptHint, notesBlock\]\.filter\(Boolean\)\.join/);
  });

  it('reads only notes no session has picked up', () => {
    expect(SERVICE).toContain('carriedIntoCheckInId: null');
  });

  it('and marks them carried, so they are raised once', () => {
    expect(SERVICE).toMatch(/participantNote\s*\n?\s*\.updateMany\(/);
  });
});
