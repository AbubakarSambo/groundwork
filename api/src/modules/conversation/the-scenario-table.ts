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
    name: 'Help a new hire get started',
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
    name: 'Hand over a role smoothly',
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
    name: 'Get a new project off to a good start',
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
  /* The anchor's lead and team read as a project's did before it had a situation of its own; only its name is its own. */
  [GroundScenario.HELP_TEAM_UNDERSTAND]: {
    name: 'Help your team understand and move with you',
    description: 'Help the people you work with see the bigger picture, and understand what you are carrying.',
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
    name: 'Start a new partnership well',
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
    name: 'Help a new manager take over',
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
    name: 'Start an advisor or board relationship',
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
    name: 'Set goals and keep the team on track',
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
    name: 'Build a workplan and budget',
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
    name: 'Align on strategy',
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
    name: 'Work through a big decision',
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
    name: 'Keep a read on live work',
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
  /* Collect what's owed (Release 2, working label): offered only where the organisation's Release 2 switch is on. */
  [GroundScenario.COLLECTIONS]: {
    name: 'Collect what’s owed',
    description: 'Which bills are due, what has been paid with proof, and what is in the way.',
    lead: {
      first: 'Get a starting picture of what is owed, who follows each one up, and what counts as paid.',
      second: 'See what has been paid with proof, what is still owed, and where support is needed.',
      last: 'See what was collected in that period and what is still owed.',
    },
    participant: {
      first: 'Share each bill they follow up or owe, with its amount and what makes it due.',
      second: 'Share what has been paid, with its proof, and what is in the way of the rest.',
      last: 'Reflect on what was paid and what is still owed.',
    },
  },
  [GroundScenario.COHORT_CHECK]: {
    name: 'Check how the same role is going',
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
    name: 'Check in before a contract ends or renews',
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
    name: 'Check an agreement before signing',
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
    name: 'Check how an agreement is going',
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
    name: 'Support a raise, promotion or recognition',
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
    name: 'Help someone get back on track',
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
    name: 'Get a project back on track',
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
    name: 'See where people see things differently',
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
    name: 'Make sense of something serious',
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
  /**
   * ONE LINE, ONE LINK, ONE REPORT. The only row whose question belongs to the lead rather than to
   * the table: every cell below is about carrying their line and getting an answer worth reading,
   * which is why none of them says "understand" or "set".
   */
  [GroundScenario.TEAM_UPDATES]: {
    name: 'Get updates from your team',
    description: 'Ask one question, everyone answers on their own link, you get one report.',
    lead: {
      first: 'Ask your one question and see what comes back.',
      second: 'See what moved since the last one.',
      last: 'See what the answers showed over the run.',
    },
    participant: {
      first: 'Answer the question you were asked, in your own words.',
      second: 'Say what has moved since last time.',
      last: 'Say where things landed.',
    },
  },
  /**
   * THE ONE THAT IS NOT ABOUT THE PEOPLE ANSWERING. Every other row asks somebody about their own
   * work; this asks a room what they know, once, so that reading the answers together produces a
   * direction. There is no second column that matters, because there is no second session.
   */
  [GroundScenario.DISCOVERY]: {
    name: 'Work out where to focus',
    description: 'Ask a group what they know, once, and turn the answers into a direction.',
    lead: {
      first: 'See where the room says the opportunity and the gaps are.',
      second: 'There is no second session. One conversation is the design.',
      last: 'Set the priorities from what the group named together.',
    },
    participant: {
      first: 'Say what you are trying to grow, what stops you, and where you would go.',
      second: 'Nothing to come back to: one session is the whole of it.',
      last: 'Your answers go in with everybody else and the picture comes back.',
    },
  },
  [GroundScenario.SNAPSHOT]: {
    name: 'Take the pulse of the team',
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
    name: 'Work through something else',
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
  /*
   * AND WHAT TO DO WITH THE PACK'S OWN QUESTIONS, WHICH ARE ALL WRITTEN FOR SESSION ONE.
   *
   * Six packs were rewritten to their cards. The other sixteen got the right opening line and a body
   * that still asks what somebody is trying to achieve, what their role is, what the situation is -
   * every one of them a first-session question. So a fourth check-in ran a first interview under a
   * heading that said "what has changed since".
   *
   * Rewriting sixteen bodies is the thorough fix and it is not the honest one to do blind: those
   * questions are right, they are simply right ONCE. What the model actually needs is to be told
   * that. The pack becomes what this check-in is ABOUT, and the stage decides what to do with it.
   *
   * ALREADY ANSWERED IS THE TEST, NOT ALREADY ASKED. Somebody who never answered a pack question in
   * session one should still be asked it in session two. The conversation so far is in front of the
   * model; this tells it to look.
   */
  const wording: Record<Stage, string> = {
    first: [
      'This is the FIRST check-in. Establish their picture of it. Do not interrogate them.',
      'The questions in the situation prompt below are for this conversation. Work through them one at a time.',
    ].join('\n'),
    second: [
      'This is a LATER check-in, not the last. Pick up the thread: what they said before, and what has happened since.',
      '',
      'THE QUESTIONS IN THE SITUATION PROMPT BELOW WERE WRITTEN FOR THE FIRST CHECK-IN. Read them as what',
      'this check-in is ABOUT, not as what to ask today. Anything already answered is settled: do not ask it',
      'again, ask what has changed about it. Anything genuinely never answered is still worth asking once.',
      '',
      'Open on what moved. Their own numbers, what is in the way now, what they need from somebody else.',
    ].join('\n'),
    last: [
      'This is the LAST check-in. Close the loop: where did this get to.',
      '',
      'THE QUESTIONS IN THE SITUATION PROMPT BELOW WERE WRITTEN FOR THE FIRST CHECK-IN and this is the end of',
      'the run. Do not re-open them. Where the thing they set out to do landed, what did not, and what is left',
      'for somebody to pick up is the whole of this conversation.',
      '',
      'Nothing new is being set up here. If they raise something new, take it down and say plainly that it is',
      'one for whatever comes next rather than something this run will resolve.',
    ].join('\n'),
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
