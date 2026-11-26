/**
 * A CHECK-IN SET UP BY TALKING, LED BY THE MODEL (Hafsah, 24 November 2026, after a set-up on her own WhatsApp failed).
 *
 * It was a form: it asked what she wanted updates on, then who, then how often, and read one answer at a time into slots, with fixed
 * sentences doing the talking. "I want updates from Abubakar on specifics on the Ai project" lost both the topic and Abubakar, "He is under
 * my team" was read as a person's name, and "Can I setup a checkin from here" started it all again. Now, on every turn, the model reads the
 * whole set-up conversation, the organisation's people and what has been gathered, and writes the next reply in its own words. It finds
 * people by what she means ("Abubakar", "my team") and asks only for what is still missing.
 *
 * Fixed rules stay only where something is opened or sent (fix rule 4). An address is taken only from the roster or from her own words,
 * read by its form, never from the model alone. Once nothing is missing, the whole check-in is said back in the product's words, naming
 * everybody with how they will be reached, and it is opened only on her plain yes, through the same writers a check-in made on screen
 * goes through (assistant.service.ts, openTheCheckInSetUpByTalking).
 */
import { saidAsAList, whichSituation } from './what-a-new-check-in-would-be';
import { type TheRhythm } from '../entry/what-they-asked-for-in-so-many-words';
import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';

export const CHECK_IN_SETUP_KIND = 'check_in_setup';

export interface APerson {
  name: string;
  email?: string;
  phone?: string;
  /** Their roster id, when they are on the roster. */
  id?: string;
}

export interface TheSetupSoFar {
  updatesOn?: string;
  /** What the check-in is for, in plain sentences made from her words, as the people in it will read it. */
  brief?: string;
  people: APerson[];
  cadence?: TheRhythm;
  /** 'confirm' once the whole of it has been said back, so a plain yes opens it. */
  asked: 'talking' | 'confirm';
  /**
   * The conversation so far: each thing she said, with what Groundwork had said just before it. The model reads it on every turn, and the
   * check-in is read from her words once it is opened, as one set up on /start is (openTheCheckInSetUpByTalking).
   */
  said: { words: string; asked: string | null }[];
  /** The situation and the kind of work, from the one reading of her words at the say-back, said back and opened with. */
  scenario?: string;
  kindOfWork?: string;
}

/** Somebody on the organisation's roster, as the set-up reads them. */
export interface OnTheRosterForSetUp {
  externalId: string;
  displayName: string | null;
  email: string | null;
  phone?: string | null;
  title?: string | null;
  department?: string | null;
  managerExternalId?: string | null;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s-]{7,16}\d/g;
const digits = (s: string) => s.replace(/\D/g, '');

export const CHECK_IN_SETUP_PROMPT_KEY = 'assistant.check-in-set-up-by-talking';

