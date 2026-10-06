/**
 * THE INTERVIEW MUST NOT ASK FOR WHAT SETUP ALREADY COLLECTED.
 *
 * A lead picks their situation from twenty-one cards, names who is involved, and writes a brief -
 * and then the first thing the check-in says is "So, what is starting here, and who is involved?".
 * Observed on staging, on a check-in whose own title on the screen was "A new hire starting".
 *
 * IT IS NOT THAT THE FACTS ARE MISSING. `groundLabel`, `scenario`, `otherParties`, `roleAsDescribed`
 * and `adminBrief` all reach the prompt already. What was missing is any instruction about them: the
 * anti-repetition rule in the engine says to check "what the person has already told you IN THIS
 * SESSION", and everything typed during setup was not in the session. So the model had the answers
 * in front of it and a pathway telling it to ask the question anyway.
 *
 * WHAT THIS REFUSES TO DO. It does not assert the setup answers back as though the person said them
 * in conversation. A card someone clicked is not their account of their situation, and treating it
 * as one would be the product putting words in somebody's mouth - the exact thing the report rules
 * forbid. So the block states what is on the record and says it is not to be re-asked; it never
 * says "you told me" and never quotes a card as a person's words.
 */
import { GroundScenario } from '@prisma/client';

export interface SetupFacts {
  scenario: GroundScenario | null;
  /** What the check-in is called. Often the scenario's own label when nobody renamed it. */
  groundLabel?: string | null;
  /** Everyone else in it, by the name they are shown under. */
  otherParties?: { label: string }[];
  /** How the initiator described this person's part in it. */
  roleAsDescribed?: string | null;
  /** The brief the lead wrote at the last step of setup. */
  adminBrief?: string | null;
  /**
   * WHETHER THE PERSON READING THIS IS THE PERSON IT KEEPS TALKING ABOUT.
   *
   * Every line below used to say "the person who set this up", including when the person about to
   * read the reply was that person. Driven live on a generic check-in the lead had opened about
   * themselves, the conversation said "the person who set this up described your part as..." back
   * at the person who had typed it ten minutes earlier. It reads as the product not knowing who it
   * is talking to, which is exactly what it was.
   *
   * The caller already knows this - the ground's initiator is on the row it loaded - so the fact
   * travels rather than being left for the model to work out from context that does not contain it.
   */
  readerSetItUp?: boolean;
  /**
   * THE FIRST NAME OF WHOEVER SET IT UP, FOR EVERYBODY ELSE'S BLOCK.
   *
   * The block said "The person who set this up wrote this about the situation", and the model said
   * it back: "Mei, the person who set this up wants to understand what it's actually like to work
   * here" was the first line a person read (openread, run 10). A label read aloud is still a label.
   * With a name, the block says the name; without one, "your lead", which is what a person calls
   * whoever asked them to check in.
   */
  setUpBy?: string | null;
}

/**
 * The situation in a sentence a person would recognise, from the card they picked.
 *
 * Deliberately not `SCENARIO_LABELS` from the client: that list is the picker's wording and belongs
 * to the screen. This is what to say inside a conversation, and the two are allowed to differ - "a
 * new person starting" reads better mid-sentence than "A new hire starting".
 */
export function situationInWords(scenario: GroundScenario | null): string | null {
  switch (scenario) {
    case GroundScenario.NEW_HIRE: return 'a new person starting';
    case GroundScenario.ROLE_HANDOVER: return 'a role changing hands';
    case GroundScenario.CONTRACT_REVIEW: return 'an agreement before it is signed';
    case GroundScenario.IMPLEMENTATION_TRACKING: return 'an agreement that is running';
    case GroundScenario.NEW_PROJECT: return 'a new project starting';
    case GroundScenario.NEW_COFOUNDER: return 'a new co-founder or partner joining';
    case GroundScenario.NEW_MANAGER: return 'a new manager taking over';
    case GroundScenario.NEW_ADVISOR: return 'a new advisor or board member joining';
    case GroundScenario.CONTRACT_RENEWAL: return 'a contract or renewal';
    case GroundScenario.RECOGNITION: return 'a raise, promotion, or recognition';
    case GroundScenario.PIP: return "somebody's work being off track";
    case GroundScenario.OKR_ALIGNMENT: return 'setting shared goals';
    case GroundScenario.WORKPLAN_BUDGET: return 'a workplan and budget';
    case GroundScenario.PULSE_CHECK: return 'a regular read on live work';
    case GroundScenario.DRIFT: return 'a project that has gone off track';
    case GroundScenario.CRISIS_ALIGNMENT: return 'a big decision';
    case GroundScenario.BOARD_STRATEGY: return 'board or leadership strategy';
    case GroundScenario.COHORT_CHECK: return 'several people in the same role';
    case GroundScenario.REALIGN_TEAM: return 'people seeing something differently';
    case GroundScenario.ACUTE_SHOCK: return 'something serious that has just happened';
    default: return null;
  }
}

