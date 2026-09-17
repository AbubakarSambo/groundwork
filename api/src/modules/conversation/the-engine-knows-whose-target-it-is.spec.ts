import { GroundScenario, PartyType, GroundMoment } from '@prisma/client';
import { buildIntakeBlock } from './prompt-library';

/**
 * A PERSON MUST NOT BE PRESSED ON A TARGET THEY ARE READING FOR THE FIRST TIME.
 *
 * `PersonObjective` has carried `authoredBy` and `seenBySubject` since it was added, with the reasoning
 * written on the model itself: "a proposal nobody has seen is never read against, and the two columns
 * are what makes that arithmetic rather than a promise."
 *
 * Neither column reached the engine. So the report could refuse to read somebody against an unseen
 * objective while the interview, minutes earlier, had already pressed them on it - which produces a
 * defensive answer and a worthless record, and is exactly the harm the columns exist to prevent.
 *
 * Asserted on the assembled prompt, because that is the only place it is true or false.
 */
const build = (over: Record<string, unknown> = {}) =>
  buildIntakeBlock({
    scenario: GroundScenario.NEW_HIRE,
    partyType: PartyType.PARTICIPANT,
    sessionNumber: 2,
    totalSessions: 6,
    otherPartyCheckedIn: true,
    groundLabel: 'A new hire starting',
    moment: GroundMoment.STARTING,
    ...over,
  } as any);

describe('whose target it is', () => {
  it('says nothing is set when nothing is', () => {
    expect(build()).toContain('WHAT_IS_EXPECTED_OF_THEM: none set for this person');
  });

  it('carries the objective text when there is one', () => {
    const prompt = build({
      personObjective: { text: 'Twelve signed contracts by the end of the quarter', authoredBy: 'p1', seenBySubject: true, authoredByThem: true },
    });
    expect(prompt).toContain('Twelve signed contracts by the end of the quarter');
  });

  it('distinguishes a target they wrote from one set for them', () => {
    /** "You said" and "you were told" are different conversations, and the engine could tell neither. */
    const own = build({ personObjective: { text: 'x', authoredBy: 'p1', seenBySubject: true, authoredByThem: true } });
    const given = build({ personObjective: { text: 'x', authoredBy: 'lead', seenBySubject: true, authoredByThem: false } });
    expect(own).toContain('they wrote this themselves');
    /** Reworded when expectations gained a single author: "somebody else" is now always the lead. */
    expect(given).toContain('set by the person leading this');
  });

  it('and instructs the engine not to read against one they have never seen', () => {
    const unseen = build({ personObjective: { text: 'x', authoredBy: 'lead', seenBySubject: false, authoredByThem: false } });
    expect(unseen).toContain(/* Was "THEY HAVE NOT SEEN IT". The band at the top of a participant's screen shows the objective
       now, so that sentence produced "you have not seen this yet" directly under the thing itself.
       The flag still means nobody has acknowledged it; it no longer means they cannot see it. */
    'THEY HAVE NOT ACKNOWLEDGED IT');
    /**
     * REWORDED, NOT WEAKENED. Accepting is gone - one person states expectations and a party neither
     * agrees to nor rewrites theirs - so the prompt can no longer ask whether they accept. What this
     * file exists to protect is untouched and is asserted directly below: nothing is read against a
     * target somebody is meeting for the first time, and they are never told they agreed to it.
     */
    /*
     * Renamed from MY_OBJECTIVE on 15 September 2026. Read on a live participant check-in, the
     * model took the possessive as its own: "My objective for this check-in, set by the person
     * leading it, is for you to carry 150 contracts", said to the person it was about. And the
     * unseen branch told it to "show it to them" when the band at the top of the same screen was
     * already showing it - "you have not seen this yet" sat two inches under the thing itself.
     */
    expect(unseen).toMatch(/Read nothing against it this session/);
    expect(unseen).toMatch(/it is on screen above this conversation/);
    expect(unseen).not.toMatch(/show it to them/);
    expect(unseen).toMatch(/Never imply they agreed to it/);
    expect(unseen).toMatch(/If they disagree, that is worth recording and is not an obstacle/);

  });

  it('and says nothing of the kind when they have seen it', () => {
    const seen = build({ personObjective: { text: 'x', authoredBy: 'lead', seenBySubject: true, authoredByThem: false } });
    expect(seen).toContain('they have seen it');
    expect(seen).not.toContain(/* Was "THEY HAVE NOT SEEN IT". The band at the top of a participant's screen shows the objective
       now, so that sentence produced "you have not seen this yet" directly under the thing itself.
       The flag still means nobody has acknowledged it; it no longer means they cannot see it. */
    'THEY HAVE NOT ACKNOWLEDGED IT');
  });
});