export const CHECK_IN_SETUP_PROMPT = `You are Groundwork, helping somebody set up a check-in by chat, on WhatsApp or in the app. A check-in is a regular conversation Groundwork has with each person in it to get their updates. To open one, Groundwork needs three things: what they want updates on; who is in it, each person with an email address, because the invitation goes by email, and a phone number as well if they want that person's check-ins on WhatsApp; and how often people check in, every day, every week, every two weeks or every month.

You get the organisation's people, what the set-up has gathered so far, the conversation so far and their new message. Read the whole conversation, not only the last message, and work out what they mean. One message can say several things at once: "updates from Abubakar on the AI project, he's on my team" gives you what it is about and who is in it.

Give back:
- updatesOn: what they want updates on, in a few of their own words, as it reads after "Updates on", for example "the AI project" or "deals, payments and visits". A topic is enough: never ask them to be more specific about it. Leave it out if they have not said.
- brief: what the check-in is for, in one or two plain sentences made from what they said, written for the people in it to read, in full sentences with no colons, for example "Each week you tell me how deals, payments and visits went, and what is stuck." Leave out anything rude or private. Write it from what they have said; never ask them for more to write it with.
- people: everybody who should be in it so far, the whole list, keeping the people already gathered unless they take somebody out. For somebody on the list of people, give their id. A first name means the person on the list with that first name. Put the whole team in, the people marked as reporting to them, only when they ask for the whole team; "I want updates from my team" said before they name anybody is a general wish, and once they name people, it is those people. "He is under my team" says where he is; it adds nobody. For somebody who is not on the list, give the name they used, and an email address or a phone number only if they typed it. Never make up a name, an address or a number. A sentence is never a name: "He is under my team" tells you where to look for him, it is not a person.
- cadence: how often, if they said: DAILY, WEEKLY, FORTNIGHTLY or MONTHLY.
- stops: true only when they ask to stop or cancel setting it up. Being unsure is not stopping: say in a sentence or two what they can change (what it is about, who is in it, how often), that nothing opens until they say yes, and ask whether to open it.
- somethingElse: true only when the message is plainly about something else, not this set-up, for example "how is Kito doing?". Asking whether they can set it up here, asking how it works, being annoyed, or correcting you is about this set-up.
- reply: what Groundwork says to them next.

How to write the reply:
- Plain, short, direct sentences, the way a capable colleague talks. No lists, no headings, no colons, no emoji. Use people's names, and call the person you are talking to "you".
- Answer what they asked first. If they ask whether they can set it up here, say yes, right here, and carry on from what you already have. Never start again.
- Say briefly what you understood, then ask only about what is listed under "Still missing", after you have taken in their new message. Ask nothing else: never ask what about the topic they want, never ask for more detail, and never ask whether anybody else should be in it. The people you name in your reply are exactly the people in your list.
- When you looked for somebody on the list and could not find them, say who you looked for, and ask who they mean or for their email address. When more than one person fits, name them and ask which. When somebody has no email address on file, say so and ask for it.
- If they are annoyed, acknowledge it in a few words, without repeating what they said, and get on with it.
- Never repeat their words back as if they were somebody's name.
- Never say the check-in is open or that anybody is invited. When nothing is missing, Groundwork says the whole check-in back instead of your reply, and asks for their yes. So while anything is still missing, never say "here is the check-in" or that you will open it once they say yes: ask for what is missing.`;

export const CHECK_IN_SETUP_SCHEMA = {
  name: 'the_check_in_set_up',
  description: 'What the check-in being set up holds now, and what Groundwork says next.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'What Groundwork says next, in plain sentences.' },
      updatesOn: { type: 'string' },
      brief: { type: 'string', description: 'What the check-in is for, in one or two plain sentences, for the people in it to read.' },
      people: {
        type: 'array',
        items: { type: 'object', properties: { id: { type: 'string', description: 'Their id on the list of people, if they are on it.' }, name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } }, required: ['name'] },
      },
      cadence: { type: 'string', enum: ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] },
      stops: { type: 'boolean' },
      somethingElse: { type: 'boolean' },
    },
    required: ['reply'],
  },
};

const RHYTHM_SAID: Record<TheRhythm, string> = { DAILY: 'every day', WEEKLY: 'every week', FORTNIGHTLY: 'every two weeks', MONTHLY: 'every month' };

export const SETUP_STOPPED = 'I have stopped setting it up. Nothing was opened and nobody was invited.';

/** What is still needed before it can be said back, in words. The model is told it, and it is said when the model cannot be reached. */
export function whatIsStillMissing(s: TheSetupSoFar): string[] {
  const out: string[] = [];
  if (!s.updatesOn) out.push('what you want updates on');
  if (!s.people.length) out.push('who should be in it');
  const noEmail = s.people.filter((p) => !p.email).map((p) => p.name);
  if (noEmail.length) out.push(`an email address for ${saidAsAList(noEmail)}`);
  if (!s.cadence) out.push('how often they should check in');
  return out;
}

/** Said only when the model cannot be reached: what is still needed, so nothing is guessed. */
export function whatToSayWithNoModel(s: TheSetupSoFar): string {
  return `To open it, I still need to know ${saidAsAList(whatIsStillMissing(s))}.`;
}

