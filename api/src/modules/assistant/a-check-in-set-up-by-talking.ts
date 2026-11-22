/**
 * A CHECK-IN SET UP BY TALKING, ONE STEP AT A TIME (Batch S, group S6; Hafsah, 19 November 2026).
 *
 * "Set up a check-in" used to be one yes or no about the people who report to the lead on the roster, and a lead with nobody on the
 * roster was told "tell me who should be in it", which nothing then read. Now Ask asks, in turn, what they want updates on, who is in
 * it and how to reach each person, and how often they check in. Only what is still missing is asked. The whole of it is said back,
 * and it is opened only on a yes, through the same writers a check-in made on screen goes through (GroundsService.create,
 * addParticipant and addTheirWhatsAppNumber), so it is the same record.
 *
 * The person's words are read by the model where it is there (what they want updates on, the people, how often). Emails and phone
 * numbers are read by their form, because an invitation must go to exactly the address that was given. Nothing is guessed: what is
 * missing is asked for.
 */
import { saidAsAList, whichSituation } from './what-a-new-check-in-would-be';
import { theRhythmIn, type TheRhythm } from '../entry/what-they-asked-for-in-so-many-words';
import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';

export const CHECK_IN_SETUP_KIND = 'check_in_setup';

export interface APerson {
  name: string;
  email?: string;
  phone?: string;
}

export interface TheSetupSoFar {
  updatesOn?: string;
  people: APerson[];
  /** Named, with no way to reach them yet. */
  unreachable: string[];
  cadence?: TheRhythm;
  /** The people on the roster who report to this lead, offered as the people when they say yes. */
  offered: APerson[];
  /** What was asked last, so the next message is read as its answer. */
  asked: 'start' | 'updates' | 'people' | 'often' | 'confirm';
  /**
   * What she said while setting it up, each with the question it answered, kept so the check-in is read from her own words once it is
   * opened, as one set up on /start is: its kind of work, and the targets she gave (assistant.service.ts, openTheCheckInSetUpByTalking).
   */
  said?: { words: string; asked: string | null }[];
  /** The situation and the kind of work, from the one reading of her words at the say-back (whatTheReadingSets), said back and opened with. */
  scenario?: string;
  kindOfWork?: string;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /\+?\d[\d\s-]{7,16}\d/;

/** What the model may hand back, read with care: anything that is not the right shape is left out. */
export interface WhatTheModelHeard {
  updatesOn?: string;
  people?: APerson[];
  cadence?: TheRhythm;
}

export const SETUP_READING_PROMPT = `Somebody is setting up a check-in in Groundwork, by chat, and has just answered a question about it. Read only what they said.

- updatesOn: what they want updates on, in a few of their own words ("deals, payments and visits"), if they said it.
- people: each person they named for the check-in, with an email address or a phone number if they gave one. Leave out anybody they did not name.
- cadence: how often the people check in, if they said: DAILY, WEEKLY, FORTNIGHTLY or MONTHLY.

Leave out anything they did not say. Never make up a name, an address or a number.`;

export const SETUP_READING_SCHEMA = {
  name: 'the_check_in_setup',
  description: 'What the person said about the check-in they are setting up.',
  input_schema: {
    type: 'object',
    properties: {
      updatesOn: { type: 'string' },
      people: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } }, required: ['name'] } },
      cadence: { type: 'string', enum: ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] },
    },
  },
};

export function whatTheModelHeard(raw: any): WhatTheModelHeard {
  if (!raw || typeof raw !== 'object') return {};
  const out: WhatTheModelHeard = {};
  if (typeof raw.updatesOn === 'string' && raw.updatesOn.trim()) out.updatesOn = raw.updatesOn.trim().slice(0, 200);
  if (['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'].includes(raw.cadence)) out.cadence = raw.cadence;
  if (Array.isArray(raw.people)) {
    out.people = raw.people
      .filter((p: any) => p && typeof p.name === 'string' && p.name.trim())
      .map((p: any) => ({
        /* A name that is only an address is no name: the address is read below, and the person it is for is worked out from what was asked. */
        name: EMAIL.test(p.name) || PHONE.test(p.name) ? '' : p.name.trim().slice(0, 120),
        ...(EMAIL.test(`${p.email ?? ''} ${p.name}`) ? { email: EMAIL.exec(`${p.email ?? ''} ${p.name}`)![0].toLowerCase() } : {}),
        ...(PHONE.test(`${p.phone ?? ''} ${EMAIL.test(p.name) ? '' : p.name}`) ? { phone: PHONE.exec(`${p.phone ?? ''} ${EMAIL.test(p.name) ? '' : p.name}`)![0].trim() } : {}),
      }));
  }
  return out;
}

