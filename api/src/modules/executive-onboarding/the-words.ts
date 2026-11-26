/**
 * WHAT A PERSON READS, FROM THE FIRST DAY (Ebele, increment 5). The four introductions are in the-introductions.ts and are the customer's own.
 * Everything else here is written for a senior person who hates hassle: short, plain sentences, her name, no jargon, nothing that sounds like
 * software, no mention of a dashboard or of signing up, and never a label on a person. It is the product's words, never a model's, so a name or a
 * count cannot change on the way.
 */

import { theWordsInDoubt } from '../voice/the-transcriber';

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const count = (n: number, one: string, many: string) => `${n >= 0 && n <= 10 ? SMALL[n] : n} ${n === 1 ? one : many}`;
const sentenceCase = (s: string) => s[0].toUpperCase() + s.slice(1);
/** "January, February, March and April" becomes "January to April": a run of three or more months in a row is said as a range. */
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthsAsRanges(names: string[]): string[] {
  const idx = names.map((n) => MONTH_NAMES.indexOf(n));
  const out: string[] = [];
  for (let i = 0; i < names.length; ) {
    let j = i;
    while (j + 1 < names.length && idx[j + 1] === idx[j] + 1) j += 1;
    if (j - i >= 2) out.push(`${names[i]} to ${names[j]}`); else for (let k = i; k <= j; k += 1) out.push(names[k]);
    i = j + 1;
  }
  return out;
}
export const aList = list;

/* ---- The admin who adds her ---- */
export const ONLY_AN_ADMIN_MAY_ADD = 'Only an administrator of the organisation can add a senior person.';
export const THE_EMAIL_IS_NOT_AN_ADDRESS = 'That does not look like an email address. Please write the whole address.';
export const THAT_ADDRESS_IS_ELSEWHERE = 'That email address already belongs to somebody in another organisation, so I have not added anybody. Please use the address the office uses.';
export const THAT_NUMBER_IS_A_COLLEAGUES = (name: string) => `That number is already on ${name}'s entry, and one number belongs to one person. I have not added anybody. Please check the number.`;
export const AN_ADMIN_WAS_TOLD = (a: { first: string; jobs: string[]; email: string; whatsapp: string | null; introductions: { channel: string; state: string; reason: string | null }[]; permissionsMissing: string[] }): string => {
  const said = a.introductions.map((i) => {
    const where = i.channel === 'email' ? 'The email introduction' : 'The WhatsApp introduction';
    if (i.state === 'sent') return `${where} has been sent.`;
    if (i.state === 'held') return `${where} is waiting. ${i.reason}`;
    if (i.state === 'suppressed') return `${where} was not sent. ${i.reason}`;
    if (i.state === 'failed') return `${where} could not be sent, and I will try again.`;
    return `${where} has already been handled.`;
  });
  const lines = [`I have added ${a.first}. ${a.first} does not need to register or sign in to anything.`, `I have started the two standing jobs, ${list(a.jobs.map((j) => `“${j}”`))}.`];
  const noMessaging = a.permissionsMissing.includes(PERMISSIONS_NAMES.messaging);
  if (noMessaging) lines.push(`Nothing has been sent to ${a.first} yet, because the approval to message ${a.first} has not been confirmed.`);
  else lines.push(...said);
  const others = a.permissionsMissing.filter((m) => m !== PERMISSIONS_NAMES.messaging);
  if (others.length) lines.push(`The approval for ${list(others)} has not been confirmed yet, and I will not act on those until it is.`);
  return lines.join(' ');
};
export const PERMISSIONS_NAMES: Record<string, string> = { dataHandling: 'handling the office’s information', teamOutreach: 'writing to the team', confidentialInformation: 'confidential information', messaging: 'messaging the executive' };

/* ---- What she says to hold things ---- */
export const OK_I_HAVE_STOPPED = (first: string) => `Of course, ${first}. I will not message you until you tell me to carry on. Anything you send me, I will still keep safe.`;
export const OK_I_WILL_SLOW_DOWN = (first: string) => `Of course, ${first}. I will keep quiet for three days, and then only write when something really needs you. Say "carry on" when you want me back to normal.`;
export const OK_I_AM_BACK = (first: string) => `Thank you, ${first}. I am back to normal, and I will keep my messages short and few.`;

