/**
 * THE ANCHOR LEAD'S FIRST CONVERSATION: WHAT IT HAS HEARD, AND WHAT IT HAS NOT (docs/anchor-scenario.md, section 7;
 * request 166).
 *
 * The lead's conversation is model-led. Nothing here chooses a question or counts turns. This file does the three
 * pieces of arithmetic a model cannot do reliably across a growing transcript, and hands the result to it as context:
 *   1. the seven things the scenario wants to understand, read out of what the lead said, kept in her own words,
 *   2. which of the seven are heard and which are not, told to the model on every turn so it does not ask for what it
 *      has, and does not repeat the opening question,
 *   3. whether the conversation is complete, so the screen can move on.
 *
 * The seven keys are the ones the screens' panel reads (client FillsInAsYouTalk `ANCHOR_ITEM_LABELS`).
 */

export const THE_SEVEN = [
  'responsibleFor',
  'tryingToMove',
  'howItContributes',
  'seeingToday',
  'whyItBothersYou',
  'whatTheyDontUnderstand',
  'whatTheyWouldDoDifferently',
] as const;

export type TheSevenKey = (typeof THE_SEVEN)[number];
export type TheSevenItems = Partial<Record<TheSevenKey, string>>;

/** What each one is, in the words the model is told, in the order the scenario gives them. */
export const WHAT_EACH_OF_THE_SEVEN_IS: Record<TheSevenKey, string> = {
  responsibleFor: 'what the lead is responsible for (the outcome that sits with them, not only a job title)',
  tryingToMove: 'who the lead is trying to move (the whole company, a team, a department, people across departments, or everyone on one customer)',
  howItContributes: 'how that group helps the organisation keep going, in the lead’s own words (never assume this means sales)',
  seeingToday: 'what the lead is seeing today (the behaviour they actually see)',
  whyItBothersYou: 'why that bothers the lead (the consequence they see)',
  whatTheyDontUnderstand: 'what the lead thinks the group does not understand',
  whatTheyWouldDoDifferently: 'what the group would do differently if they understood (what the lead would notice people doing without being asked)',
};

const clean = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

/** The seven, from whatever object carries them: this turn's read, or the screen's last one (flat, or under `anchorItems`). */
export function theSevenIn(source: unknown): TheSevenItems {
  const out: TheSevenItems = {};
  if (!source || typeof source !== 'object') return out;
  const flat = source as Record<string, unknown>;
  const nested = (flat.anchorItems && typeof flat.anchorItems === 'object' ? (flat.anchorItems as Record<string, unknown>) : {});
  for (const k of THE_SEVEN) {
    const v = clean(flat[k]) ?? clean(nested[k]);
    if (v) out[k] = v;
  }
  return out;
}

/** This turn's read wins where it has something; what was heard before is kept where this turn's read has nothing. Nothing heard is ever lost. */
export function whatHasBeenHeard(thisTurn: unknown, before: unknown): TheSevenItems {
  const now = theSevenIn(thisTurn);
  const was = theSevenIn(before);
  const out: TheSevenItems = {};
  for (const k of THE_SEVEN) {
    const v = now[k] ?? was[k];
    if (v) out[k] = v;
  }
  return out;
}

export const stillToHear = (heard: TheSevenItems): TheSevenKey[] => THE_SEVEN.filter((k) => !heard[k]);

/** The conversation is complete when all seven are heard. */
export const allSevenAreHeard = (heard: TheSevenItems): boolean => stillToHear(heard).length === 0;

/**
 * THE CONTEXT HANDED TO THE MODEL ON EVERY TURN: what has been heard (in the lead's words) and what has not.
 * It is not an instruction about what to ask next. The model chooses, one question at a time, following the lead.
 */
export function whatTheConversationHasHeard(heard: TheSevenItems, openingQuestion?: string): string {
  const got = THE_SEVEN.filter((k) => heard[k]).map((k) => `- ${WHAT_EACH_OF_THE_SEVEN_IS[k]}: ${heard[k]}`);
  const missing = stillToHear(heard).map((k) => `- ${WHAT_EACH_OF_THE_SEVEN_IS[k]}`);
  const lines: string[] = ['# What you have heard so far from this lead, and what you have not'];
  if (openingQuestion) {
    lines.push(`The very first thing the lead was asked was: "${openingQuestion}" It has been asked and answered. Never ask it again, in these words or any other.`);
  }
  lines.push(got.length ? `Heard, in the lead’s own words. Do not ask for any of this again:\n${got.join('\n')}` : 'You have not heard any of the seven things yet.');
  if (missing.length) {
    lines.push(`Not heard yet. Ask about only these, one question at a time, following what the lead has just said, never as a list:\n${missing.join('\n')}`);
  }
  return lines.join('\n\n');
}

/**
 * WHAT COMES NEXT, WHEN THE RECORD SAYS THE LEAD HAS NOW SAID WHAT THE GROUP DOES NOT UNDERSTAND. Counting is not judgement, so it is
 * read here and handed to the model as context: a lead who has been heard on the present is asked, once, one kind question that
 * tests the complaint (section 9), and only then the hope question (section 10). It does not write the question.
 */
