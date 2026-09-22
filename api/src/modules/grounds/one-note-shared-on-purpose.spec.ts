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
  const body = SRC.slice(SRC.indexOf('async shareLeadContext('), SRC.indexOf('async addLeadContext('));

  it('is the lead\'s, or an admin of their organisation', () => {
    expect(body).toContain('ground.initiatorId !== requestingUserId && !adminsThisOrg(viewer, ground)');
  });

  it('refuses a note about one person, rather than publishing a judgement of them', () => {
    expect(body).toContain('if (note.participantId)');
    expect(body).toContain('A note everyone reads is about the whole check-in, not about one person');
  });

  it('sets the audience and nothing else', () => {
    expect(body).toContain('data: { audience: ContextNoteAudience.EVERYONE }');
    expect(body).not.toMatch(/data: \{[^}]*text:/);
  });

  it('and says so rather than writing twice when it is already shared', () => {
    expect(body).toContain('alreadyShared: true');
  });

  it('the route is a post on the note, not a patch on the ground', () => {
    const ctrl = strip(fs.readFileSync(path.join(__dirname, 'grounds.controller.ts'), 'utf8'));
    expect(ctrl).toContain("@Post(':id/lead-context/:noteId/share')");
  });

  it('and the board reads only what was shared', () => {
    const board = strip(fs.readFileSync(path.join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
    const reads = board.slice(board.indexOf('private async whatTheLeadSaysIsStillToDecide('), board.indexOf('private deriveDecisions('));
    expect(reads).toContain("audience: 'EVERYONE' as any");
    expect(reads).toContain('STILL_TO_DECIDE_OPENS');
  });
});
