import { readFileSync } from 'fs';
import { whatToCallThem } from './a-colleague-in-an-interview-has-a-name';
import { join } from 'path';
import { PartyType, GroundScenario, GroundMoment } from '@prisma/client';
import { buildScenarioPackForParty, buildIntakeBlock } from './prompt-library';

/**
 * THE LEAD'S CHECK-IN IS WHERE EXPECTATIONS GET SET. GW-EXP-1.
 *
 * WHY THIS EXISTS. `personObjective` and `groundObjective` both held ZERO rows for the product's whole
 * life, and it was never a missing field - both models were built, with a module of state logic behind
 * them. It was a missing QUESTION. The lead's session asks what success looks like once, for the whole
 * check-in, and a live renewal produced exactly what you would expect from that: "a renewal decision
 * both of them would describe the same way." True, useful, an expectation of nobody.
 *
 * And the question could not even have been phrased, because `PromptContext` had no roster. Nothing in
 * the prompt knew who was in the check-in, so nothing could ask what the lead expected of Ben.
 *
 * TWO THINGS ARE ASSERTED, and the second is the one that matters more:
 *  1. The interview goes person by person and presses for something checkable.
 *  2. It then asks WHETHER THAT PERSON KNOWS. Stating an expectation and having communicated it are
 *     different things, and the gap between them is the failure this product was built on:
 *     "I was measured on a queue and judged on judgement, and only one of those was said."
 */
