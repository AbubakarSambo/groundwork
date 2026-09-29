import { readFileSync } from 'fs';
import { join } from 'path';
import { withoutTheLeadsDescriptionOfAnyone } from './the-leads-words-about-someone';

/**
 * THE READ-SIDE NET, FOR WHAT A STRUCTURAL FIX MISSES (decision 30).
 *
 * Read live, the seniorhire scenario, run 19 and goals-1: Tobi's `roleAsDescribed` /
 * `remitAsGiven` was "Engagement Director. Owns the relationships with the five largest
 * clients." - the lead's private description, typed when she added him. His own served report
 * and board read "Amina says Amina brought you in to own the relationships with the five largest
 * clients." and "Dr Amina Bello says you are here to own the relationships with the five largest
 * clients." - built by report synthesis from what the record holds, not from anything Tobi typed.
 *
 * This is the second guard the fix adds: whatever wrote that sentence, it is taken out for a
 * reader who is not the lead. It never touches a sentence that is only coincidentally similar -
 * "own the relationships" alone is five words and ordinary language, and is left alone.
 */
const THE_DESCRIPTION = 'Engagement Director. Owns the relationships with the five largest clients.';

describe('a run of a lead\'s private description of someone does not reach a reader', () => {
  it('takes out a sentence built from six or more of the description\'s own words, for a reader who is not the lead', () => {
    const served = 'Amina says Amina brought you in to own the relationships with the five largest clients. Amina is waiting for a response about a meeting.';
    const read = withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], false);
    expect(read).not.toContain('own the relationships with the five largest clients');
    expect(read).toContain('waiting for a response about a meeting');
  });

  it('leaves the sentence for the lead who wrote the description', () => {
    const served = 'Dr Amina Bello says you are here to own the relationships with the five largest clients.';
    expect(withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], true)).toBe(served);
  });

  it('never touches a short, ordinary overlap', () => {
    const served = 'Tobi says he wants to own the relationships going forward.';
    expect(withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], false)).toBe(served);
  });

  it('is wired only into what the product and the model write, never into a quote of what somebody said', () => {
    /* The function itself only reads words, not who wrote them - which is why it is never called
       on a record entry, a quote or `myRows`: this proves those call sites do not exist. */
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const reports = strip(readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8'));
    expect(reports).not.toMatch(/withoutTheLeadsDescriptionOfAnyone\(\s*(quot|record|myRows)/);
  });

  it('is null rather than empty, and leaves text with no match untouched', () => {
    expect(withoutTheLeadsDescriptionOfAnyone(null, [THE_DESCRIPTION], false)).toBeNull();
    expect(withoutTheLeadsDescriptionOfAnyone('Nothing to do with any of this.', [THE_DESCRIPTION], false)).toBe('Nothing to do with any of this.');
    expect(withoutTheLeadsDescriptionOfAnyone('Nothing to do with any of this.', [null, undefined], false)).toBe('Nothing to do with any of this.');
  });

  /* The structural side: where the net is actually wired in, and the one place that used to hand
     the description straight to a synthesis function serving the very person it is about. */
  it('is applied to what a report and a board serve a reader who is not the lead', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const reports = strip(readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8'));
    expect(reports).toContain('withoutTheLeadsDescriptionOfAnyone(base.sharedPicture, theDescriptions, false)');
    expect(reports).toContain('withoutTheLeadsDescriptionOfAnyone(base.theOpening, theDescriptions, false)');
    expect(reports).toContain('withoutTheLeadsDescriptionOfAnyone(f.text, theDescriptions, false)');

    const board = strip(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
    expect(board).toMatch(/withoutTheLeadsDescriptionOfAnyone\(\s*\(\(ground as any\)\.reportRounds\?\.\[0\]\?\.sharedPicture/);
    expect(board).toMatch(/withoutTheLeadsDescriptionOfAnyone\(\s*\(\(ground as any\)\.report\?\.theOpening/);
  });

  it('the coaching note - served straight to the person the description is about - is never given it raw', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const reports = strip(readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8'));
    expect(reports).not.toMatch(/role:\s*participant\.roleAsDescribed/);
    /* Both fields whatToWorkOnNext is given now use the same guarded value. */
    const roleAssignments = reports.match(/\n\s*role: aRoleInTheirOwnWords\(participant as any\),/g) ?? [];
    expect(roleAssignments.length).toBeGreaterThanOrEqual(1);
  });
});