/* ---- The acknowledgement and the first picture ---- */
export interface ThePicture {
  first: string;
  /** Whose material this is, when somebody acts for her: said as "Ebele's" and never as "your". */
  forName: string | null;
  messages: number;
  files: number;
  voiceNotes: number;
  duplicates: number;
  couldNotRead: { name: string; because: string }[];
  archivesNotOpened: { name: string; because: string }[];
  insideArchives: { archive: string; files: number }[];
  voiceUnsure: string[];
  subjects: string[];
  workstreams: string[];
  open: number;
  awaitingDecision: number;
  noOwner: number;
  unverified: number;
  months: string[];
  /** The months are the months she forwarded a monthly note for, and are said so. Otherwise they are the months the record is dated in. */
  monthsAreNotes?: boolean;
  gapMonths: string[];
  hasTeam: boolean;
  /** Names of people already asked to take part: only people something reached (the delivery rows). */
  team: string[];
  /** Names of people she named whom nothing has reached yet. Said as not asked. */
  teamNotReached?: string[];
  /** The newest version of her year-end report, when there is one: a later forward is not in it until she asks for a new version. */
  draftVersion?: number | null;
  /** Only a few words came in and nothing else: a courtesy, not material (round 1, I-04). Optional so every earlier caller stands. */
  onlyAFewWords?: boolean;
  /** One precise question about something she (or the person who forwards for her) handed over without saying who should do it or by when. It replaces the closing question about other people, so a batch ends with one question (round 2, C5). */
  ask?: string;
  /** She has had a first picture before: what she sends later is thanked and added to, and the whole picture is not told again (Ebele round 3). */
  later?: boolean;
  /**
   * What the forward leaves outstanding, put on her own list in its own words, and any instruction inside it to Groundwork, which is never done
   * (Hafsah, 22 November 2026). Optional so every earlier caller stands.
   */
  fromTheForward?: { added: { what: string; due: string | null }[]; instructions: string[] };
}

/** What was put on her list from the forward, by name, and what in it was not done. Said in the first picture and in every later one. */
function whatTheForwardLeftOutstanding(p: ThePicture): string[] {
  const f = p.fromTheForward;
  if (!f) return [];
  const out: string[] = [];
  const whose = p.forName ? `${p.forName}'s` : 'your';
  if (f.added.length) out.push(`I have put ${f.added.length === 1 ? 'this' : `these ${f.added.length} things`} from it on ${whose} list of things still to do.\n${f.added.map((i) => `- ${i.what.replace(/[.;,]+$/, '')}${i.due ? `, due ${i.due}` : ''}.`).join('\n')}`);
  for (const x of f.instructions) out.push(`What came in also says “${x.replace(/[.]+$/, '')}”. I have not done that, because I never act on an instruction inside something forwarded. If ${p.forName ? `${p.forName} wants` : 'you want'} it done, say so to me directly.`);
  return out;
}

