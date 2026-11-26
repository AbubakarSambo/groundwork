import { THE_SCENARIO_TABLE } from '../conversation/the-scenario-table';

/**
 * WHAT SETUP KNOWS: ONE READING, BUILT ON THE SERVER EACH TURN (fix plan, release batch 1, group 5; Hafsah, 4 November 2026).
 *
 * Every lead in round 39 named the same thing first: setup asks the same questions again and again. The cause was that setup had no one
 * reading of what it knew. The model got the transcript and a block built from whatever the screen chose to send back; the summary panel
 * kept its own copy, merged on the client field by field; and word matchers tried to catch the repeats after the reply was written.
 *
 * Now there is one reading. Each turn the server merges what it knew before this turn with what this turn's reading of the conversation
 * found (`whatSetupKnowsNow`) and sends the whole of it back. The panel shows it as it is, the screen hands it back with the next message,
 * and the model gets it as "known, don't ask" (`knownDontAsk`). The reply and the reading still run side by side, so the model's block is
 * the reading as of the lead's previous message; the transcript underneath it carries the one message since.
 */

/** The one reading of a setup conversation. Every field is something the lead said, or picked on the screen. */
export interface WhatSetupKnows {
  mode?: string;
  /** They said in words that there is no target. See a-check-in-with-no-aim-has-nothing-to-read-against. */
  noAimAndTheySaidSo?: boolean;
  initial?: string;
  whoInvolved?: string;
  peopleNamed?: string[];
  /** Each person's email, by the name on the list, exactly as typed. */
  peopleEmails?: Record<string, string>;
  /** Each person's phone number, by the name on the list, exactly as typed. */
  peoplePhones?: Record<string, string>;
  /** What each person does, by the name on the list, in the lead's words. */
  peopleRoles?: Record<string, string>;
  decision?: string;
  goals?: string[];
  brief?: string;
  cadence?: string;
  cadenceDays?: number[];
  timelineDays?: number;
  /** The day the whole period ends, YYYY-MM-DD, where they named when it ends ("by March"). */
  endsOn?: string;
  /** They said it runs until they end it (request 37). */
  runsUntilEnded?: boolean;
  yourRole?: string;
  /** The name they gave in so many words ("Call it ..."). */
  name?: string;
  /** The kind of check-in, read once from what they first said (or the card they picked). */
  classifiedScenario?: string;
  /** The kind's name, from the one owner of situation names (the scenario table). */
  kindName?: string;
  /** The kind of work, from the same reading as the situation (which-situation-this-is.ts), and the one the check-in is saved with. */
  kindOfWork?: string;
}

/** The old name, kept for the anchor's own reading, which shares the shape. */
export type WhatSetupHasSoFar = WhatSetupKnows;

