import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A HUNDRED PEOPLE THROUGH ONE LINK WAIT FOR ONE SENTENCE, ONCE.
 *
 * Measured on her own link, 23 September 2026: fourteen to eighteen seconds before the first
 * question appeared. An opener is composed from the brief and the scenario and nothing else -
 * somebody who followed a link has told us nothing to compose against - so it was the same sentence
 * written a hundred times, each time at the one moment in the conversation where nobody has
 * invested anything yet and leaving costs them nothing.
 */
const API = join(__dirname, '../..');
const LINK = readFileSync(join(API, 'modules/entry/the-open-link.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CONV = readFileSync(join(API, 'modules/conversation/conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the opener for an open link', () => {
  it('is reused by everybody after the first', () => {
    expect(LINK).toMatch(/select: \{ id: true, status: true, openerForALink: true \}/);
    expect(LINK).toMatch(/this\.conversation\.open\(\s*\n?\s*checkIn\.id, \{ theParticipant: participant\.id \}, ground\.openerForALink,/);
  });

  it('and written down once, by whoever got there first', () => {
    /* updateMany with the null guard, so two people arriving together cannot fight over it. */
    expect(LINK).toMatch(/\.updateMany\(\{ where: \{ id: ground\.id, openerForALink: null \}, data: \{ openerForALink: itsOpener \} \}\)/);
  });

  /* The whole point: no prompt composed, no model called, no guard re-run. */
  it('and costs nothing to serve', () => {
    const open = CONV.slice(CONV.indexOf('async open(checkInId: string'), CONV.indexOf('private async whatTheDocumentWaitsFor('));
    expect(open).toMatch(/const openerSystem = alreadyWritten\s*\n?\s*\? ''/);
    expect(open).toMatch(/const reply = alreadyWritten\s*\n?\s*\? alreadyWritten/);
    expect(open).toMatch(/const held = alreadyWritten\s*\n?\s*\? forHumans\(reply\)/);
  });

  /*
   * AND IT IS THE HELD VERSION THAT IS KEPT.
   *
   * The opener's guards rewrite a paragraph with no question in it and one over the length bar. The
   * text stored is the one that came out of them, not the model's first attempt - otherwise the
   * first respondent gets the good version and ninety-nine get the one that failed.
   */
  it('and what is stored is what the guards passed', () => {
    const open = CONV.slice(CONV.indexOf('async open(checkInId: string'), CONV.indexOf('private async whatTheDocumentWaitsFor('));
    expect(open).toMatch(/theOpener: aiTurn\.content/);
    /* Changed 26 October 2026 (Hafsah: the opening line): what the guards passed is stored, with the line about how long it takes in front (not for a self-correction). */
    /* And not for a check-in opened by Add something, whose first line is "What would you like to add?" (26 October 2026). */
    expect(open).toMatch(/content: \(checkIn as any\)\.isSelfCorrection \|\| alreadyWritten === WHAT_WOULD_YOU_LIKE_TO_ADD \? opening : withTheOpeningLine\(opening\),/);
  });

  /*
   * AND NEVER FOR SOMEBODY WHOSE OPENER COULD NAME THEM.
   *
   * A named participant's opener may say their name, their role, what they said last time. Handing
   * that to the next person is a leak, so exactly one caller may pass it: the open link, where the
   * row has no name on it.
   */
  it('and is never handed to a named participant', () => {
    const callers: string[] = [];
    for (const dir of ['modules', '']) {
      const root = join(API, dir);
      const walk = (at: string) => {
        for (const e of readdirSync(at, { withFileTypes: true })) {
          const full = join(at, e.name);
          if (e.isDirectory()) { walk(full); continue; }
          if (!e.name.endsWith('.ts') || e.name.endsWith('.spec.ts')) continue;
          const src = readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
          for (const m of src.matchAll(/\.open\(\s*\n?\s*[^;]*?\}\s*,\s*[^;)]+\)/g)) {
            if (/theParticipant|theUser|checkIn/.test(m[0])) callers.push(`${e.name}: ${m[0].slice(0, 60).replace(/\n/g, ' ')}`);
          }
        }
      };
      if (dir) walk(root);
    }
    expect(callers).toHaveLength(1);
    expect(callers[0]).toContain('the-open-link.service.ts');
  });

  /* No expiry and no version: a link handed out at an event cannot be reissued, and neither can the
     first thing it says. If it is ever wrong, it is wrong for the ground, not for one person. */
  it('and carries no expiry', () => {
    const schema = readFileSync(join(API, '../prisma/schema.prisma'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(schema).toMatch(/openerForALink\s+String\?\s+@map\("opener_for_a_link"\)/);
    expect(schema).not.toMatch(/openerForALinkExpiresAt/);
  });
});