/** What the model is given on each turn: the people, what is gathered, what is missing, the conversation so far and the new message. */
export function theTurnForTheModel(s: TheSetupSoFar, roster: OnTheRosterForSetUp[], me: string, message: string): string {
  const nameOf = (id: string | null | undefined) => roster.find((r) => r.externalId === id)?.displayName ?? null;
  const people = roster
    .filter((r) => r.displayName)
    .slice(0, 300)
    .map((r) => {
      const about = [r.title, r.department].filter(Boolean).join(', ');
      const reports = r.managerExternalId === me ? 'reports to you' : nameOf(r.managerExternalId) ? `reports to ${nameOf(r.managerExternalId)}` : '';
      const reach = [r.email ? 'has an email address' : 'has no email address', r.phone ? 'has a phone number' : ''].filter(Boolean).join(', ');
      return `- id ${r.externalId}: ${r.displayName}${r.externalId === me ? ' (this is the person setting it up)' : ''}${about ? `, ${about}` : ''}${reports ? `, ${reports}` : ''}, ${reach}`;
    });
  const gathered = [
    `What they want updates on: ${s.updatesOn ?? 'not said yet'}`,
    `People: ${s.people.length ? s.people.map((p) => `${p.name}${p.id ? ` (id ${p.id})` : ''}, ${p.email ? 'email known' : 'no email yet'}${p.phone ? ', phone known' : ''}`).join('; ') : 'nobody yet'}`,
    `How often: ${s.cadence ? RHYTHM_SAID[s.cadence] : 'not said yet'}`,
  ];
  const missing = whatIsStillMissing(s);
  const before = s.said.flatMap((t) => [...(t.asked ? [`Groundwork: ${t.asked}`] : []), `Them: ${t.words}`]);
  return [
    'The organisation\'s people:', people.length ? people.join('\n') : 'Nobody is on the list yet.',
    '', 'What the set-up has so far:', ...gathered.map((g) => `- ${g}`),
    `Still missing: ${missing.length ? missing.join('; ') : 'nothing'}`,
    '', 'The conversation so far:', before.length ? before.join('\n') : 'Nothing yet.',
    '', `Their new message: ${message.trim() ? message.slice(0, 2000) : '(they asked Groundwork to set one up for them)'}`,
  ].join('\n');
}

export interface TheModelsTurn {
  reply: string;
  stops: boolean;
  somethingElse: boolean;
  /** What the set-up holds now. */
  so: TheSetupSoFar;
}

/**
 * The model's turn, laid over what is kept. Its words are its own, but every address is checked: somebody on the roster is reached at the
 * roster's address unless she typed another, and anybody else only at an address she typed. Nothing the model makes up reaches anybody.
 */
export function theModelsTurn(raw: any, s: TheSetupSoFar, roster: OnTheRosterForSetUp[], me: string, message: string): TheModelsTurn | null {
  if (!raw || typeof raw !== 'object' || typeof raw.reply !== 'string') return null;
  const herWords = [...s.said.map((t) => t.words), message].join('\n');
  const emailsShe = new Set((herWords.match(EMAIL) ?? []).map((e) => e.toLowerCase()));
  const phonesShe = (herWords.match(PHONE) ?? []).map((p) => p.trim());
  const theEmail = (said: unknown) => (typeof said === 'string' && emailsShe.has(said.trim().toLowerCase()) ? said.trim().toLowerCase() : undefined);
  const thePhone = (said: unknown) => (typeof said === 'string' && digits(said).length >= 9 ? phonesShe.find((p) => digits(p) === digits(said)) : undefined);

  const so: TheSetupSoFar = { ...s, people: [...s.people] };
  if (typeof raw.updatesOn === 'string' && raw.updatesOn.trim()) so.updatesOn = raw.updatesOn.trim().replace(/[.!?]+$/, '').slice(0, 200);
  if (typeof raw.brief === 'string' && raw.brief.trim()) so.brief = raw.brief.trim().slice(0, 600);
  if (['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'].includes(raw.cadence)) so.cadence = raw.cadence;
  if (Array.isArray(raw.people)) {
    const people: APerson[] = [];
    for (const p of raw.people) {
      if (!p || typeof p.name !== 'string' || !p.name.trim()) continue;
      /* By the id the model gives, or else by the name exactly as the roster writes it, when only one person has it: the model put Wairimu's
         whole team in by name with no ids, and each was asked for an email address the roster already holds (local run, 27 November 2026). */
      const byName = roster.filter((r) => r.externalId !== me && r.displayName && r.displayName.trim().toLowerCase() === p.name.trim().toLowerCase());
      const onRoster = (typeof p.id === 'string' ? roster.find((r) => r.externalId === p.id && r.externalId !== me && r.displayName) : undefined)
        ?? (byName.length === 1 ? byName[0] : undefined);
      const email = theEmail(p.email) ?? onRoster?.email?.toLowerCase() ?? undefined;
      const phone = thePhone(p.phone);
      const name = onRoster?.displayName ?? p.name.trim().slice(0, 120);
      if (people.some((q) => (onRoster && q.id === onRoster.externalId) || q.name.toLowerCase() === name.toLowerCase())) continue;
      people.push({ name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(onRoster ? { id: onRoster.externalId } : {}) });
    }
    so.people = people;
  }
  return { reply: raw.reply.trim(), stops: raw.stops === true, somethingElse: raw.somethingElse === true, so };
}