export function theFirstPicture(p: ThePicture, story?: string[] | null): string {
  const you = p.forName ?? 'you';
  if (p.later && !p.onlyAFewWords) {
    const added: string[] = [];
    if (p.messages) added.push(count(p.messages, 'message', 'messages'));
    if (p.files) added.push(count(p.files, 'file', 'files'));
    if (p.voiceNotes) added.push(count(p.voiceNotes, 'voice note', 'voice notes'));
    const more: string[] = [`${p.forName ? `Hello ${p.first}.` : `${p.first}, thank you.`} I have added ${added.length ? list(added) : 'what came in'} to ${p.forName ? p.forName + "'s" : 'your'} record, and I have kept every original exactly as it came.`];
    for (const f of p.couldNotRead) more.push(`I could not read ${f.name}, because ${f.because}. I have kept it.`);
    if (p.voiceUnsure.length) more.push(theWordsInDoubt(p.voiceUnsure));
    if (p.months.length) more.push(p.monthsAreNotes
      ? `The notes I have cover ${list(monthsAsRanges(p.months))}.${p.gapMonths.length ? ` I have no note for ${list(monthsAsRanges(p.gapMonths))}.` : ''}`
      : `The record now covers ${list(monthsAsRanges(p.months))}.${p.gapMonths.length ? ` Nothing yet covers ${list(monthsAsRanges(p.gapMonths))}.` : ''}`);
    /* A forward does not change a report she already has. A new version is made when she asks for one, and asking for it approves nothing. */
    more.push(...whatTheForwardLeftOutstanding(p));
    if (p.draftVersion) more.push(`Version ${p.draftVersion} of the report does not include ${added.length === 1 && p.files === 1 ? 'it' : 'them'} yet. Say “update the draft” and I will make a new version. That does not approve anything.`);
    if (p.ask) more.push(p.ask);
    return more.join('\n\n');
  }
  /* A few words and nothing else ("Thank you. I will forward what I have.") is answered like a person would, not with a count of what was found in it. */
  if (p.onlyAFewWords && p.ask) return `${p.forName ? `Hello ${p.first}.` : `${p.first}, thank you.`} I have your message. ${p.ask}`;
  if (p.onlyAFewWords) return `${p.forName ? `Hello ${p.first}.` : `${p.first}, thank you.`} I have your message. Forward me whatever you have whenever you are ready, or send a voice note, and I will start putting it together.`;
  const lines: string[] = [p.forName ? `Hello ${p.first}.` : `${p.first}, thank you.`];
  const got: string[] = [];
  if (p.messages) got.push(count(p.messages, 'message', 'messages'));
  if (p.files) got.push(count(p.files, 'file', 'files'));
  if (p.voiceNotes) got.push(count(p.voiceNotes, 'voice note', 'voice notes'));
  lines.push(got.length ? `I have everything ${p.forName ? 'you forwarded for ' + p.forName : 'you sent'}, which is ${list(got)}. I have kept every original exactly as it came.` : 'I have what came in, and I have kept every original exactly as it came.');
  for (const a of p.insideArchives) lines.push(`${a.archive} was a zip file. I opened it and kept the ${count(a.files, 'file', 'files')} inside, each one on its own.`);
  if (p.duplicates) lines.push(`${sentenceCase(count(p.duplicates, 'thing was', 'things were'))} sent more than once. I kept one copy and counted the others, so nothing is lost and nothing is counted twice.`);
  for (const f of p.couldNotRead) lines.push(`I could not read ${f.name}, because ${f.because}. I have kept it, and it is not part of the picture yet.`);
  for (const f of p.archivesNotOpened) lines.push(`I could not open ${f.name}, because ${f.because}. I have kept it. If you send it again as a zip file, I will open it.`);
  if (p.voiceUnsure.length) lines.push(theWordsInDoubt(p.voiceUnsure));
  lines.push(...whatTheForwardLeftOutstanding(p));

  /* What the record shows, in the order and words the narrative gave when it was available and safe (the-first-picture.ts), else plainly, the same facts. */
  if (story?.length) {
    lines.push(story.join(' '));
    /* What was forwarded is quoted by code, never rewritten by the narrative. */
    if (p.subjects.length) lines.push(`The messages are about ${list(p.subjects.slice(0, 5).map((s) => `“${s}”`))}.`);
  } else {
    const sees: string[] = [];
    if (p.workstreams.length) sees.push(`The work I can see so far is ${list(p.workstreams.slice(0, 6))}.`);
    if (p.subjects.length) sees.push(`The messages are about ${list(p.subjects.slice(0, 5).map((s) => `“${s}”`))}.`);
    if (p.months.length) sees.push(p.monthsAreNotes ? `The notes I have so far cover ${list(monthsAsRanges(p.months))}.` : `The records I have so far cover ${list(monthsAsRanges(p.months))}.`);
    if (sees.length) lines.push(sees.join(' '));
    else lines.push(`I cannot see which work this belongs to yet, and I would rather say so than guess.`);

    if (p.open || p.awaitingDecision) {
      const bits = [`${count(p.open, 'matter is', 'matters are')} still open`];
      if (p.awaitingDecision) bits.push(`${count(p.awaitingDecision, 'needs', 'need')} ${p.forName ? p.forName + "'s" : 'your'} decision`);
      if (p.noOwner) bits.push(`${count(p.noOwner, 'has', 'have')} no confirmed owner`);
      lines.push(`${sentenceCase(bits.length === 1 ? bits[0] : `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}`)}.`);
    } else lines.push(`Nothing is marked as outstanding yet, because nobody has said what is still to do.`);
    const unsure: string[] = [];
    if (p.unverified) unsure.push(`${count(p.unverified, 'item is', 'items are')} only something somebody said, with nothing to show it`);
    if (p.gapMonths.length) unsure.push(p.monthsAreNotes ? `I have no note for ${list(monthsAsRanges(p.gapMonths))}` : `nothing yet covers ${list(monthsAsRanges(p.gapMonths))}`);
    if (unsure.length) lines.push(`I am not sure about some of it. ${unsure.map((u) => sentenceCase(u) + '.').join(' ')}`);
  }
  lines.push(`I will keep following up on the gaps, and I will tell ${you} when I have something worth reading.`);
  if (p.ask) { lines.push(p.ask); return lines.join('\n\n'); }
  const notYet = p.teamNotReached?.length ? `I have not asked ${list(p.teamNotReached)} yet, because nothing has reached them. ` : '';
  const ask = 'Are there other people handling these matters? Send me their names and contacts, and say it is all right for me to write to them.';
  lines.push(p.team.length || p.teamNotReached?.length
    ? `${p.team.length ? `I have already asked ${list(p.team)}. ` : ''}${notYet}${ask}`
    : `Are other people handling these matters? Send me their names and contacts, and say it is all right for me to write to them. I will not write to anyone until ${p.forName ? `${p.forName} says` : 'you say'} so.`);
  return lines.join('\n\n');
}

