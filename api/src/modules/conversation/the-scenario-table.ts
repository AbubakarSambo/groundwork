import { GroundScenario, PartyType } from '@prisma/client';

/**
 * WHAT EACH CHECK-IN IS FOR: THE SCENARIO, THE PERSON, AND WHICH ONE IT IS.
 *
 * Hafsah's table, 15 September 2026, held verbatim at docs/THE-SCENARIO-TABLE.md. Where a pack
 * disagrees with the table, the table wins.
 *
 * IT EXISTS BECAUSE THE CARD AND THE PACK WERE TWO DIFFERENT PRODUCTS. The card for OKR_ALIGNMENT
 * promises "set goals, targets or OKRs for your team... you can see what is on track". The pack
 * behind it said "MOMENT: OKR alignment across teams. PURPOSE: Each person submits their own OKRs
 * and shows how they connect to the company OKRs... before the planning cycle locks in."
 *
 * So a lead who came to set targets was asked three times how her objective connected to the
 * company direction and could not get away from it. The conversation was not malfunctioning. It was
 * faithfully running a scenario nobody picked.
 *
 * AND A PACK HAD ONE VOICE FOR EVERY SESSION. Session four ran the same interview as session one,
 * for the lead and the participant alike. Six cells per scenario is the fix: two people, three
 * moments, and they are genuinely different conversations.
 *
 *   first  = understand. Establish the person's picture, do not interrogate them.
 *   second = check what changed. "Last time you said X. What has happened since?"
 *   last   = see where things landed. "Where did we get to?"
 *
 * The spine underneath all twenty-two, which is what makes them one product rather than
 * twenty-two interviews:
 *
 *   What were you meant to do -> what is actually happening -> how do you see it ->
 *   what has changed -> where do we need to act or support.
 */

/** Which of the three a check-in is. Not the session number: the LAST one is last however many there are. */
export type Stage = 'first' | 'second' | 'last';

export interface AScenarioRow {
  /** The name in Hafsah's table. The pack must deliver this and not something adjacent to it. */
  name: string;
  /**
   * THERE IS NO ESCAPE HATCH HERE ANY MORE, AND THAT IS THE POINT.
   *
   * This field existed for one row: SNAPSHOT's card said "Take One Read, Today" rather than the
   * table's "Take the Pulse of the Team", to keep the word "pulse" away from the scenario that is
   * NOT called PULSE_CHECK. The reasoning was about the enum names, and the enum names lie:
   * PULSE_CHECK is the recurring read and SNAPSHOT is the quick one-off, which is what most people
   * mean by a pulse check.
   *
   * So the card carries the table's name, and the two are told apart by what they say they do -
   * "regularly, while it is happening" against "a quick picture, right now, once only" - which is
   * what was actually separating them. A field that lets one row differ is a field that lets the
   * next twenty differ, one reasonable exception at a time.
   */
  /** What it is for, in one line, as the card says it. */
  description: string;
  lead: { first: string; second: string; last: string };
  participant: { first: string; second: string; last: string };
}

