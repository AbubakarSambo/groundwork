import { whereYouAreAgainstWhatYouNamed } from './where-you-are-against-what-you-named';
import { RecordEntryType } from '@prisma/client';

/**
 * REQUEST 75. Success was said in the lead's own check-in and never set as the standard. The sentence says
 * where it is set, and the tab is called "People and setup". The person who runs the check-in is spoken to;
 * anyone else reads it in the third person, naming the lead.
 */
const read = (who: { readerIsTheLead: boolean; leadName?: string | null }) => whereYouAreAgainstWhatYouNamed({
  counting: 'everyone', stated: null, leadHasSaidIt: true, version: null, conditions: [],
  entries: [{ type: RecordEntryType.SUCCESS_DEFINITION, text: 'Ten clients on the platform', who: 'Wanjiru' }],
  ...who,
}).saying;

describe('the sentence about success being said but not set', () => {
  it('speaks to the person who runs the check-in', () => {
    expect(read({ readerIsTheLead: true, leadName: 'Wanjiru' })).toBe(
      'You said what success looks like in your own check-in, and it is in the list below. You have not set it as the standard yet, so nothing is measured against it. You can set it on People and setup.');
  });
  it('tells anyone else about the lead by name', () => {
    expect(read({ readerIsTheLead: false, leadName: 'Wanjiru' })).toBe(
      'Wanjiru said what success looks like in their own check-in, and it is in the list below. Wanjiru has not set it as the standard yet, so nothing is measured against it. They can set it on People and setup.');
  });
  it('without a name the lead may be read by, says the person running it', () => {
    expect(read({ readerIsTheLead: false, leadName: null })).toContain('The person running this said what success looks like');
  });
  it('never points at the old tab name', () => {
    for (const s of [read({ readerIsTheLead: true }), read({ readerIsTheLead: false, leadName: 'Wanjiru' })]) {
      expect(s).not.toMatch(/Setup tab/);
      expect(s).toMatch(/People and setup\.$/);
    }
  });
});
