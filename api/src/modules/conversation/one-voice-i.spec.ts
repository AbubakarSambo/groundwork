import { ENGINE_RULES, ONE_VOICE, SEED_PROMPTS } from './prompt-library';
import { theContextWeHave, theDocumentLine, whatTheDocumentHolds } from '../documents/what-a-document-holds';
import { whenTheConversationCannotBeReached } from './a-failed-open-says-the-right-thing-to-each-reader';
import { whyThisDidNotWork } from '../entry/a-join-link-is-not-a-password';
import { IT_HAS_BEEN_A_FEW_DAYS } from './the-anchor-nudge';
import { SOMETHING_WENT_WRONG } from '../../common/filters/a-refusal-is-plain';

/**
 * ONE VOICE, "I" (Hafsah's fixed rule, 3 November 2026; fix plan, release batch 1, group 6). The cast run counted Groundwork saying "we"
 * for itself 15 times, from three sources: the document line, conversation turns, and fixed headings. Each is read here as served.
 */
const OURS = /\b(?:we|We|us|our|Our)\b/;

describe('one voice, "I"', () => {
  it('the one stored system instruction carries the rule, and the stored version is the code', () => {
    expect(ONE_VOICE).toContain('You speak as one voice, "I", in every reply');
    expect(ONE_VOICE).toContain('"We" is only ever the person\'s own team or organisation, in their own words');
    expect(ENGINE_RULES).toContain(ONE_VOICE);
    expect(SEED_PROMPTS.find((p) => p.key === 'system')!.content).toContain(ONE_VOICE);
  });

  it('a document is introduced as what I took from it, one field, and a page shows the block without it', () => {
    const held = { fileName: 'Q4 targets.xlsx', whatItIs: 'It is the sales targets for each dealer.', forOnePerson: [], forEverybody: [{ what: 'units sold', target: 120 }], dates: [], unmatched: [] } as any;
    const all = theContextWeHave(held)!;
    expect(theDocumentLine('Q4 targets.xlsx', held.whatItIs)).toBe('Here is what I took from Q4 targets.xlsx. It is the sales targets for each dealer.');
    expect(all.startsWith('Here is what I took from Q4 targets.xlsx. It is the sales targets for each dealer.')).toBe(true);
    expect(all).not.toMatch(/context we have/);
    const rest = whatTheDocumentHolds(held)!;
    expect(rest.startsWith('Here is')).toBe(false);
    expect(rest).toContain('120');
  });

  it('what a person reads when something fails, or a link is wrong, says "I"', () => {
    for (const said of [
      whenTheConversationCannotBeReached({ isTheLead: true, leadFirstName: null }),
      whenTheConversationCannotBeReached({ isTheLead: false, leadFirstName: 'Grace' }),
      whyThisDidNotWork('that link is not one we know'),
      IT_HAS_BEEN_A_FEW_DAYS,
      SOMETHING_WENT_WRONG,
    ]) expect(said).not.toMatch(OURS);
    expect(whenTheConversationCannotBeReached({ isTheLead: true, leadFirstName: null })).toContain('it is a problem on my side and not anything you did, and I am looking into it.');
  });
});