export const THE_SCENARIO_TABLE: Partial<Record<GroundScenario, AScenarioRow>> = {
  [GroundScenario.NEW_HIRE]: {
    name: 'Help a New Hire Get Started',
    description: 'Help a new team member settle in, understand their role, and surface what they need.',
    lead: {
      first: 'Set expectations and understand how the person is starting out.',
      second: 'See how they are settling in and where they need support.',
      last: 'Understand how the transition went and what they need next.',
    },
    participant: {
      first: 'Understand the role and share how the start is going.',
      second: 'Share what is clearer, harder, or different.',
      last: 'Reflect on how the start went and what would help going forward.',
    },
  },
  [GroundScenario.ROLE_HANDOVER]: {
    name: 'Hand Over a Role Smoothly',
    description: 'Help someone take over a role without losing important context or work.',
    lead: {
      first: 'Understand the handover and what the new person needs to know.',
      second: 'Check what they have discovered since taking over.',
      last: 'See what was successfully handed over and what remains.',
    },
    participant: {
      first: 'Understand the role and ask questions.',
      second: 'Share what they have learned or found unclear.',
      last: 'Share what was missed and what still needs attention.',
    },
  },
  [GroundScenario.NEW_PROJECT]: {
    name: 'Get a New Project Off to a Good Start',
    description: 'Get everyone clear on the work, their role, and what needs to happen.',
    lead: {
      first: 'Set the project context and expectations.',
      second: 'See whether the work is moving as expected.',
      last: 'See what was achieved and what remains.',
    },
    participant: {
      first: 'Understand their role and what they are meant to deliver.',
      second: 'Share progress, blockers, and changes.',
      last: 'Reflect on what worked and what should happen next.',
    },
  },
  [GroundScenario.NEW_COFOUNDER]: {
    name: 'Start a New Partnership Well',
    description: 'Build a shared understanding of a new co-founder or partner relationship.',
    lead: {
      first: 'Set expectations and understand how each person sees the relationship.',
      second: 'See whether the relationship is working as expected.',
      last: 'Understand where the relationship landed and what should change.',
    },
    participant: {
      first: 'Share what they expect and what matters to them.',
      second: 'Share what is working or not working.',
      last: 'Reflect on the relationship and what they want going forward.',
    },
  },
  [GroundScenario.NEW_MANAGER]: {
    name: 'Help a New Manager Take Over',
    description: 'Help a new manager understand the team and how the work is going.',
    lead: {
      first: "Give the manager context and understand the team's starting point.",
      second: 'See how the new setup is working.',
      last: 'Understand what changed and what still needs attention.',
    },
    participant: {
      first: 'Share how things are going and what they need from the manager.',
      second: 'Share what has changed under the new setup.',
      last: 'Reflect on how the relationship and team setup are working.',
    },
  },
  [GroundScenario.NEW_ADVISOR]: {
    name: 'Start a New Advisor or Board Relationship',
    description: 'Build a shared understanding of the role, expectations, and contribution.',
    lead: {
      first: 'Set the context and understand what they expect to contribute.',
      second: 'See what they have learned and where they are adding value.',
      last: 'Understand what has been useful and what should continue.',
    },
    participant: {
      first: 'Understand the role and share their perspective.',
      second: 'Share what they are seeing now.',
      last: 'Reflect on what has been useful and what could improve.',
    },
  },
  [GroundScenario.OKR_ALIGNMENT]: {
    name: 'Set Goals and Keep the Team on Track',
    description: 'Set goals, targets or OKRs and keep track of how the work is going.',
    lead: {
      first: 'Set goals and understand what each person is working towards.',
      second: 'See what is on track, what is off, and where support is needed.',
      last: 'See what was achieved and what still needs attention.',
    },
    participant: {
      first: 'Understand their goals and how they will work towards them.',
      second: 'Share progress, blockers, and what they need.',
      last: 'Reflect on progress and what comes next.',
    },
  },
  [GroundScenario.WORKPLAN_BUDGET]: {
    name: 'Build a Workplan and Budget That Makes Sense',
    description: "Bring people's plans together so the work and budget line up.",
    lead: {
      first: 'Understand what each person plans to do and what they need.',
      second: 'Check whether the plan and resources still make sense.',
      last: 'See what happened against the plan and budget.',
    },
    participant: {
      first: 'Explain their planned work and resource needs.',
      second: 'Share changes, challenges, or gaps.',
      last: 'Reflect on what worked and what needs to change.',
    },
  },
  [GroundScenario.BOARD_STRATEGY]: {
    name: 'Align on Strategy',
    description: 'Understand how leaders see the direction and where their views differ.',
    lead: {
      first: 'Understand how each person sees the strategy and priorities.',
      second: 'See where views are coming together or diverging.',
      last: 'Understand where the group landed and what needs to happen.',
    },
    participant: {
      first: 'Share what they think matters and why.',
      second: 'Share what has changed or become clearer.',
      last: 'Reflect on the final direction and remaining concerns.',
    },
  },
  [GroundScenario.CRISIS_ALIGNMENT]: {
    name: 'Work Through a Big Decision',
    description: 'Bring different views together around an important decision.',
    lead: {
      first: "Understand each person's view and what they are weighing up.",
      second: 'See what has changed or become clearer.',
      last: 'Understand where each person stands and what needs to happen.',
    },
    participant: {
      first: 'Share their honest view and what matters to them.',
      second: 'Reconsider their view as they learn more.',
      last: 'Share where they landed and any remaining concerns.',
    },
  },
  [GroundScenario.PULSE_CHECK]: {
    name: 'Keep a Read on Live Work',
    description: 'Regularly understand how work is going while it is happening.',
    lead: {
      first: 'Get a starting picture of the work.',
      second: 'See what has changed and where support is needed.',
      last: 'See where things landed in that period.',
    },
    participant: {
      first: 'Share how the work is going right now.',
      second: 'Share what has changed.',
      last: 'Reflect on what happened and what is next.',
    },
  },
  [GroundScenario.COHORT_CHECK]: {
    name: 'Check How the Same Role Is Going Across People',
    description: 'Understand how people doing similar work are experiencing it.',
    lead: {
      first: "Understand each person's experience of the role.",
      second: 'See common issues and differences emerging.',
      last: 'Understand what patterns matter and what needs to change.',
    },
    participant: {
      first: 'Share their own experience of the role.',
      second: 'Share what has changed or become clearer.',
      last: 'Reflect on what would make the role work better.',
    },
  },
  [GroundScenario.CONTRACT_RENEWAL]: {
    name: 'Check In Before a Contract or Renewal',
    description: 'Understand how a working relationship is going before deciding what happens next.',
    lead: {
      first: 'Understand how the relationship is working.',
      second: 'See what has changed and what needs attention before renewal.',
      last: 'Decide what should continue, change, or stop.',
    },
    participant: {
      first: 'Share how the relationship is working from their side.',
      second: 'Share what they would like to change.',
      last: 'Say what they think should happen next.',
    },
  },
  [GroundScenario.CONTRACT_REVIEW]: {
    name: 'Check an Agreement Before Signing',
    description: 'Make sure the people involved understand and are comfortable with an agreement.',
    lead: {
      first: 'Understand how each person sees the agreement.',
      second: 'Surface anything that needs clarification or change.',
      last: 'Confirm where things stand before signing.',
    },
    participant: {
      first: 'Explain what makes sense and what does not.',
      second: 'Raise questions or concerns.',
      last: 'Share whether they are comfortable moving forward.',
    },
  },
  [GroundScenario.IMPLEMENTATION_TRACKING]: {
    name: 'Check How an Agreement Is Going',
    description: 'Understand how an agreement is working in practice.',
    lead: {
      first: 'Understand what each side expects and is responsible for.',
      second: 'See whether the agreement is working as expected.',
      last: 'Understand what worked, what changed, and what happens next.',
    },
    participant: {
      first: 'Share how the agreement is working from their side.',
      second: 'Share what is working or causing problems.',
      last: 'Reflect on the relationship and next steps.',
    },
  },
  [GroundScenario.RECOGNITION]: {
    name: 'Support a Raise, Promotion, or Recognition',
    description: "Understand someone's contribution and experience before making a recognition decision.",
    lead: {
      first: 'Understand their role, contribution, and progress.',
      second: 'See what has changed and what they have contributed.',
      last: 'Bring together the picture of their work and progress.',
    },
    participant: {
      first: 'Share what they have been working on and how they see their contribution.',
      second: 'Share progress and anything they want understood.',
      last: 'Reflect on their progress and what they want next.',
    },
  },
  [GroundScenario.PIP]: {
    name: 'Help Someone Get Back on Track',
    description: "Understand what is getting in the way when someone's work is off track.",
    lead: {
      first: 'Understand what is happening without jumping to conclusions.',
      second: 'See what has changed and what support is helping.',
      last: 'See whether things are back on track and what remains.',
    },
    participant: {
      first: 'Explain what is happening from their side.',
      second: 'Share what has changed and what is still difficult.',
      last: 'Reflect on where things landed and what they need next.',
    },
  },
  [GroundScenario.DRIFT]: {
    name: 'Get a Project Back on Track',
    description: 'Understand why a project is off track and what needs to change.',
    lead: {
      first: 'Understand what each person sees as the problem.',
      second: 'See what has changed and where the project is still stuck.',
      last: 'Understand what was fixed and what needs to happen next.',
    },
    participant: {
      first: 'Share what they think is happening.',
      second: 'Share what has changed and what they need.',
      last: 'Reflect on where the project landed.',
    },
  },
  [GroundScenario.REALIGN_TEAM]: {
    name: 'Understand Where People See Things Differently',
    description: "Understand different views when people don't see a situation the same way.",
    lead: {
      first: "Understand each person's view without asking them to agree.",
      second: 'See what has changed or become clearer.',
      last: 'Understand the remaining differences and what needs to happen.',
    },
    participant: {
      first: 'Explain how they see the situation.',
      second: 'Share whether their view has changed.',
      last: 'Say what they think needs to be understood or resolved.',
    },
  },
  [GroundScenario.ACUTE_SHOCK]: {
    name: 'Make Sense of Something Serious That Happened',
    description: 'Give people a private way to explain what happened and what needs attention.',
    lead: {
      first: 'Understand what happened from each person’s perspective.',
      second: 'See what has happened since and what is changing.',
      last: 'Understand what needs to happen now.',
    },
    participant: {
      first: 'Explain what they saw and how it affected the work.',
      second: 'Share what has happened since.',
      last: 'Reflect on what needs to be addressed going forward.',
    },
  },
  [GroundScenario.SNAPSHOT]: {
    name: 'Take the Pulse of the Team',
    description: 'Get a quick picture of how people are experiencing the work right now.',
    lead: {
      first: 'Get a starting picture of how things feel and what matters.',
      second: 'See what has changed.',
      last: 'See what stands out from the period.',
    },
    participant: {
      first: 'Share how things are really going.',
      second: 'Share what has changed.',
      last: 'Reflect on what needs attention.',
    },
  },
  [GroundScenario.OPEN_READ]: {
    name: 'Work Through Something Else',
    description: "Give people a starting point when the situation doesn't fit a predefined scenario.",
    lead: {
      first: 'Understand what is happening and what matters to the person.',
      second: 'See what has changed.',
      last: 'Understand where things landed and what comes next.',
    },
    participant: {
      first: 'Start wherever makes sense and explain what is going on.',
      second: 'Share what has changed.',
      last: 'Reflect on what happened and what they need next.',
    },
  },
};

