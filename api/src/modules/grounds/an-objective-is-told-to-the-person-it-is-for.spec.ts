import { readFileSync } from 'fs';
import { join } from 'path';
import { describeObjective } from './an-objective-belongs-to-a-person';

/**
 * "(proposed, and not yet seen by the person it is for)" WAS READ BY THE PERSON IT IS FOR (final check of the anchor, 8 October).
 * On Juma's own page, beside the thing the lead asked of him. Said to him it names who suggested it and what is his to do; said to the lead or
 * an admin it names him. With no reader given the words are what they were.
 */
const o = (over: Record<string, unknown> = {}) => ({ participantId: 'p1', text: 'Report a late payment or a broken van on the day.', authoredBy: 'lead' as const, seenBySubject: false, ...over });
const juma = { isThePerson: true, theirName: 'Juma', theLeadsName: 'Ruth' };
const ruth = { isThePerson: false, theirName: 'Juma', theLeadsName: 'Ruth' };

describe('an objective is told to the person it is for in words that are theirs', () => {
  it('Juma reads who suggested it and that it is his to answer', () => {
    expect(describeObjective(o(), juma)).toBe('Report a late payment or a broken van on the day. (suggested by Ruth, and you have not answered it yet)');
    expect(describeObjective(o({ seenBySubject: true }), juma)).toBe('Report a late payment or a broken van on the day. (suggested by Ruth, and you left it as it stands)');
    expect(describeObjective(o({ authoredBy: 'self', seenBySubject: true }), juma)).toBe('Report a late payment or a broken van on the day. (in your own words)');
    expect(describeObjective(o({ text: null }), juma)).toBe('Nobody has said what success looks like for you.');
  });

  it('Ruth, or an admin, reads it about Juma', () => {
    expect(describeObjective(o(), ruth)).toBe('Report a late payment or a broken van on the day. (proposed, and Juma has not seen it yet)');
    expect(describeObjective(o({ seenBySubject: true }), ruth)).toBe('Report a late payment or a broken van on the day. (proposed by Ruth, and left as it stands)');
    expect(describeObjective(o({ authoredBy: 'self', seenBySubject: true }), ruth)).toBe("Report a late payment or a broken van on the day. (in Juma's own words)");
    expect(describeObjective(o({ text: null }), ruth)).toBe('Nobody has said what success looks like for Juma.');
  });

  it('with no name known, nobody is addressed as "the person it is for"', () => {
    const nameless = { isThePerson: false, theirName: null, theLeadsName: null };
    expect(describeObjective(o(), nameless)).toBe('Report a late payment or a broken van on the day. (proposed, and they have not seen it yet)');
  });

  it('with no reader given, the words are exactly what they were', () => {
    expect(describeObjective(o())).toBe('Report a late payment or a broken van on the day. (proposed, and not yet seen by the person it is for)');
  });

  it('the page a person reads is told who is reading', () => {
    const service = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
    expect(service).toContain('described: describeObjective(shaped, { isThePerson: isSelf,');
  });
});