/** The people in an answer, read by the form of each address, one person to a line or between commas. Used where the model said nothing. */
export function thePeopleIn(said: string): APerson[] {
  return String(said ?? '')
    .split(/\n|;|,(?![^()]*\))|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const email = EMAIL.exec(part)?.[0]?.toLowerCase();
      const phone = PHONE.exec(part.replace(EMAIL, ''))?.[0]?.trim();
      const name = part.replace(EMAIL, '').replace(PHONE, '').replace(/[()<>:,-]+/g, ' ').replace(/\s+/g, ' ').trim();
      return { name, ...(email ? { email } : {}), ...(phone ? { phone } : {}) };
    })
    .filter((p) => p.email || p.phone || /^[A-Za-z][A-Za-z' .-]{1,60}$/.test(p.name));
}

/** A name with no address, found on the roster by the whole name or by a first name only one person has. */
export function foundOnTheRoster(name: string, roster: { displayName: string | null; email: string | null }[]): { displayName: string; email: string } | null {
  const n = name.trim().toLowerCase();
  const withAddress = roster.filter((r) => r.displayName && r.email) as { displayName: string; email: string }[];
  const whole = withAddress.filter((r) => r.displayName.toLowerCase() === n);
  if (whole.length === 1) return whole[0];
  const first = withAddress.filter((r) => r.displayName.toLowerCase().split(/\s+/)[0] === n);
  return first.length === 1 ? first[0] : null;
}

const RHYTHM_SAID: Record<TheRhythm, string> = { DAILY: 'every day', WEEKLY: 'every week', FORTNIGHTLY: 'every two weeks', MONTHLY: 'every month' };

export const ASK_WHAT_UPDATES = 'What do you want updates on? For example, "deals, payments and visits", or somebody joining, or a role changing hands.';
export const ASK_HOW_OFTEN = 'How often should they check in? Every day, every week, every two weeks, or every month?';
export const SETUP_STOPPED = 'I have stopped setting it up. Nothing was opened and nobody was invited.';

export function askWhoIsInIt(offered: APerson[]): string {
  const how = 'Give me each person’s name with an email address, and a phone number too if you want their check-ins on WhatsApp, one person to a line.';
  if (!offered.length) return `Who should be in it, and how do I reach each of them? ${how}`;
  return `Who should be in it, and how do I reach each of them? ${saidAsAList(offered.map((p) => p.name))} ${offered.length === 1 ? 'reports' : 'report'} to you, so say yes to ask ${offered.length === 1 ? 'them' : 'all of them'}. Or ${how.charAt(0).toLowerCase()}${how.slice(1)}`;
}

/** Somebody named who cannot be invited yet: no address, or a phone number with no email, because invitations go by email. */
export function askHowToReach(unreachable: string[], phoneOnly: string[]): string {
  const out: string[] = [];
  if (unreachable.length) out.push(`I do not know how to reach ${saidAsAList(unreachable)}. What is ${unreachable.length === 1 ? 'their' : 'each person’s'} email address?`);
  if (phoneOnly.length) out.push(`I need an email address for ${saidAsAList(phoneOnly)} as well, because the invitation goes by email. I will keep the phone number beside it, so their check-ins can reach them on WhatsApp.`);
  return out.join(' ');
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

export function theNameFor(updatesOn: string): string {
  return `Updates on ${inASentence(updatesOn)}`.slice(0, 120);
}

/** The situation it runs as, in the words its card says on /start (the scenario table), so both doors name a situation the same way. */
function theSituationInWords(scenario: string): string {
  const name = (THE_SCENARIO_TABLE as Record<string, { name?: string }>)[scenario]?.name ?? 'Keep a read on live work';
  return `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** The whole of it, said back before anything is opened or sent. Everybody is named, never counted. */
export function saidBack(s: TheSetupSoFar): string {
  const updatesOn = inASentence(s.updatesOn ?? '');
  const each = s.people.map((p) => `${p.name} (${[p.email, p.phone].filter(Boolean).join(', ')})`);
  const one = s.people.length === 1;
  return [
    `Here is the check-in I will open. It is called "${theNameFor(updatesOn)}", and it asks for updates on ${updatesOn}. I will run it as a check-in to ${theSituationInWords(s.scenario ?? theSituationFor(updatesOn).scenario)}.`,
    `${saidAsAList(each)} will be in it, and ${one ? 'they' : 'each of them'} will be emailed an invitation.`,
    `They will check in ${RHYTHM_SAID[s.cadence as TheRhythm]}.`,
    'Shall I open it?',
  ].join(' ');
}

/** The next question, or the say-back once nothing is missing. */
export function theNextStep(s: TheSetupSoFar): { asked: TheSetupSoFar['asked']; says: string } {
  if (!s.updatesOn) return { asked: 'updates', says: ASK_WHAT_UPDATES };
  const phoneOnly = s.people.filter((p) => !p.email && p.phone).map((p) => p.name);
  if (s.unreachable.length || phoneOnly.length) return { asked: 'people', says: askHowToReach(s.unreachable, phoneOnly) };
  if (!s.people.length) return { asked: 'people', says: askWhoIsInIt(s.offered) };
  if (!s.cadence) return { asked: 'often', says: ASK_HOW_OFTEN };
  return { asked: 'confirm', says: saidBack(s) };
}

/**
 * One answer laid over what is kept. What the model heard is read first; where it heard nothing for the question that was asked, the
 * answer itself is read: the words as what they want updates on, the addresses by their form, and the rhythm words.
 */
export function oneAnswerLaidOver(
  s: TheSetupSoFar,
  said: string,
  heard: WhatTheModelHeard,
  roster: { displayName: string | null; email: string | null }[],
  saidYes: boolean,
): TheSetupSoFar {
  const next: TheSetupSoFar = { ...s, people: [...s.people], unreachable: [...s.unreachable] };
  const updatesOn = heard.updatesOn ?? (s.asked === 'updates' ? said.trim().replace(/[.!?]+$/, '') : undefined);
  if (updatesOn && (!s.updatesOn || s.asked === 'updates')) next.updatesOn = updatesOn;

  if (s.asked === 'people' && saidYes && s.offered.length && !s.people.length) next.people = [...s.offered];
  else {
    const named = heard.people?.length ? heard.people : s.asked === 'people' ? thePeopleIn(said) : [];
    for (const given of named) {
      /* An address with no name beside it is for the person still waiting for one, or, with nobody waiting, is its own name. */
      const waiting = next.unreachable[0] ?? next.people.find((q) => !q.email)?.name;
      const p = given.name ? given : { ...given, name: waiting ?? given.email ?? given.phone ?? '' };
      if (!p.name) continue;
      const already = next.people.find((q) => q.name.toLowerCase() === p.name.toLowerCase());
      const fromRoster = !p.email ? foundOnTheRoster(p.name, roster) : null;
      const person: APerson = { name: fromRoster?.displayName ?? p.name, ...(p.email || fromRoster ? { email: p.email ?? fromRoster!.email } : {}), ...(p.phone ? { phone: p.phone } : {}) };
      if (already) Object.assign(already, { ...(person.email ? { email: person.email } : {}), ...(person.phone ? { phone: person.phone } : {}) });
      else if (person.email || person.phone) next.people.push(person);
      else if (!next.unreachable.includes(person.name)) next.unreachable.push(person.name);
      next.unreachable = next.unreachable.filter((n) => !next.people.some((q) => q.name.toLowerCase() === n.toLowerCase()));
    }
    next.unreachable = next.unreachable.filter((n) => !next.people.some((p) => p.name.toLowerCase() === n.toLowerCase()));
  }

  const cadence = heard.cadence ?? theRhythmIn(said) ?? undefined;
  if (cadence && (!s.cadence || s.asked === 'often')) next.cadence = cadence;
  return next;
}