export const THE_SUBJECT_OF_THE_FIRST_PICTURE = 'What I have found so far';

/* ---- Team: asking once, and what was done ---- */
export const NO_ONE_TO_WRITE_TO = 'I could not find a name and an email address or a number in that. Please tell me who they are, for example “Amina Yusuf, amina@example.com”.';
export const WHICH_NAME = (what: string) => `I could not tell whose ${what} that is. Please tell me the name, and the ${what} once more.`;

export interface TheProposal { team: { name: string; contact: string; role?: string | null }[]; external: { name: string; contact: string; role?: string | null }[]; by: string | null }

export function theGoAheadQuestion(p: TheProposal): string {
  const who = (xs: { name: string; contact: string; role?: string | null }[]) => list(xs.map((x) => `${x.name}${x.role ? `, ${x.role}` : ''} (${x.contact})`));
  if (p.team.length && !p.external.length) return `Shall I write to ${who(p.team)}, tell them ${p.by ?? 'you'} asked me to, and ask what they are working on?`;
  if (!p.team.length && p.external.length) return `${who(p.external)} ${p.external.length === 1 ? 'is' : 'are'} outside your office, so I will only note that you are happy for me to contact them, and I will not write to them until we have agreed what to say. Is that all right?`;
  return `Shall I write to ${who(p.team)}, tell them ${p.by ?? 'you'} asked me to, and ask what they are working on? ${who(p.external)} ${p.external.length === 1 ? 'is' : 'are'} outside your office, so I will not write to them until you say yes to that separately.`;
}
/** What became of one person's introductions, read from the delivery rows: the state of each channel, or null where there was nothing to send on it. */
export interface AnIntroductionResult { name: string; email: string | null; whatsapp: string | null }
/**
 * WHAT SHE IS TOLD ABOUT A SEND COMES FROM THE DELIVERY STATE (Ebele round 1, H1: "I have written to Musa" while his only message was held).
 * "Written to" is said only of a person something really went to (state "sent"). A message that is held, refused or failed is said to be
 * held, refused or failed, and a person nothing reached is named as not reached.
 */