/** The situation the check-in is, from what they want updates on: a regular read unless the words plainly name another one. */
export function theSituationFor(updatesOn: string): { scenario: string; says: string } {
  const read = whichSituation(updatesOn);
  return read && !('ambiguous' in read) ? read : { scenario: 'PULSE_CHECK', says: 'a regular read on live work' };
}

/** What they want updates on, as it reads inside a sentence: a capital that only starts their answer is dropped, a name or an acronym is kept. */
function inASentence(updatesOn: string): string {
  const t = updatesOn.trim().replace(/[.!?]+$/, '');
  return /^[A-Z][a-z]/.test(t) && !/^[A-Z][a-z]+\s+[A-Z]/.test(t) ? `${t.charAt(0).toLowerCase()}${t.slice(1)}` : t;
}

/** The check-in's name, from her own words, never a template's. */
export function theNameFor(updatesOn: string): string {
  return `Updates on ${inASentence(updatesOn)}`.slice(0, 120);
}

/** The situation it runs as, in the words its card says on /start (the scenario table), so both doors name a situation the same way. */
function theSituationInWords(scenario: string): string {
  const name = (THE_SCENARIO_TABLE as Record<string, { name?: string }>)[scenario]?.name ?? 'Keep a read on live work';
  return `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** What the check-in is for, as the people in it read it: the model's sentences from her words, or what she wants updates on. */
export function theBriefOf(s: TheSetupSoFar): string {
  return s.brief ?? `You check in ${s.cadence ? RHYTHM_SAID[s.cadence] : 'regularly'} with your updates on ${inASentence(s.updatesOn ?? '')}.`;
}

/** Nothing is missing, so it can be said back. */
export function readyToSayBack(s: TheSetupSoFar): boolean {
  return whatIsStillMissing(s).length === 0;
}

/** The whole of it, said back before anything is opened or sent. Everybody is named with how they will be reached, never counted. */
export function saidBack(s: TheSetupSoFar): string {
  const updatesOn = inASentence(s.updatesOn ?? '');
  const each = s.people.map((p) => `${p.name} (${[p.email, p.phone].filter(Boolean).join(', ')})`);
  const one = s.people.length === 1;
  return [
    `Here is the check-in I will open. It is called "${theNameFor(updatesOn)}", and it asks for updates on ${updatesOn}. I will run it as a check-in to ${theSituationInWords(s.scenario ?? theSituationFor(updatesOn).scenario)}.`,
    `${saidAsAList(each)} will be in it, and ${one ? 'they' : 'each of them'} will be emailed an invitation.`,
    `${one ? 'They' : 'Each of them'} will read what it is for in these words, "${theBriefOf(s)}"`,
    `They will check in ${RHYTHM_SAID[s.cadence as TheRhythm]}.`,
    'Shall I open it?',
  ].join(' ');
}