/**
 * The block, or nothing at all when setup established nothing worth naming.
 *
 * Returning an empty string rather than a heading with nothing under it: a section that says "here
 * is what is known" and then lists nothing reads as a fault, and invites the model to fill it.
 */
export function alreadyEstablished(facts: SetupFacts): string {
  const known: string[] = [];

  const situation = situationInWords(facts.scenario);
  if (situation) known.push(`This check-in was opened about ${situation}.`);

  const label = facts.groundLabel?.trim();
  /* Only when it says something the situation line does not - an unrenamed check-in carries the
     card's own label, and repeating it back adds nothing but length. */
  if (label && situation && label.toLowerCase() !== situation.toLowerCase() && !label.toLowerCase().startsWith('a ')) {
    known.push(`It is called "${label}".`);
  }

  const others = (facts.otherParties ?? []).map((p) => p.label).filter(Boolean);
  if (others.length) known.push(`The other people in it are: ${others.join(', ')}.`);

  /* Second person when they wrote it, third when somebody else did. Not a politeness: told "the
     person who set this up wrote X" about their own sentence, the model treats X as somebody
     else's account and starts asking them to respond to it. */
  const theirs = facts.readerSetItUp;
  const setUpBy = facts.setUpBy?.trim() || null;
  const whoWrote = theirs ? 'You' : (setUpBy ?? 'Their lead');

  const role = facts.roleAsDescribed?.trim();
  if (role) {
    known.push(theirs
      ? `You described your own part in it as: ${role}.`
      : `${setUpBy ?? 'Their lead'} described this person's part in it as: ${role}.`);
  }

  const brief = facts.adminBrief?.trim();
  if (brief) known.push(`${whoWrote} wrote this about the situation: ${brief}`);

  if (!known.length) return '';

  return [
    'ALREADY ESTABLISHED BEFORE THIS CONVERSATION STARTED - DO NOT ASK FOR ANY OF IT:',
    ...known.map((k) => `  ${k}`),
    '',
    'These were settled during setup, not in this conversation. Two rules follow from that, and they',
    'pull in opposite directions:',
    '',
    '  DO NOT ASK. Opening with "what is starting and who is involved" when this is on the record',
    '  reads as the product not having listened, and it is the first thing anybody sees. Skip any',
    '  pathway question this already answers and open on the next one instead.',
    '',
    '  THIS OUTRANKS THE SCENARIO PACK\'S EXACT OPENING TEXT. Your pathway gives you a written',
    '  opener, and that opener was authored without knowing what setup would collect. Where a clause',
    '  of it asks for something listed above, DROP THAT CLAUSE and open on the next part of it.',
    '  Driven live: a lead had written four sentences about the hire in setup, and the pathway opened',
    '  "Who have you just hired and what did you bring them in to do?" - the first question of the',
    '  check-in, already answered, in the words the person had typed ten minutes earlier.',
    '  If dropping the answered clauses leaves nothing, open on what setup does NOT have: what they',
    '  expect, by when, and how they will know.',
    '',
    '  DO NOT ATTRIBUTE. None of this is the person\'s own account. Somebody clicked a card and',
    '  somebody typed a brief - that is not this person saying it, and it may not even be their view.',
    '  Never say "you told me", never quote it back as their words, and never treat it as evidence.',
    '  Use it to know where to begin, then ask for their version of what matters.',
    ...(theirs ? [] : [
      '',
      `  WHO SET IT UP HAS A NAME. When you mention them, say ${setUpBy ? `"${setUpBy}"` : '"your lead"'}. Never say`,
      '  "the person who set this up", "the initiator" or "the lead": those are labels, not people.',
    ]),
  ].join('\n');
}
