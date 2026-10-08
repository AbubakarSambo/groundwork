import * as fs from 'fs';
import * as path from 'path';

/**
 * A NOTE THE TEAM CAN READ, AND THE TWO AXES THAT MAKE IT SAFE.
 *
 * THE GAP. Every context note was lead-only. A lead who wanted to tell the team the situation in
 * words had no way to do it - the only shareable context was a file, which they then had to remember
 * to open. So leads wrote a private note and reasonably expected it to be seen. The missing thing was
 * never a permission; it was a destination.
 *
 * WHY IT FELT IMPOSSIBLE BEFORE. Visibility and quotability were treated as one thing, so "everyone
 * can read it" sounded like "it can be used against somebody". They are separate axes:
 *
 *   WHO CAN SEE IT   is a choice, made per item.
 *   WHETHER IT CAN BE QUOTED  is fixed by what kind of thing it is.
 *
 * A document can be quoted as evidence. Words somebody typed about a situation never can, however
 * widely they are shared. So a note everyone reads is still not a fact about anybody, and widening
 * the audience never widens the use.
 */
const SERVICE = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const SCHEMA = fs.readFileSync(path.join(__dirname, '../../../prisma/schema.prisma'), 'utf8');

describe('a note the team can read', () => {
  it('a note carries an audience, and it starts lead-only', () => {
    expect(SCHEMA).toContain('enum ContextNoteAudience');
    expect(SCHEMA).toMatch(/audience\s+ContextNoteAudience\s+@default\(LEAD_ONLY\)/);
  });

  /**
   * THE BOUNDARY IS IN THE QUERY. A non-lead's read is filtered in the database, so a private note
   * cannot reach them even if some later view forgets to filter. A boundary a render is responsible
   * for is a boundary that eventually leaks - this repository has found that twice.
   */
  it('a non-lead reads only what was addressed to everyone, filtered at the query', () => {
    const read = SERVICE.slice(
      SERVICE.indexOf('const leadContextNotes ='),
      SERVICE.indexOf('const { patternDetections'),
    );
    expect(read).toContain('audience: ContextNoteAudience.EVERYONE');
    expect(read).toMatch(/isInitiatorViewer/);
  });

  /**
   * A note ABOUT somebody, published to everybody, is a public judgement of them. It is refused
   * outright rather than quietly saved without the participant, because silently changing what
   * somebody wrote is its own failure.
   */
  it('refuses a shared note aimed at one named person', () => {
    const write = SERVICE.slice(SERVICE.indexOf('async addLeadContext'));
    expect(write).toContain("audience === ContextNoteAudience.EVERYONE && dto.participantId");
    expect(write).toContain('BadRequestException');
  });

  /** The refusal names both places the lead can actually say that thing. */
  it('and the refusal says where that belongs instead', () => {
    const write = SERVICE.slice(SERVICE.indexOf('async addLeadContext'));
    const refusal = write.slice(write.indexOf('A note everyone reads is about'), write.indexOf('A note everyone reads is about') + 400);
    expect(refusal).toMatch(/say it in your own check-in/i);
    expect(refusal).toMatch(/keep this note private/i);
  });

  /** Nothing existing becomes visible: the migration adds the column defaulted to lead-only. */
  it('no note that already exists changes audience', () => {
    const dir = path.join(__dirname, '../../../prisma/migrations/20260826000000_shared_context_note');
    const sql = fs.readFileSync(path.join(dir, 'migration.sql'), 'utf8');
    expect(sql).toMatch(/NOT NULL DEFAULT 'LEAD_ONLY'/);
  });
});
