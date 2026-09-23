import * as fs from 'fs';
import * as path from 'path';

/**
 * A TO-DO IS MOVED BY THE PERSON IT BELONGS TO, AND BY NOBODY ELSE.
 *
 * Not even the lead. It is the difference between a record and a manager's checklist, and it is
 * Hafsah's own framing of what this product is for: "accountability becomes 'did you do your task'
 * rather than 'did we achieve the thing'". The second question only stays the question if the person
 * doing the thing owns the answer to the first.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = strip(fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8'));
const BODY = SRC.slice(SRC.indexOf('async setMyCommitment('), SRC.indexOf('async changeContextLine('));

describe('a to-do is moved by whose it is', () => {
  it('four states, and nothing invented', () => {
    expect(BODY).toContain("['DONE', 'NOT_DONE', 'DROPPED', 'UNKNOWN'].includes(clean)");
    /* UNKNOWN is a state to return to: "actually, not yet" is a correction. */
    expect(BODY).toContain('UNKNOWN');
  });

  it('refuses somebody else\'s, in as many words', () => {
    expect(BODY).toContain('!me || me.id !== row.participantId');
    expect(BODY).toContain('the difference between a record and a checklist');
    expect(BODY).toContain('ForbiddenException');
  });

  it('and an unowned one is a question about ownership, not a refusal', () => {
    expect(BODY).toContain('Nobody owns this one yet');
  });

  it('the route is on the commitment, and the lead has no override', () => {
    const ctrl = strip(fs.readFileSync(path.join(__dirname, 'grounds.controller.ts'), 'utf8'));
    expect(ctrl).toContain("@Patch(':id/commitments/:itemId')");
    /* No second route that sets somebody else's state. */
    expect(ctrl).not.toMatch(/commitments\/:itemId\/(status|done|complete)/);
  });

  it('and the card only offers the control on your own row', () => {
    const card = fs.readFileSync(path.join(__dirname, '../../../../client/src/components/gw/EachPerson.tsx'), 'utf8');
    expect(card).toContain('{isMe && onSetToDo && (');
    expect(card).toContain('A lead cannot mark somebody else\'s work done');
  });
});