/**
 * WHICH OF THE THREE THIS IS.
 *
 * Not the session number. The LAST check-in is the last one however many there are, and on a
 * two-session run the second IS the last. Everything between the first and the last is a second:
 * "what has changed since" is the right question for session three as much as session two.
 */
export function whichStage(sessionNumber: number, sessionsPlanned: number | null | undefined): Stage {
  const n = Math.max(1, Math.floor(sessionNumber || 1));
  const total = sessionsPlanned && sessionsPlanned > 0 ? Math.floor(sessionsPlanned) : null;
  if (n <= 1) return 'first';
  if (total && n >= total) return 'last';
  return 'second';
}

/**
 * What this check-in is for, in the table's own words, for this person at this point.
 *
 * Empty for a scenario the table does not carry, which is how a new scenario behaves until somebody
 * writes its row rather than inheriting a neighbour's.
 */
export function whatThisCheckInIsFor(
  scenario: GroundScenario,
  partyType: PartyType,
  stage: Stage,
): string {
  const row = THE_SCENARIO_TABLE[scenario];
  if (!row) return '';
  const side = partyType === PartyType.INITIATOR ? row.lead : row.participant;
  const wording: Record<Stage, string> = {
    first: 'This is the FIRST check-in. Establish their picture of it. Do not interrogate them.',
    second: 'This is a LATER check-in, not the last. Pick up the thread: what they said before, and what has happened since.',
    last: 'This is the LAST check-in. Close the loop: where did this get to.',
  };
  return [
    `WHAT THIS CHECK-IN IS: ${row.name}.`,
    `WHAT IT IS FOR: ${row.description}`,
    '',
    wording[stage],
    `WHAT THIS PERSON GETS OUT OF IT: ${side[stage]}`,
    '',
    'Everything you ask serves that line. A question that does not is a question for a different',
    'check-in, however reasonable it sounds.',
  ].join('\n');
}