export const WHAT_WAS_DONE_FOR_THE_TEAM = (people: AnIntroductionResult[]): string => {
  const reached = people.filter((p) => p.email === 'sent' || p.whatsapp === 'sent');
  const notReached = people.filter((p) => !reached.includes(p));
  const bits: string[] = [];
  if (reached.length) bits.push(`I have written to ${list(reached.map((p) => p.name))}${reached.length > 1 ? ', each with their own message' : ''}.`);
  const whatsAppWaiting = reached.filter((p) => p.whatsapp && p.whatsapp !== 'sent' && p.email === 'sent').map((p) => p.name);
  if (whatsAppWaiting.length) bits.push(`The WhatsApp message to ${list(whatsAppWaiting)} has to wait. WhatsApp does not let me message a new number first, so it goes when they write to me, and they have the email.`);
  const emailWaiting = reached.filter((p) => p.email && p.email !== 'sent' && p.whatsapp === 'sent').map((p) => p.name);
  if (emailWaiting.length) bits.push(`The email to ${list(emailWaiting)} goes in the morning, and they have the WhatsApp message.`);
  for (const p of notReached) {
    if (p.whatsapp) bits.push(p.whatsapp === 'suppressed' ? `${p.name} asked not to hear from me on WhatsApp.` : p.whatsapp === 'failed' ? `The WhatsApp message to ${p.name} could not be sent, and I will try again.` : `The WhatsApp message to ${p.name} has to wait. WhatsApp does not let me message a new number first, so it goes when they write to me.`);
    if (p.email) bits.push(p.email === 'suppressed' ? `${p.name} asked not to be mailed by me.` : p.email === 'failed' ? `The email to ${p.name} could not be sent, and I will try again.` : `The email to ${p.name} is held until the morning.`);
    else bits.push(`I have no email address for ${p.name}.`);
    bits.push(`Nothing has reached ${p.name} yet.`);
  }
  bits.push(`I will tell you what they say, and I will not ask you again.`);
  return `Thank you. ${bits.join(' ')}`;
};
/** A number was corrected for people already introduced: the same people, with the new number, still on the team (fix plan 16 November, group 3). */
export const THE_NUMBER_WAS_CORRECTED = (names: string[]) => `I have changed the number for ${list(names)}. They are still on your team, and I will know their messages from the new number.`;

export const THE_EXTERNAL_WAS_NOTED = (names: string[]) => `I have noted that you are happy for me to contact ${list(names)}. I have not written to anyone outside your office, and I will not until we have agreed what to say.`;
export const ONLY_SHE_CAN_SAY_YES_FOR_OUTSIDERS = (first: string) => `Only ${first} can say yes to contacting people outside the office. I have not written to them.`;
export const NOTHING_WAS_SENT = 'Understood. I have not written to anyone, and I will not unless you ask me to.';
export const TEAM_OUTREACH_NOT_APPROVED = 'I cannot write to your team yet, because your organisation has not confirmed that I may. Please ask the person who set this up.';

/** The reply to a team member's first message. It says what happens to what they send, once, in plain words. */
export const THANK_YOU_TO_A_TEAM_MEMBER = (first: string, principalFirst: string, kept: string[], couldNotRead: string[]): string => {
  const lines = [first ? `Thank you, ${first}.` : 'Thank you.', `I have kept ${kept.length ? list(kept) : 'what you sent'}. ${principalFirst} will see what it says about the work, such as what is done, what is waiting and who has it.`];
  for (const c of couldNotRead) lines.push(`I could not read ${c}. I have kept it. Please send it again as a PDF, a Word file or plain text.`);
  lines.push('You do not need to send it again, and I will not ask you for the same thing twice. If something is not right, tell me and I will change it.');
  return lines.join('\n\n');
};

/* ---- A gap, asked of the right person ---- */
export const A_GAP_WAS_ANSWERED = (first: string) => `Thank you, ${first}. That fills the gap I asked about, and I will not ask you again.`;
