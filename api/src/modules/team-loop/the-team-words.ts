/**
 * WHAT A TEAM MEMBER, AND FATIMA, READ FROM THE TEAM LOOP (Fatima, increment 6a). Plain, full sentences. No colons that join pieces, no labels on
 * anybody, no scores. Every sentence about what somebody did names where it came from, or says it is not verified.
 */

/** The standard questions (plan 6.3). A person is asked a question only while it is not already answered by what they sent. */
export const THE_QUESTIONS: { slug: string; what: string }[] = [
  { slug: 'q:working_on', what: 'What they are working on.' },
  { slug: 'q:what_changed', what: 'What has changed since they last told Groundwork.' },
  { slug: 'q:result', what: 'What result has been achieved, with something that shows it.' },
  { slug: 'q:blocked', what: 'Whether anything is blocked, and who it waits on.' },
  { slug: 'q:support', what: 'What support they need.' },
];

/** One focused question for a vague answer, by what was vague. Never more than one, and never a list. */
export const THE_ONE_QUESTION = {
  ongoing: (first: string, about: string) => `${first}, thank you. You said ${about} is ongoing. What has changed on it since you last told me, and what result do you expect from it?`,
  done: (first: string, about: string) => `${first}, thank you. You said ${about} is done. What was the result, and is there a message or a document I can see that shows it?`,
  soon: (first: string, about: string) => `${first}, thank you. You said ${about} will be soon. Which day do you expect to finish it?`,
};

export const THANKS_AND_COVERED = (first: string) => `${first}, thank you. What you sent already answers what I would have asked, so I have no questions for you.`;
export const THANKS_FOR_THE_UPDATE = (first: string, kept: number) => `${first}, thank you. I have noted ${kept === 1 ? 'the one thing' : `the ${kept} things`} from what you sent, and I will not ask you for it again.`;

export const ONE_MORE_THING_IS_ENOUGH = 'I have asked about this once, so I will not ask again unless you tell me more.';

/* ---- Help for the team member. Private to them. ---- */
export const HELP_NEEDS_MORE = (first: string) => `${first}, I can help with that. Tell me who it is for and what you want it to achieve, and I will write a first version for you to change.`;
export const NOTHING_ABOUT_OTHERS = (first: string) => `${first}, I do not tell anybody what somebody else has sent me, and I do not say how anyone is doing. I can tell you what I have noted from you, or help with your own work.`;
export const HELP_IS_PRIVATE = 'What you ask me for help with stays between you and me. Fatima only sees the work you have documented and the updates you choose to share.';
export const HELP_CANNOT_NOW = (first: string) => `${first}, I could not write that just now. Please ask me again in a little while, and I will help you with it then.`;

/* ---- Nudges. ---- */
export const NUDGE_FOR_EVIDENCE = (first: string, thing: string) => `${first}, you told me you would ${thing}. Has it moved? If it has, send me the message or document that shows it, and I will update it for you.`;
/** For something that is not a promise in their own words (a note they sent, or a blocker): it is said back as what it is, never as "you told me you would". */
export const NUDGE_FOR_SOMETHING_SENT = (first: string, thing: string) => `${first}, I still have “${thing}” open from what you sent me. Has it moved? If it has, send me the message or document that shows it, and I will update it for you.`;
export const NUDGE_FOR_AN_APPROVER = (approverFirst: string, owner: string, thing: string, since: string | null) => `${approverFirst}, ${owner} told me that “${thing}” is waiting for your approval${since ? `, since ${since}` : ''}. Could you tell me when you expect to decide, or send your answer to ${owner}? I will not ask ${owner} about it while it waits on you.`;

/* ---- Standing instructions. ---- */
export const THE_INSTRUCTION_BACK = (a: { first: string; who: string[]; askWhen: string; emailWhen: string | null; matter: string | null }) =>
  a.emailWhen
    ? `${a.first}, I understand. I will ask ${nameList(a.who)} for their updates${a.matter ? ` on ${a.matter}` : ''} ${a.askWhen}, and email you what they send ${a.emailWhen}. Shall I go ahead?`
    : `${a.first}, I understand. I will ask ${nameList(a.who)}${a.matter ? ` about ${a.matter}` : ''} now, and come back to you when I have what I need, or after three days with whatever I have and who has not answered. Shall I go ahead?`;
export const THE_INSTRUCTION_IS_UNCLEAR = (first: string, matter: string | null, missing: ('owner' | 'date')[]) => {
  const about = matter ? `on “${matter.replace(/[.!?]+$/, '')}”` : 'on that';
  if (missing.includes('owner') && missing.includes('date')) return `${first}, I can follow up with the team ${about}. Who should take it, and by which day should it be done?`;
  if (missing.includes('owner')) return `${first}, I can follow up with the team ${about}. Who should take it?`;
  return `${first}, I can follow up with the team ${about}. By which day should it be done?`;
};
export const THE_INSTRUCTION_IS_ON = 'Done. I will do it as I said, and I will tell you if anything stops me.';
export const THE_INSTRUCTION_IS_OFF = 'All right. I have not asked anybody anything.';
export const NO_ONE_TO_ASK = (first: string) => `${first}, I would do that, but nobody in your team has told me they are happy to hear from me yet. Please send me their names and contacts first.`;
export const ONLY_SHE_CAN_GIVE_ONE = 'Only Fatima can give me an instruction like that.';
export const THE_ASK_FOR_AN_UPDATE = (first: string, forName: string, matter: string | null) => `Hello ${first}, ${forName} asked me to collect the team's updates${matter ? ` on ${matter}` : ''}. Please send me where things stand on your work, and any document that shows it. You can write it here, forward it, or send a voice note.`;

/* ---- Corrections. ---- */
export const NOT_CHANGED_YET = (first: string) => `${first}, I have not changed it yet, because nothing I hold shows that it was done. Please send me the message or document that shows it, and I will put it right as soon as I have it.`;
export const NOTHING_TO_CHECK = (first: string) => `${first}, I could not find which item you mean. Which one is it?`;

/* ---- A line in the weekly email: where it came from, or that it is not verified. ---- */
export const SAID_ON = (day: string, how: string) => `${how === 'document' ? 'shown in a document' : 'said in a message'} on ${day}`;
export const NOT_VERIFIED = 'this is only what they said, with nothing to show it yet';

export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
