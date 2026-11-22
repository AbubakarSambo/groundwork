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
/**
 * NOBODY TO WRITE TO, SAID FROM WHO IS ON HER RECORD (release test 21 November, 81). It read "nobody in your team has told me they are happy to hear from me",
 * which nobody is ever asked, to a senior person who had given no names at all.
 */
export const NO_ONE_TO_ASK = (first: string, a: { notIntroducedYet: number; namedButNotOnIt: string[] }) =>
  a.namedButNotOnIt.length
    ? `${first}, I would do that, but ${nameList(a.namedButNotOnIt)} ${a.namedButNotOnIt.length === 1 ? 'is' : 'are'} not among the people in your team I can write to. Send me ${a.namedButNotOnIt.length === 1 ? 'their' : 'each one\'s'} phone number or email address, and I will introduce myself first.`
    : a.notIntroducedYet
      ? `${first}, I would do that, but I have not been able to introduce myself to anybody in your team yet, so there is nobody I can write to. I will tell you as soon as I can.`
      : `${first}, I would do that, but you have not given me anybody in your team to write to yet. Send me their names with a phone number or an email address, and I will introduce myself to them first.`;
/** Her own name, never a fixed one (it read "Only Fatima" in every organisation). */
export const ONLY_SHE_CAN_GIVE_ONE = (principalFirst: string) => `Only ${principalFirst} can give me an instruction like that.`;

const aThing = (t: string) => `“${String(t ?? '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').slice(0, 120)}”`;

/**
 * THE ASK TO ONE PERSON, FROM THEIR OWN PART OF THE RECORD (Batch D, R5). It names what is still open with them, and what the record already holds from them,
 * so they are never asked for a document already on record (D13). With nothing open and nothing held it is the plain ask it always was.
 */
export const THE_ASK_FOR_AN_UPDATE = (first: string, forName: string, matter: string | null, theirs?: { open: { text: string; dueSaid: string | null }[]; held: string[]; today?: boolean }) => {
  const open = theirs?.open ?? [];
  const held = theirs?.held ?? [];
  const lead = `Hello ${first}, ${forName} asked me to collect the team's updates${matter ? ` on ${matter}` : ''}${theirs?.today ? ' today' : ''}.`;
  if (!open.length && !held.length) return `${lead} Please send me where things stand on your work, and any document that shows it. You can write it here, forward it, or send a voice note.`;
  const openSaid = open.length
    ? ` The record shows ${aThing(open[0].text)}${open[0].dueSaid ? `, which you said for ${open[0].dueSaid},` : ''} is still open with you${open.length > 1 ? `, and ${open.length - 1} more ${open.length === 2 ? 'matter' : 'matters'} too` : ''}. Please tell me where ${open.length > 1 ? 'each one' : 'it'} stands.`
    : ' Please send me where things stand on your work.';
  const heldSaid = held.length ? ` I already have ${held.slice(0, 2).join(' and ')}${held.length > 2 ? `, and ${held.length - 2} more things you sent` : ''}, so there is no need to send ${held.length === 1 ? 'it' : 'them'} again. Send a document only for something I do not have yet.` : ' Send any document that shows it.';
  return `${lead}${openSaid}${heldSaid} You can write it here, forward it, or send a voice note.`;
};

/**
 * WHO WILL BE WRITTEN TO, HOW, AND ABOUT WHAT (Batch D, R5, D2). Said back before anything goes, from the people on her record: she is never asked who her
 * team is. The people are named by how they are reached, and each is asked about what is still open with them (the ask itself names it).
 *
 * WHAT SHE IS TOLD IS WHAT WILL HAPPEN (Dangote rerun, N1 and N2). Whether a person can be written to today is read from one owner (has-this-person-been-asked.ts,
 * howTheyCanBeWrittenToToday), and anybody who cannot is named, with when they will be. It was one sentence per person (9,024 characters for 64 people), which
 * no phone could take in one message.
 */
export const THE_TEAM_WRITTEN_TO = (a: { first: string; matter: string | null; today: boolean; people: { name: string; how: 'WhatsApp' | 'email'; about: string | null; more: number; tomorrow?: boolean }[] }) => {
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const when = a.today ? 'today' : 'now';
  const now = a.people.filter((p) => !p.tomorrow);
  const later = a.people.filter((p) => p.tomorrow).map((p) => p.name);
  const askFor = a.matter ? `about ${a.matter.replace(/[.!?]+$/, '')}` : 'where their work stands';
  const laterSaid = later.length ? ` ${list(later)} ${later.length === 1 ? 'has' : 'have'} already had a message from me today, so I will write to them tomorrow morning.` : '';
  const closing = `I will tell you as soon as they have answered${a.today ? ', and this evening with whatever I have and who has not answered' : ', or after three days with whatever I have and who has not answered'}. Shall I go ahead?`;
  if (now.length === 1) {
    const p = now[0];
    return `${a.first}, I will write to ${p.name} ${p.how === 'email' ? 'by email' : 'on WhatsApp'} ${when}, and ask them ${askFor}${p.about ? `, and about ${aThing(p.about)}, which is still open${p.more ? `, and ${p.more} more ${p.more === 1 ? 'matter' : 'matters'}` : ''}` : ''}.${laterSaid} Nobody is asked for a document I already have. I will tell you as soon as they have answered. Shall I go ahead?`;
  }
  if (!now.length) return `${a.first}, everybody I would write to has already had a message from me today, so I will write to ${list(later)} tomorrow morning, and ask each of them ${askFor}. Nobody is asked for a document I already have. ${closing}`;
  const byWhatsApp = now.filter((x) => x.how === 'WhatsApp').map((x) => x.name);
  const byEmail = now.filter((x) => x.how === 'email').map((x) => x.name);
  const parts = [byWhatsApp.length ? `${list(byWhatsApp)} on WhatsApp` : '', byEmail.length ? `${list(byEmail)} by email` : ''].filter(Boolean);
  const open = now.some((p) => p.about) ? ' I will also ask each of them about anything still open with them.' : '';
  return `${a.first}, I will write to ${now.length} people on your record ${when}, and ask each of them ${askFor}. I will write to ${parts.join(', and to ')}.${open}${laterSaid} Nobody is asked for a document I already have. ${closing}`;
};

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