function itIsThere(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

const digits = (s: string) => String(s ?? '').replace(/\D/g, '');
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** By-name details, for people still on the list. A number already known whole is never replaced by part of itself. */
function byName(before: Record<string, string> | undefined, now: Record<string, string> | undefined, people: string[], isPhone = false): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const person of people) {
    const old = Object.entries(before ?? {}).find(([n]) => sameName(n, person))?.[1];
    const fresh = Object.entries(now ?? {}).find(([n]) => sameName(n, person))?.[1];
    const kept = isPhone && old && fresh && digits(old).includes(digits(fresh)) ? old : (fresh ?? old);
    if (kept && String(kept).trim()) out[person] = String(kept).trim();
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * The reading after this turn: what this turn read wins where it found something, and what was known before stays where it did not.
 * The reading of the conversation reads the whole transcript each turn, so its list of people is the whole list.
 */
export function whatSetupKnowsNow(before: WhatSetupKnows | null | undefined, read: Partial<WhatSetupKnows> | null | undefined): WhatSetupKnows {
  const was = before ?? {};
  const now = read ?? {};
  const out: WhatSetupKnows = {};
  const scalars: (keyof WhatSetupKnows)[] = [
    'mode', 'noAimAndTheySaidSo', 'initial', 'whoInvolved', 'decision', 'goals', 'brief', 'cadence', 'cadenceDays', 'timelineDays', 'endsOn',
    'runsUntilEnded', 'yourRole', 'name',
  ];
  for (const key of scalars) {
    const value = itIsThere(now[key]) ? now[key] : was[key];
    if (itIsThere(value)) (out as any)[key] = value;
  }
  const people = itIsThere(now.peopleNamed) ? now.peopleNamed! : (was.peopleNamed ?? []);
  if (people.length) {
    out.peopleNamed = people;
    const emails = byName(was.peopleEmails, now.peopleEmails, people);
    const phones = byName(was.peoplePhones, now.peoplePhones, people, true);
    const roles = byName(was.peopleRoles, now.peopleRoles, people);
    if (emails) out.peopleEmails = emails;
    if (phones) out.peoplePhones = phones;
    if (roles) out.peopleRoles = roles;
  }
  /* The kind is read once and then stays; "It's something else" is the lead clearing it. */
  /* The kind of work is read with the situation, and once read it stays, as the situation does. */
  const work = was.kindOfWork || now.kindOfWork;
  if (work) out.kindOfWork = work;
  const kind = was.classifiedScenario || now.classifiedScenario;
  if (kind) {
    out.classifiedScenario = kind;
    const name = (THE_SCENARIO_TABLE as Record<string, { name: string } | undefined>)[kind]?.name;
    if (name) out.kindName = name;
  }
  return out;
}

/** Each thing setup can know, in the words the model reads it under, in the order a person would give them. */
const WHAT_EACH_ONE_IS: { key: keyof WhatSetupKnows; said: string }[] = [
  { key: 'initial', said: 'What this is about' },
  { key: 'kindName', said: 'The kind of check-in' },
  { key: 'yourRole', said: 'Their own part in it' },
  { key: 'whoInvolved', said: 'Who else is in it' },
  { key: 'decision', said: 'What makes now the right time' },
  { key: 'goals', said: 'What they want out of it' },
  { key: 'cadence', said: 'How often they check in' },
  { key: 'timelineDays', said: 'How long it runs, in days' },
  { key: 'endsOn', said: 'The day it ends' },
  { key: 'runsUntilEnded', said: 'It runs until they end it, with no set length' },
  { key: 'brief', said: 'What they want the questions to focus on' },
  { key: 'name', said: 'What they called it' },
];

/**
 * What setup exists to get. Anything else is welcome and none of it is chased. Why now is not on it: it is asked once and kept when given
 * (round 2, 31 October 2026), and listing it as missing had the model ask again whenever the reading took the answer for a restatement.
 */
const WHAT_SETUP_IS_FOR: (keyof WhatSetupKnows)[] = ['initial', 'whoInvolved', 'goals'];

function asWords(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : value === true ? 'yes' : String(value);
}

/** One person, with everything the lead gave for them, whole: "Mugisha Okello, mugisha@startup.test, +256-772-332372, runs sales". */
function onePerson(name: string, k: WhatSetupKnows): string {
  const find = (m?: Record<string, string>) => Object.entries(m ?? {}).find(([n]) => sameName(n, name))?.[1];
  return [name, find(k.peopleEmails), find(k.peoplePhones), find(k.peopleRoles)].filter(Boolean).join(', ');
}

/**
 * WHAT SAVING THIS MAKES, AND WHO "YOU" IS (Ebele's Halden office, 23 November 2026). Setup told her "You have set up four collections ...
 * from January until now, and then weekly from 2027", and saved one weekly check-in. And "follow up with him yourself, not through me" was
 * said back, in four setups, as "you will follow up with him directly". Both are facts about the product, not judgements, so they are told
 * to the model here, the one block every setup turn reads, rather than matched in its words afterwards.
 */
export const WHAT_SAVING_THIS_MAKES = [
  'WHAT SAVING THIS MAKES. One setup makes one check-in, with the people listed, on the schedule in the panel. It opens on its start day or later and never collects from a past date by itself: to gather what already happened, the people are asked for it in that check-in.',
  'If they want several check-ins (one for each team, area or period), say plainly that this conversation sets up the first one, and that each of the others is set up the same way with Start a check-in once this one is saved. Never say more than one check-in is set up, never promise to group, sort or split the answers, and never say back anything the panel does not hold.',
  'WHO IS WHO. Above, "Groundwork" is you, the one writing, and "the lead" is the person you are talking to: say "I" for Groundwork and "you" for the lead, so "Groundwork follows up, not the lead" is said "I will follow up, not you".',
  'WHO "YOU" IS. In what they write, "you", "yourself" and "Groundwork" mean Groundwork, and "I" and "me" mean them. Say back what they asked Groundwork to do as yours ("I will follow up with them about anything missing"), never as theirs.',
];

/**
 * The block the model reads above the transcript: everything setup knows, and what it has not read from their words yet. Empty on the
 * first turn, when there is nothing known and a heading saying so would be noise.
 */
export function knownDontAsk(soFar?: WhatSetupKnows | null): string {
  if (!soFar) return '';
  /* Read through the same merge, so a reading handed back without the kind's name still names it. */
  const known = whatSetupKnowsNow(soFar, null);
  const settled = WHAT_EACH_ONE_IS.filter((f) => itIsThere(known[f.key]));
  const people = known.peopleNamed ?? [];
  if (!settled.length && !people.length) return '';

  const lines = [
    'WHAT SETUP KNOWS, FROM WHAT THEY HAVE SAID. This is known: do not ask for any of it again, in any words.',
    'Build the next question on it, and use the specific thing they said.',
    '',
    ...settled.map((f) => `- ${f.said}: ${asWords(known[f.key])}`),
    ...(people.length ? ['- The team, as they gave it:', ...people.map((p) => `  - ${onePerson(p, known)}`)] : []),
  ];
  if (known.noAimAndTheySaidSo) lines.push('- They have said there is no target to work to. Do not ask for one again.');
  lines.push('', ...WHAT_SAVING_THIS_MAKES);

  /* The team they named answers who else is in it. */
  const missing = WHAT_SETUP_IS_FOR.filter((k) => !itIsThere(known[k]) && !(k === 'whoInvolved' && people.length))
    .map((k) => WHAT_EACH_ONE_IS.find((f) => f.key === k)!.said);
  if (missing.length) {
    /* Not read yet is not the same as not answered (round 5, 1 November 2026): the reading runs a turn behind and keeps only what it is sure of. */
    lines.push(
      '',
      `NOT READ FROM THEIR WORDS YET: ${missing.join('; ')}.`,
      'Read the conversation before you ask for any of these. If they have already answered one, in any words, or said they do not know,',
      'or said it does not apply, it is answered. Ask for one only when nothing they have said answers it.',
    );
  } else {
    lines.push('', 'NOTHING IS MISSING. Setup has what it needs, so offer to wrap up in your own words (HOW SETUP ENDS, below).');
  }
  return lines.join('\n');
}