export function theChallengeIsDue(heard: TheSevenItems, challengeUsed: boolean, hopeAsked: boolean): string {
  if (challengeUsed || hopeAsked || !heard.whatTheyDontUnderstand) return '';
  return `# Your one challenge comes now

The lead has said what they think the group does not understand. You have not yet used your one challenge, so use it in this turn, before the hope question: pick the one of the six questions that fits what the lead has just said, and ask only that. The only reason to leave it out is that the lead has already told you they told the team and gave them the context. The hope question is your turn after it.`;
}

/** The turn on which everything has been heard: close the conversation instead of asking. */
export const THE_CLOSING_REMINDER = `# Everything is heard, so this turn closes the conversation

Do not ask a question in this turn. Do not use a question mark anywhere in it.
Write two short sentences and no more. Do not list or repeat what the lead told you: the screen already shows it. In the first sentence, say in your own plain words the one thing that seemed to matter most to the lead. Do not say what the conversation or Groundwork will achieve. In the second, say what happens next: the lead adds the people she wants to move on the next step, and Groundwork then checks in with each of them one to one.`;

export const THE_EXTRACTION_SYSTEM = `You are reading the first conversation between Groundwork and a lead who wants their team to understand more of what they see. Read only what the lead has said. Return only what has been clearly said, and leave out anything not yet said.

Write each item as one or two short, plain sentences in the lead's own words, in the second person addressed to the lead ("You are responsible for..."). Where the lead wrote "I", "my" or "our", write "you", "your" and "the" instead, and keep every other word as they wrote it. Use the lead's own words for the people who pay and for what they pay for. Never use the words sales, customers, pipeline or revenue unless the lead used them first. Never describe a person, a cause or a number the lead has not given. Do not guess, and do not turn a complaint into something the lead has not said. Each item needs its own words from the lead; one remark may fill one item, and it does not fill the others.

Fields:
- responsibleFor: what the lead is responsible for. The outcome that sits with them, not only a job title.
- tryingToMove: who the lead is trying to move with them (the whole company, a team, a department, people across departments, everyone working on one customer, or their direct reports).
- howItContributes: how that group helps the organisation keep going or fund its work, in the lead's words. A passing remark that gives only a direction ("it keeps us funded") is not enough; leave it out until the lead has said who pays or funds the work, or what the group does that keeps it coming.
- seeingToday: what the lead is actually seeing people do or not do today.
- whyItBothersYou: why that bothers the lead, the consequence they see.
- whatTheyDontUnderstand: what the lead thinks the group does not yet understand.
- whatTheyWouldDoDifferently: what the lead would notice people doing differently, without being asked, if the group understood. This is only the lead's own answer to being asked what better would look like, or something the lead says plainly about it. Write one short sentence for each separate thing the lead named ("You would notice people telling you before a truck is late. You would notice dispatch phoning the shop themselves."). Never work it out from the complaint: a complaint about what people do not do is not an answer about what they would do.
- peopleNamed: one entry per individual person the lead named. A team, a department or a company is not an entry.
- initial: one plain sentence, under 25 words, saying what this is about, in the lead's words.`;

export const THE_EXTRACTION_TOOL = {
  name: 'extract_anchor_lead',
  description: 'Extract what the lead has said about their world.',
  input_schema: {
    type: 'object' as const,
    properties: {
      responsibleFor: { type: 'string' },
      tryingToMove: { type: 'string' },
      howItContributes: { type: 'string' },
      seeingToday: { type: 'string' },
      whyItBothersYou: { type: 'string' },
      whatTheyDontUnderstand: { type: 'string' },
      whatTheyWouldDoDifferently: { type: 'string' },
      peopleNamed: { type: 'array', items: { type: 'string' } },
      initial: { type: 'string' },
    },
    required: [] as string[],
  },
};

/** What the screen already reads from every setup reply, filled from the seven so the summary card and the first message of the next step hold the lead's words. */
export type WhatTheScreenReadsAlready = {
  mode: string;
  initial?: string;
  whoInvolved?: string;
  peopleNamed?: string[];
  decision?: string;
  goals?: string[];
  brief?: string;
};

export function theReadTheScreenAlreadyKnows(heard: TheSevenItems, extra: { initial?: string; peopleNamed?: string[] }): WhatTheScreenReadsAlready {
  return {
    mode: 'recurring',
    ...(extra.initial || heard.seeingToday ? { initial: extra.initial ?? heard.seeingToday } : {}),
    ...(heard.tryingToMove ? { whoInvolved: heard.tryingToMove } : {}),
    ...(extra.peopleNamed?.length ? { peopleNamed: extra.peopleNamed } : {}),
    ...(heard.whyItBothersYou ? { decision: heard.whyItBothersYou } : {}),
    ...(heard.whatTheyWouldDoDifferently ? { goals: [heard.whatTheyWouldDoDifferently] } : {}),
    ...(heard.whatTheyDontUnderstand ? { brief: heard.whatTheyDontUnderstand } : {}),
  };
}
