/**
 * TWO SENTENCES HAFSAH READ ON SALES TEAM, Q4 (21 November 2026), from Chidi Okeke's own check-in 4.
 *
 * 1. "Chidi Okeke is waiting on the Quickmart buyer for a reply from the buyer at Quickmart." said the holder twice, because
 *    the holder and the end of what is waited for named the same people in a different order.
 * 2. "In check-in 4, Chidi Okeke said they would call her monday morning, if nothing ill go to their westlands office wednesday
 *    Monday morning... Wednesday." said the time a second time, because its words had an ellipsis between them.
 *
 * 3. "How progress against the team's target of 40 new shops a week is described." stood alone under "The signals behind
 *    them": a question asked as a thing, read as a sentence because it has a verb.
 *
 * Each is checked as the whole sentence a lead reads, through the one writer each place uses.
 */
import { aThingWithoutItsHolder } from './a-holder-in-their-own-words';
import { theWaitSaid } from './a-wait-said-in-full';
import { aCommitmentSaid } from '../reports/what-the-record-shows-over-time';
import { whereThisIsHeading } from './where-this-is-heading';
import { theHeading } from './to-close-the-gap';
import { theOpenIssues } from './the-open-issues';
import { inASentence } from './a-phrase-inside-a-sentence';

describe('the sales board, as Wairimu read it on 21 November', () => {
  it('says the Quickmart buyer once', () => {
    const what = aThingWithoutItsHolder('a reply from the buyer at Quickmart', 'the Quickmart buyer');
    expect(theWaitSaid('Chidi Okeke', 'is', 'the Quickmart buyer', what)).toBe('Chidi Okeke is waiting on the Quickmart buyer for a reply.');
  });

  it('still keeps a "from" that names somebody else', () => {
    expect(aThingWithoutItsHolder('the price list from finance', 'the Quickmart buyer')).toBe('the price list from finance');
  });

  it('says the time once when every word of it is already in what they said', () => {
    const says = aCommitmentSaid({
      who: 'Chidi Okeke',
      what: 'call her monday morning, if nothing ill go to their westlands office wednesday',
      when: 'Monday morning... Wednesday',
      statedInSession: 4, restatedIn: [], status: 'UNKNOWN', theySaidIt: true,
      saidWordForWord: true, whenSaidWordForWord: true,
    }, 4);
    expect(says).not.toMatch(/wednesday Monday/i);
    expect(says).not.toMatch(/Monday morning\.\.\./);
    expect(says).toContain('Nobody has said yet whether it happened.');
  });

  it('still adds a time that is not in their words', () => {
    const says = aCommitmentSaid({
      who: 'Chidi Okeke', what: 'send the quote to Naivas', when: 'on Friday',
      statedInSession: 4, restatedIn: [], status: 'UNKNOWN', theySaidIt: true, saidWordForWord: true, whenSaidWordForWord: true,
    }, 4);
    expect(says).toMatch(/Friday/);
  });

  it('says what people differ about as a sentence under "The signals behind them"', () => {
    const out: any = whereThisIsHeading({
      scenario: 'OKR_ALIGNMENT' as any, hadAnObjective: false, readerIsTheLead: true, leadName: 'Wairimu Njoroge',
      board: { divergence: { items: [{ topic: "How progress against the team's target of 40 new shops a week is described" }] } },
    } as any);
    const says = (out?.signals ?? []).map((x: any) => String(x.says));
    expect(says).toContain("People in this check-in said different things about how progress against the team's target of 40 new shops a week is described.");
    expect(says).not.toContain("How progress against the team's target of 40 new shops a week is described.");
  });

  it('says "this one deal" when there is one deal and more are needed', () => {
    expect(theHeading(40, [], [1])).toBe('To close the gap, more than this one deal is needed');
    expect(theHeading(40, [], [1, 2])).toBe('To close the gap, more than these two deals are needed');
  });

  it('names what Chidi and the lead see differently in the one sentence for a difference, mid-sentence in lower case', () => {
    const [issue] = theOpenIssues({
      groundId: 'g', now: new Date('2026-11-21T12:00:00Z'), stillToDecide: [], memories: [], leadPromises: [],
      differences: [{ key: 'k', topic: "How progress against the team's target of 40 new shops a week is described", withFirstName: 'Chidi', since: null }],
    });
    expect(issue.title).toBe("Chidi and you see differently how progress against the team's target of 40 new shops a week is described");
    expect((issue as any).conversation.wayToStart).toBe("“Chidi, you and I see differently how progress against the team's target of 40 new shops a week is described. Can you talk it through with me?”");
  });

  it('a phrase inside a sentence: one function for every writer, names kept', () => {
    expect(inASentence('A reply from the buyer.')).toBe('a reply from the buyer');
    expect(inASentence('They want five units')).toBe('they want five units');
    expect(inASentence('Quickmart')).toBe('Quickmart');
  });
});
