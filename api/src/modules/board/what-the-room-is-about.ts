import { PLAIN_WORDS } from '../conversation/plain-words';

/**
 * WHAT THE ROOM IS ABOUT: THE AIMS, THE PLACES AND THE THINGS, COUNTED ACROSS EVERYBODY.
 *
 * Read off a forty-person convening on Nigerian agricultural markets. The board found the two
 * biggest disagreements and named them well. It also held thirty-nine blockers, sixty-two
 * statements of what somebody was trying to achieve, and eighty-six worries, and it showed every
 * one of them as a flat list under a heading.
 *
 * Kano appeared six times, Kaduna five, Niger ten, Lagos nine. Rice seventeen times, maize twice,
 * cassava twice. All of it inside individual sentences, none of it anywhere a reader could see it.
 * The one question the convener had - where is the weight, and what is it on - was answerable from
 * the record and unanswerable from the board.
 *
 * The `objectives` block is the targets a lead SET, and on a board where nobody set one it is empty
 * and correctly so. That is a different thing from what forty people each said they were trying to
 * do. This reads the second, and does not touch the first.
 *
 * WHAT THIS IS NOT. It does not decide who is right, rank an aim above another, or turn a place
 * somebody mentioned into a priority. It groups what was said and says who said it, so the convener
 * can see the shape of the room before walking into it.
 *
 * WHY A MODEL READS IT. "Kano" is a place and "Kano State Government" is a party; "rice" is a crop
 * and "priced like rice" is a comparison. A word list gets both wrong, and this codebase has had
 * that argument enough times.
 */

export interface SaidBySomeone {
  text: string;
  who: string;
}

export interface AnAim {
  /** The aim in the group's own words, short. */
  aim: string;
  /** The names of the people holding it. */
  held: string[];
}

export interface ANamedThing {
  name: string;
  /** The names of the people who named it. */
  named: string[];
}

export interface WhatTheRoomIsAbout {
  aims: AnAim[];
  places: ANamedThing[];
  things: ANamedThing[];
}

export const WHAT_THE_ROOM_IS_ABOUT_PROMPT = `You are reading what a group of people each said they are trying to achieve, and what they said it about.

You will be given lines, each with the name of the person who said it.

Give back three things.

AIMS. Group the lines into what people are trying to achieve. Put lines that are the same aim in different words together: "get more farmers buying from us" and "grow our customer base among smallholders" are one aim. Keep aims that differ apart, even when they sound similar: "lend money and get it back" and "reach the places where hunger is worst" are two aims, not one. Write each aim as one plain, full sentence in the group's own words, and list everybody who holds it. Expect a handful of aims across a large group, not one per person.

PLACES. Every place named that somebody could point at on a map and go to: a state, a city, a local government area, a named market, a corridor. Use the name as it was said. List who named it.

Leave out the whole country everybody is already in. On a board about Nigeria, "Nigeria" is not a place somebody chose, and it sits at the top of the list crowding out the states that are the answer. The same goes for a region that means the whole room, like "West Africa" in a West African group. A place only counts when somebody is talking about working there, not when it is part of an organisation's name.

THINGS. Every crop, commodity, product or line of work named: rice, maize, poultry, fertiliser, cold storage, credit. Use the word as it was said, singular. List who named it.

Leave out anything you had to guess at. A short honest answer beats a long one with invented entries in it.

${PLAIN_WORDS}

A place name and the word for a thing are the room's own words, so they stay exactly as they were said. The rules above are about the sentences you write around them.`;

export const WHAT_THE_ROOM_IS_ABOUT_SCHEMA = {
  name: 'emit_what_the_room_is_about',
  description: 'Emit the aims people hold, the places they named and the things they named.',
  input_schema: {
    type: 'object',
    properties: {
      aims: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            aim: { type: 'string', description: 'The aim as one plain, full sentence, in their own words. It is read on its own beside the other aims, so somebody who reads only this sentence should know what the group is trying to do. Never a heading and never a fragment.' },
            held: { type: 'array', items: { type: 'string' }, description: 'Names of the people holding it.' },
          },
          required: ['aim', 'held'],
        },
      },
      places: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            named: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'named'],
        },
      },
      things: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            named: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'named'],
        },
      },
    },
    required: ['aims', 'places', 'things'],
  },
};

/** The lines, as the model is given them. */
export function theLines(said: SaidBySomeone[]): string {
  return 'WHAT PEOPLE SAID\n' + said.map((s) => `- ${s.who}: ${s.text}`).join('\n');
}

/**
 * WHAT SURVIVES THE READ.
 *
 * Only real names, only people who are actually in the ground, and biggest first so the reader sees
 * the weight without counting. A place one person mentioned in passing is kept, because on a board
 * about where to act "one person, once" is itself the answer to a question the convener has.
 */
export function onlyWhatHolds(read: Partial<WhatTheRoomIsAbout> | null, whoIsHere: Set<string>): WhatTheRoomIsAbout {
  const people = (names: unknown): string[] => {
    if (!Array.isArray(names)) return [];
    const kept: string[] = [];
    for (const n of names) {
      const name = typeof n === 'string' ? n.trim() : '';
      if (!name || !whoIsHere.has(name) || kept.includes(name)) continue;
      kept.push(name);
    }
    return kept;
  };
  const things = (rows: unknown): ANamedThing[] => {
    if (!Array.isArray(rows)) return [];
    const out: ANamedThing[] = [];
    const seen = new Set<string>();
    for (const r of rows as any[]) {
      const name = typeof r?.name === 'string' ? r.name.trim() : '';
      const named = people(r?.named);
      if (!name || !named.length || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ name, named });
    }
    return out.sort((a, b) => b.named.length - a.named.length || a.name.localeCompare(b.name));
  };
  const aims: AnAim[] = [];
  const seenAim = new Set<string>();
  for (const a of (Array.isArray(read?.aims) ? read!.aims : []) as any[]) {
    const aim = typeof a?.aim === 'string' ? a.aim.trim() : '';
    const held = people(a?.held);
    if (!aim || !held.length || seenAim.has(aim.toLowerCase())) continue;
    seenAim.add(aim.toLowerCase());
    aims.push({ aim, held });
  }
  aims.sort((a, b) => b.held.length - a.held.length || a.aim.localeCompare(b.aim));
  return { aims, places: things(read?.places), things: things(read?.things) };
}
