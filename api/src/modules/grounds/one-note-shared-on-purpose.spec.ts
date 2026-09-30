import * as fs from 'fs';
import * as path from 'path';

/**
 * SHARING IS ONE ACT, ON ONE NOTE, BY THE PERSON WHOSE WORDS THEY ARE.
 *
 * Everything a paste writes is the lead's own note, private - so a lead who had just handed over
 * twelve ways of working and six open decisions had a team board with none of them on it. A default
 * would be worse: "we sort of agreed" must not become the team's rules because a product decided it.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const SRC = strip(fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8'));

describe('one note, shared on purpose', () => {
  /* To the next method, which is now changeContextLine: a line of a bucket, changed by id. */
  const body = SRC.slice(SRC.indexOf('async shareLeadContext('), SRC.indexOf('async changeContextLine('));

  /**
   * DECISION 63, 30 September 2026: narrowed from "the lead, or any admin of the organisation, at
   * any time" to "the lead, or - only once the lead has left the organisation - an admin of it",
   * through the one shared gate `mayConfirmSetupOn` every setup writer in grounds.service.ts now
   * calls. Updated rather than removed: the finding this test protects (an org admin can share a
   * note in the lead's place at all) is still true, only narrower now.
   */
  it('is the lead\'s, or - once the lead has left the organisation - an admin of theirs', () => {
    expect(body).toContain('this.mayConfirmSetupOn(ground, requestingUserId)');
    expect(body).not.toContain('adminsThisOrg(viewer, ground)');
  });

  it('refuses a note about one person, rather than publishing a judgement of them', () => {
    expect(body).toContain('if (note.participantId)');
    expect(body).toContain('A note everyone reads is about the whole check-in, not about one person');
  });

  /**
   * Sets the audience, and - decision 63 - who confirmed it in the lead's place, if anybody did;
   * never the note's text itself, which stays the lead's own words, unedited.
   */
  it('sets the audience and who confirmed it, and nothing else', () => {
    expect(body).toContain('data: { audience: ContextNoteAudience.EVERYONE, confirmedByAdminNote }');
    expect(body).not.toMatch(/data: \{[^}]*text:/);
  });

  it('and says so rather than writing twice when it is already shared', () => {
    expect(body).toContain('alreadyShared: true');
  });

  it('the route is a post on the note, not a patch on the ground', () => {
    const ctrl = strip(fs.readFileSync(path.join(__dirname, 'grounds.controller.ts'), 'utf8'));
    expect(ctrl).toContain("@Post(':id/lead-context/:noteId/share')");
  });

  it('and the board reads only the decisions that were shared', () => {
    const board = strip(fs.readFileSync(path.join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
    const reads = board.slice(board.indexOf('private async whatTheLeadSaysIsStillToDecide('), board.indexOf('private deriveDecisions('));
    expect(reads).toContain("audience: 'EVERYONE' as any");
    /* By kind since the blobs became lines, so nothing depends on an opening sentence. */
    expect(reads).toContain("kind: 'DECISION' as any");
    expect(reads).toContain('closedAt: null');
  });
});
