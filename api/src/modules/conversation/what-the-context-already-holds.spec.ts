import * as fs from 'fs';
import * as path from 'path';
import {
  whatTheySaidTheyWouldDo, thingsNobodyOwns, whatIsNotSettled, theQuestionsTheLeadWants,
  whatSitsBetweenPeople, whatTheyHedged, keepTheirHedge,
} from './what-the-context-already-holds';
import * as everythingItHolds from './what-the-context-already-holds';

/**
 * "MAKE SURE IT IS USED AS CONTEXT IN THE CONVERSATIONS."
 *
 * Her instruction, 22 September 2026, after a quarter's context landed on the Context page and the
 * check-ins could see none of it but the numbers.
 */
describe('what the context already holds', () => {
  it('puts an action as a question and never as a finding', () => {
    const b = whatTheySaidTheyWouldDo([
      { text: 'send the Client B proposal', when: 'this week' },
      { text: 'ask Client D who signs the budget', explicit: false },
    ]);
    expect(b).toContain('Nobody has said whether any of it happened, and you do not know either');
    expect(b).toContain('- send the Client B proposal (said: this week)');
    expect(b).toContain('they may never have agreed to it');
    expect(b).toContain('Never state that something is done, late or dropped');
    expect(whatTheySaidTheyWouldDo([])).toBe('');
  });

  it('asks who owns what nobody owns, and assigns nothing', () => {
    const b = thingsNobodyOwns(['Client C escalation', 'CRM cleanup']);
    expect(b).toContain('2 THINGS HAVE NO OWNER');
    expect(b).toContain('Never assign them to anybody yourself');
    expect(thingsNobodyOwns(['one'])).toContain('ONE THING HAS');
  });

  it('treats what is not settled as a reason to ask, not a correction', () => {
    const b = whatIsNotSettled(['whether the Client B proposal was sent', 'whether 12m is signed or recognised']);
    expect(b).toContain('do not correct them and do not accept it either');
    expect(b).toContain('keep the hedge in what you say back');
    expect(b).toContain('Never tell them the record says otherwise');
  });

  /*
   * Decision 34, 28 September 2026: a question the lead wants asked is asked in the exact words the
   * lead confirmed, not in the interviewer's own. This used to pin "Ask them in your own words".
   */
  it("asks the lead's confirmed questions word for word, without saying whose they are", () => {
    const b = theQuestionsTheLeadWants(['Which accounts actually have a buying process?']);
    expect(b).toContain('- "Which accounts actually have a buying process?"');
    expect(b).toContain('Ask each one exactly as it is written, word for word');
    expect(b).not.toContain('in your own words');
    expect(b).toContain('Never say who wants it asked');
  });

  it('holds a pair as a pair, and blames neither', () => {
    const b = whatSitsBetweenPeople(['Between Amina and David: a feature was promised that is not ready']);
    expect(b).toContain('not a fact about either of them');
    expect(b).toContain('never put it to this person as something they did wrong');
  });

  /*
   * THE LEAD'S READ OF SOMEBODY IS NOT A BLOCK ANY MORE. This used to pin "a place to look", the
   * block that put the lead's private read of a person into that person's own session under an
   * instruction never to quote it. Decision 32, 27 September 2026: it is left out of what the
   * session is given instead, so the block and its instruction are gone. See
   * a-leads-private-note-never-reaches-their-session.spec.ts for the turn itself.
   */
  it("and there is no block for the lead's read of somebody", () => {
    expect((everythingItHolds as any).aPlaceToLook).toBeUndefined();
  });
});

/**
 * A HEDGE STAYS A HEDGE. Amina: "The proposal, I think it went out last week." The next line said
 * "The proposal is out" - a thing nobody knows, said back to her as settled.
 */
describe('a hedge stays a hedge', () => {
  it('finds the hedged sentence in their own words', () => {
    expect(whatTheyHedged('The proposal, I think it went out last week.')).toEqual(['The proposal, I think it went out last week.']);
    expect(whatTheyHedged('Client B signed on Tuesday. I am not sure the invoice went out.'))
      .toEqual(['I am not sure the invoice went out.']);
    expect(whatTheyHedged('Client B signed on Tuesday for 4m.')).toEqual([]);
    expect(whatTheyHedged('')).toEqual([]);
  });

  it('and says to keep it rather than to correct them', () => {
    const b = keepTheirHedge(['I think it went out last week']);
    expect(b).toContain('AND RIGHT NOW: they hedged');
    expect(b).toContain('Do not repeat any of it back as settled');
    expect(b).toContain('Never tell them what the record says instead');
    expect(keepTheirHedge([])).toBe('');
  });

  it('every one of them is in the assembled prompt, and the hedge is near the end', () => {
    const src = fs.readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const join = src.slice(src.indexOf('return [systemPrompt, theirLanguage'));
    for (const name of ['theirCommitments', 'nobodyOwns', 'notSettledBlock', 'leadsQuestions', 'betweenBlock', 'theirHedge']) {
      expect(join).toContain(name);
    }
    expect(join).not.toContain('placeToLook');
    /* The three things stay last; the hedge sits with the other right-now blocks in front of them.
       `heldBack` (what they have not said yet, week 1 of the weekly plan, 3fb7edf9) is one more
       right-now block and belongs in the same place, after the hole and before the three that stay last. */
    /* `proofKindly` (asking for proof kindly, week 4, task 2.5) is one more right-now block, after heldBack. */
    /* `whereItIs` (what they will do is asked before the end, 1 October 2026) is one more, after proofKindly. */
    expect(join).toMatch(/theirHedge, theHole, heldBack, proofKindly, whereItIs, cannotBeMissed, askedLastTurn, patternProbeBlock\]/);
    /* The lead's read of a person is never read into a check-in, and what sits between two people
       only into the lead's own - at the query, not by an instruction. The unowned list is the lead's alone. */
    expect(src).toContain("kind: { notIn: (isTheLead ? ['ABOUT_A_PERSON'] : ['ABOUT_A_PERSON', 'BETWEEN_PEOPLE']) as any }");
    expect(src).not.toContain('aPlaceToLook');
    expect(src).toContain("const nobodyOwns = isTheLead ? thingsNobodyOwns(ownerless) : ''");
  });
});
