import { readFileSync } from 'fs';
import { join } from 'path';
import { withoutTheLeadsDescriptionOfAnyone } from './the-leads-words-about-someone';

/**
 * THE READ-SIDE NET, FOR WHAT A STRUCTURAL FIX MISSES (decision 30) - AND NARROWED THE SAME DAY.
 *
 * Read live, the seniorhire scenario, run 19 and goals-1: Tobi's `roleAsDescribed` / `remitAsGiven`
 * was "Engagement Director. Owns the relationships with the five largest clients." - the lead's
 * private description, typed when she added him. His own served report and board read "Amina says
 * Amina brought you in to own the relationships with the five largest clients." and "Dr Amina Bello
 * says you are here to own the relationships with the five largest clients."
 *
 * That first version of this net took any such sentence out for a non-lead reader. It turned out to
 * be too wide: those exact words are ALSO in `toldToParticipants`, an unowned `ground_objectives`
 * row, `whatTheRoomIsAbout`'s aims, and Amina's and Tobi's own record entries - all things Tobi may
 * already read, shareable under decision 4. Stripping them took a legitimate sentence out of his own
 * report.
 *
 * So the net only drops a sentence when the private run of words is NOT found anywhere in what this
 * reader may already read (`theShareableTextFor`, built once per read). A private phrase that
 * appears nowhere shareable still comes out; one that happens to be shared stays.
 */
const THE_DESCRIPTION = 'Engagement Director. Owns the relationships with the five largest clients.';
/* A phrase that is genuinely nowhere but the private description - the kind of thing decision 30
   is actually for. */
const A_REAL_PRIVATE_PHRASE = 'struggles to take ownership without being chased, and needs close supervision on every account';

describe('a run of a lead\'s private description of someone does not reach a reader, unless it is shared some other way', () => {
  it('the seniorhire case: the sentence stays for Tobi, because the same words are also in what he was told, a shared target, an aim, and the record', () => {
    const served = 'Dr Amina Bello says you are here to own the relationships with the five largest clients.';
    const shareable = [
      /* toldToParticipants */
      'This check-in is about how the Engagement Director role is landing.',
      /* an unowned ground_objectives row */
      'The new Engagement Director is to own the relationships with the five largest clients.',
      /* a whatTheRoomIsAbout aim */
      'Dr. Amina Bello wants Tobi Adewale to own the relationships with the five largest clients by taking the lead.',
      /* a record entry, Amina's own words */
      "I brought him in to own the relationships with our five largest clients.",
    ];
    expect(withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], false, shareable)).toBe(served);
  });

  it('a real private phrase found nowhere shareable is still taken out for a reader who is not the lead', () => {
    const description = `Engagement Director. ${A_REAL_PRIVATE_PHRASE}.`;
    const served = `Amina says Tobi ${A_REAL_PRIVATE_PHRASE}. Amina is waiting for a response about a meeting.`;
    const shareable = ['This check-in is about the Engagement Director role.', 'He owns the five largest clients.'];
    const read = withoutTheLeadsDescriptionOfAnyone(served, [description], false, shareable);
    expect(read).not.toContain(A_REAL_PRIVATE_PHRASE);
    expect(read).toContain('waiting for a response about a meeting');
  });

  it('with no shareable text given at all, still takes the sentence out (the strict fallback)', () => {
    const served = 'Amina says Amina brought you in to own the relationships with the five largest clients. Amina is waiting for a response about a meeting.';
    const read = withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], false);
    expect(read).not.toContain('own the relationships with the five largest clients');
    expect(read).toContain('waiting for a response about a meeting');
  });

  it('leaves the sentence for the lead who wrote the description, shareable or not', () => {
    const served = 'Dr Amina Bello says you are here to own the relationships with the five largest clients.';
    expect(withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], true, [])).toBe(served);
  });

  it('never touches a short, ordinary overlap', () => {
    const served = 'Tobi says he wants to own the relationships going forward.';
    expect(withoutTheLeadsDescriptionOfAnyone(served, [THE_DESCRIPTION], false)).toBe(served);
  });

  it('is null rather than empty, and leaves text with no match untouched', () => {
    expect(withoutTheLeadsDescriptionOfAnyone(null, [THE_DESCRIPTION], false)).toBeNull();
    expect(withoutTheLeadsDescriptionOfAnyone('Nothing to do with any of this.', [THE_DESCRIPTION], false)).toBe('Nothing to do with any of this.');
    expect(withoutTheLeadsDescriptionOfAnyone('Nothing to do with any of this.', [null, undefined], false)).toBe('Nothing to do with any of this.');
  });

  it('is wired only into what the product and the model write, never into a quote of what somebody said', () => {
    /* The function itself only reads words, not who wrote them - which is why it is never called
       on a record entry, a quote or `myRows`: this proves those call sites do not exist. */
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const reports = strip(readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8'));
    expect(reports).not.toMatch(/withoutTheLeadsDescriptionOfAnyone\(\s*(quot|record|myRows)/);
  });

  /* The structural side: where the net is actually wired in, built once per read and given the
     shareable corpus, and the one place that used to hand the description straight to a synthesis
     function serving the very person it is about. */
  it('is applied to what a report and a board serve a reader who is not the lead, with the shareable corpus built once per read', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const reports = strip(readFileSync(join(__dirname, '..', 'reports', 'reports.service.ts'), 'utf8'));
    expect(reports).toContain('const shareable = await theShareableTextFor(this.prisma as any, ground as any)');
    expect(reports).toContain('withoutTheLeadsDescriptionOfAnyone(base.sharedPicture, theDescriptions, false, shareable)');
    expect(reports).toContain('withoutTheLeadsDescriptionOfAnyone(base.theOpening, theDescriptions, false, shareable)');
    expect(reports).toContain('withoutTheLeadsDescriptionOfAnyone(f.text, theDescriptions, false, shareable)');

    const board = strip(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
    expect(board).toContain('const shareableText = isInitiator ? [] : await theShareableTextFor(this.prisma as any, ground as any)');
    expect(board).toMatch(/withoutTheLeadsDescriptionOfAnyone\(\s*\(\(ground as any\)\.reportRounds\?\.\[0\]\?\.sharedPicture[\s\S]{0,200}shareableText,/);
    expect(board).toMatch(/withoutTheLeadsDescriptionOfAnyone\(\s*\(\(ground as any\)\.report\?\.theOpening[\s\S]{0,200}shareableText,/);
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
