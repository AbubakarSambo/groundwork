import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "THE PARTICIPANT SESSION DOES NOT TELL THEM WHAT THEY HAVE BEEN INVITED TO CHECK IN AGAINST,
 *  SO THEY COME IN AND JUST FREESTYLE." Hafsah, from a live run.
 *
 * A person arrives by invite link, is asked "what did you understand your role in this to be", and
 * is shown nothing: not the subject, not the objectives, not who set it up. The report is then
 * built on that answer.
 *
 * This is not a presentation problem. `an-objective-nobody-has-seen.spec.ts` already states the
 * rule: "reading a person against a target they have never seen is the definition of an unfair
 * review, and the fact that the product would be doing it silently makes it worse rather than
 * better." `PersonObjective` carries a `seenBySubject` flag for exactly this reason - and nothing
 * showed the objective to the subject, so that flag could never honestly become true.
 */
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const OPEN = CODE.slice(CODE.indexOf('async open(checkInId'), CODE.indexOf('async sendMessage('));

describe('opening a check-in returns what it is about', () => {
  it('the ground lookup asks for the subject and the objectives', () => {
    /**
     * The same query that already ran for the status gate, so this costs no extra round trip.
     *
     * The field list moved into WHAT_THE_BRIEF_IS_READ_FROM and is spread in here. It moved because
     * this select and the transcript's had drifted apart: both fed briefFor, neither fetched
     * initiatorId, and briefFor reads it through `as any`, so a lead opening her own check-in came
     * back as not-the-lead and was shown the narrowed view of targets she set herself. One shape
     * now, so the two cannot disagree again. See the-lead-is-not-a-stranger-to-their-own-targets.
     */
    expect(OPEN).toMatch(/\.\.\.WHAT_THE_BRIEF_IS_READ_FROM/);
    const shape = CODE.split('const WHAT_THE_BRIEF_IS_READ_FROM = {')[1]?.split('} as const;')[0] ?? '';
    expect(shape).toMatch(/label: true/);
    /* Gained isADecisionAboutAPerson (decision 46, 29 September 2026) alongside the rest. */
    /* And who set each target and which way it goes (decision 69, 1 October 2026). */
    /* And each goal's id (22 November, acba3e110), so a goal the lead changes is named by its id. */
    expect(shape).toMatch(/objectives: \{ select: \{ id: true, name: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true, setByParticipantId: true, direction: true \}/);
  });

  it('BOTH return paths carry the brief, not just a first open', () => {
    /**
     * The method returns in two places - one for a check-in being resumed with an AI turn already
     * on record, one for a fresh open. A brief on only the fresh path would mean anybody coming
     * back to finish their check-in loses the thing they were answering against, which is the
     * likelier case for a person who was invited and left it for a day.
     */
    const returns = OPEN.match(/return \{ reply:[^;]*;/g) ?? [];
    expect(returns.length).toBe(2);
    for (const r of returns) expect(r).toContain('brief: this.briefFor(ground,');
  });

  it('the brief carries the subject and the objectives', () => {
    expect(CODE).toMatch(/subject: ground\.label \?\? null/);
    /* The objectives the reader may see, which is all of them unless a target has somebody's name
       on it. See whose-number-is-whose-business. */
    /* Since 1 October 2026 as sentences about whoever set each one, with only the fields a reader is
       shown, and without a goal the lead has not told them about (decisions 69 and 56). */
    expect(CODE).toMatch(/objectives: this\.theTargetsAsSentences\(maySee\.shown as any\[\], ground as any, reader\?\.participantId \?\? null\)/);
    expect(CODE).toMatch(/shown: withoutWhatTheLeadHasNotToldThemAbout\(allowed\.shown/);
  });
});

describe('and it carries NOTHING anybody else said', () => {
  it('the brief is built from the ground, never from a participant or a check-in', () => {
    /**
     * THE GUARD THAT MATTERS MOST HERE. The whole reason the answers are worth having is that
     * nobody reads anybody else's. A brief that leaked one party's words to another to give them
     * "context" would break that in the one place a person is most likely to be influenced by it -
     * immediately before they answer.
     */
    const brief = CODE.slice(CODE.indexOf('private briefFor('), CODE.indexOf('async open(checkInId'));
    /**
     * Word-bounded. My first version tested `.toLowerCase().includes('turn')` and failed on the
     * word `return`, which is a test finding its own scaffolding rather than a defect.
     */
    for (const forbidden of ['recordEntry', 'conversationTurn', 'report', 'answer']) {
      expect(brief).not.toMatch(new RegExp(`\\b${forbidden}`, 'i'));
    }
  });

  it('and knowing WHICH participant is reading is allowed, because it is used to withhold', () => {
    /*
     * "participant" was on the forbidden list and had to come off, which is worth being careful
     * about: the rule it was serving is the most important one in this file.
     *
     * The rule is that the brief never draws on somebody's ACCOUNT - their entries, their turns,
     * their report. That still holds and is still asserted above. What changed is that a target can
     * now belong to one person, and ten of those on a colleague's first screen is a decision nobody
     * made. Narrowing that needs to know who is reading. It is the same word doing the opposite
     * job: not to fetch somebody's words, but to leave somebody else's number out.
     *
     * So the narrower assertion: the brief may take a reader, and may not query anything of theirs.
     */
    const brief = CODE.slice(CODE.indexOf('private briefFor('), CODE.indexOf('async open(checkInId'));
    expect(brief).toContain('targetsFor(');
    /* No database reach of any kind: everything it needs is already in hand. */
    expect(brief).not.toMatch(/this\.prisma/);
    expect(brief).not.toMatch(/findMany|findFirst|findUnique/);
  });

  it('and returns null rather than inventing a brief for a ground it could not read', () => {
    expect(CODE).toMatch(/if \(!ground\) return null;/);
  });
});