const SRC = readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8');
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('GW-EXP-1: the interview knows who is in the room', () => {
  it('the roster reaches the prompt when there is somebody else in it', () => {
    const block = buildIntakeBlock({
      scenario: GroundScenario.NEW_HIRE,
      partyType: PartyType.INITIATOR,
      moment: GroundMoment.STARTING,
      sessionNumber: 1,
      otherPartyCheckedIn: false,
      groundLabel: 'New hire',
      otherParties: [{ label: 'Abubakar Sambo' }, { label: 'Delivery lead' }],
    } as any);
    expect(block).toContain('OTHER_PARTIES: Abubakar Sambo, Delivery lead');
  });

  it('and is left out entirely when there is nobody else, rather than rendering an empty list', () => {
    /** A solo read given "OTHER_PARTIES: " has been handed a thing to reason about that is not there. */
    const block = buildIntakeBlock({
      scenario: GroundScenario.SNAPSHOT,
      partyType: PartyType.INITIATOR,
      sessionNumber: 1,
      otherPartyCheckedIn: false,
      groundLabel: 'A pulse check',
      otherParties: [],
    } as any);
    expect(block).not.toContain('OTHER_PARTIES');
  });

  /*
   * THE SECOND LINE OF THIS USED TO BE A REGEXP FOR `displayName(p as any) ??`, which checked the
   * expression rather than the promise in the test's own name. The roster now goes through
   * `whatToCallThem`, which answers a second question the old expression could not: whether this
   * check-in names people to each other at all. So the address rule is exercised instead of read.
   */
  it('the service loads the roster and never names anybody by their address', () => {
    expect(SERVICE).toMatch(/otherParties: \(ground\.participants \?\? \[\]\)/);
    expect(SERVICE).toMatch(/label: whatToCallThem\(\{ person: p as any, peersMayBeNamed, plainWords/);
    /* Somebody invited by address and nothing else is never called by that address in a prompt. */
    const invitedOnly = {
      id: 'p9', partyType: PartyType.PARTICIPANT, email: 'chidinma@example.com',
      roleAsDescribed: null, nameGiven: null, user: null,
    } as any;
    expect(whatToCallThem({ person: invitedOnly, peersMayBeNamed: true, fallback: 'a colleague' }))
      .toBe('a colleague');
    /* And a name, where there is one and the check-in names people to each other. */
    expect(whatToCallThem({
      person: { ...invitedOnly, user: { firstName: 'Abubakar', lastName: 'Sambo' } },
      peersMayBeNamed: true,
    })).toBe('Abubakar Sambo');
    /** A managing-only lead gives no account, so nobody is asked what is expected of them. */
    expect(SERVICE).toMatch(/p\.id !== checkIn\.participantId && !p\.managingOnly/);
  });
});

describe('GW-EXP-1: the lead is asked per person, and asked whether they said it', () => {
  const pack = buildScenarioPackForParty(GroundScenario.NEW_HIRE, PartyType.INITIATOR, GroundMoment.STARTING);

  it('the initiator pathway carries the per-person pass', () => {
    expect(pack).toContain('PER-PERSON EXPECTATIONS');
    expect(pack).toMatch(/Go through OTHER_PARTIES one person at a time/);
  });

  it('it presses for something checkable rather than a sentiment', () => {
    expect(pack).toMatch(/Be more proactive" is not an expectation/);
  });

  it('AND IT ASKS WHETHER THE PERSON KNOWS - the whole point', () => {
    expect(pack).toMatch(/Does NAME know that\? When did you tell them, and in what words\?/);
    expect(pack).toMatch(/do not skip this/);
  });

  it('an unsaid expectation is named without being fixed or judged', () => {
    /**
     * The failure mode here is a model that turns a finding into coaching. Naming it is the job; the
     * moment it offers wording, the lead has outsourced the conversation they needed to have.
     */
    expect(pack).toMatch(/Do not offer to fix it, do not suggest wording, and do not press further/);
    expect(pack).toMatch(/Never tell a lead an expectation is unfair/);
  });

  it('and a participant is NOT asked what they expect of other people', () => {
    /** The other half of the rule. Expectations have one author, and this is what keeps that true. */
    const party = buildScenarioPackForParty(GroundScenario.NEW_HIRE, PartyType.PARTICIPANT, GroundMoment.STARTING);
    expect(party).not.toContain('PER-PERSON EXPECTATIONS');
  });
});


/**
 * AND A LATER SESSION PRESSES ON IT. GW-EXP-5.
 *
 * This is the half that answers the question that started the whole piece of work: "if I have a to-do
 * for someone and they forget, will they be probed?" The answer was no, and not because of a weak
 * prompt line - the target did not exist, and once it did, nothing tested it.
 *
 * The instruction mirrors the one that has worked on check-in objectives for a long time: press on the
 * GAP between what was stated and what the person describes. The gap is the FINDING. The moment it
 * becomes a score, this stops being a record and starts being a performance tool, which is the line
 * the objective module was written to hold.
 */
describe('GW-EXP-5: a seen expectation gets pressed on', () => {
  const build = (seen: boolean) =>
    buildIntakeBlock({
      scenario: GroundScenario.NEW_HIRE,
      partyType: PartyType.PARTICIPANT,
      moment: GroundMoment.STARTING,
      sessionNumber: 2,
      otherPartyCheckedIn: true,
      groundLabel: 'New hire',
      personObjective: { text: 'Own the weekly call by week four', authoredBy: 'lead', seenBySubject: seen, authoredByThem: false },
    } as any);

  it('presses on the gap once they have seen it', () => {
    expect(build(true)).toMatch(/PRESS ON THE GAP between this and what they actually describe doing/);
  });

  it('and forbids turning the gap into a score or a comparison', () => {
    /** A gap is information. A score is a verdict, and this product does not produce verdicts. */
    expect(build(true)).toMatch(/never score them against it or compare them to anybody else/);
    expect(build(true)).toMatch(/without accusation/);
  });

  it('but presses on nothing they have never seen', () => {
    const unseen = build(false);
    expect(unseen).not.toMatch(/PRESS ON THE GAP/);
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
  });

  it('and never tells them they agreed to it, because they never did', () => {
    expect(build(false)).toMatch(/Never imply they agreed to it/);
    expect(build(false)).toMatch(/If they disagree, that is worth recording and is not an obstacle/);
  });

  it('says nothing at all when no expectation exists', () => {
    /** The honest empty state. An invented target is worse than an absent one. */
    const none = buildIntakeBlock({
      scenario: GroundScenario.NEW_HIRE, partyType: PartyType.PARTICIPANT, sessionNumber: 2,
      otherPartyCheckedIn: false, groundLabel: 'New hire',
    } as any);
    expect(none).toContain('WHAT_IS_EXPECTED_OF_THEM: none set for this person');
    expect(none).not.toMatch(/PRESS ON THE GAP/);
  });
});


/**
 * A REVISION HAS TO BE OWNED. GW-EXP-4.
 *
 * Expectations are revised through the conversation, never a form - which was the decision that made
 * "one person owns it" workable without making it a lock. But the interview could not tell a revision
 * from a restatement, because nothing told it what was already on the record. So a lead quietly moving
 * somebody's target looked identical to a lead repeating it, and the person it is about would see the
 * words change with no reason attached.
 */
describe('GW-EXP-4: the interview can tell a revision from a restatement', () => {
  it('what is already recorded reaches the prompt', () => {
    const block = buildIntakeBlock({
      scenario: GroundScenario.NEW_HIRE, partyType: PartyType.INITIATOR, sessionNumber: 2,
      otherPartyCheckedIn: false, groundLabel: 'New hire',
      existingExpectations: [{ label: 'Abubakar', text: 'Own the weekly call by week four' }],
    } as any);
    expect(block).toContain('EXISTING_EXPECTATIONS: Abubakar - "Own the weekly call by week four"');
  });

  it('and is left out when there is nothing to compare against', () => {
    const block = buildIntakeBlock({
      scenario: GroundScenario.NEW_HIRE, partyType: PartyType.INITIATOR, sessionNumber: 1,
      otherPartyCheckedIn: false, groundLabel: 'New hire', existingExpectations: [],
    } as any);
    /**
     * Asserted on the rendered LINE, not the word. The pathway text itself refers to
     * EXISTING_EXPECTATIONS by name when telling the interview how to spot a revision, so a bare
     * `not.toContain` can never pass - it was failing against correct code.
     */
    expect(block).not.toMatch(/^EXISTING_EXPECTATIONS: \S/m);
  });

  it('the pathway asks what changed, and does not ask when nothing did', () => {
    const pack = buildScenarioPackForParty(GroundScenario.NEW_HIRE, PartyType.INITIATOR, GroundMoment.STARTING);
    expect(pack).toMatch(/That is different from what is on the record/);
    expect(pack).toMatch(/Repeating an expectation is not changing it/);
  });

  it('and says why a silent revision is the harm', () => {
    /** The reason has to travel with the instruction, or it reads as bureaucracy and gets skipped. */
    const pack = buildScenarioPackForParty(GroundScenario.NEW_HIRE, PartyType.INITIATOR, GroundMoment.STARTING);
    expect(pack).toMatch(/reads, to the person it is about, as moving the target/);
  });

  it('a participant is never handed other people’s expectations to compare', () => {
    /** They have none to revise, and showing them the list here would be a second publishing path. */
    const service = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(service).toMatch(/checkIn\.participant\.partyType === PartyType\.INITIATOR/);
  });
});
