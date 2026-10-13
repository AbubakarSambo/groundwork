import { GroundScenario } from '@prisma/client';

/**
 * NO INTERNAL NAME REACHES A PERSON (night quality run 2, Naomi's walk, 12 October 2026).
 *
 * Naomi Wekesa typed "I run Ridge Bakery in Eldoret" and the first reply said "I'm here to help you
 * get this new project, NEW_PROJECT, off to a good start". The entry chat had no name for the check-in
 * yet, so it sent the situation's key in the name's place, and the prompt said `It is called
 * "NEW_PROJECT".` The model read the key back to her as though it were a name.
 *
 * A key is the code's name for a thing. A person never reads one: not in a reply, a screen, an email
 * or a WhatsApp message. This file holds the one test of what a key looks like, used where a name is
 * passed into a prompt and, last of all, on everything served or sent.
 */

/** ALL_CAPS_WITH_UNDERSCORES: NEW_PROJECT, OKR_ALIGNMENT, IN_PROGRESS. One word in capitals is left alone ("OKR", "PIP" said by a person). */
const A_KEY = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

/** The names the product makes up when nobody has given one, which are not names either. */
const MADE_UP_NAMES = new Set(['entry session', 'my first ground']);

/** Whether this would be read as a name but is really the code's own name for something. */
export function isAnInternalName(name?: string | null): boolean {
  const n = (name ?? '').trim();
  if (!n) return false;
  if (A_KEY.test(n)) return true;
  if ((Object.values(GroundScenario) as string[]).includes(n)) return true;
  return MADE_UP_NAMES.has(n.toLowerCase());
}

/** A check-in's name for a prompt: what the lead called it, or nothing at all, never a key or a made-up name. */
export function aNameAPersonGave(name?: string | null): string | null {
  const n = (name ?? '').trim();
  return n && !isAnInternalName(n) ? n : null;
}

/*
 * THE LAST-LINE CHECK, ON EVERYTHING SERVED OR SENT: API responses' prose, emails, WhatsApp replies and the
 * model's saved turns. Whatever an earlier fix missed, a key or a template placeholder is caught here.
 * A person's own words, anything inside quotation marks, are never touched.
 */

/** A key in running text. */
const A_KEY_IN_TEXT = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
/** Template placeholders: {{2}}, ${name}, <name>, [NAME], TODO, and the names Groundwork makes up. */
const PLACEHOLDERS: RegExp[] = [
  /\{\{\s*[\w.]*\s*\}\}/g,
  /\$\{[^}\n]*\}/g,
  /<(?:name|first[ _]name|last[ _]name|full[ _]name|org|organisation|organization|company|person|lead|team|email)>/gi,
  /\[(?:NAME|FIRST NAME|FIRST_NAME|LAST NAME|ORG|ORGANISATION|ORGANIZATION|COMPANY|PERSON|LEAD|TEAM|EMAIL|PLACEHOLDER)\]/g,
  /\bTODO\b:?/g,
  /\bEntry session\b/g,
  /\bMy first ground\b/g,
];

/** Plain words for keys whose meaning the code knows; a situation's comes from situationInWords. */
const PLAIN: Record<string, string> = {
  IN_PROGRESS: 'in progress',
  NOT_STARTED: 'not started',
  ON_TRACK: 'on track',
  OFF_TRACK: 'off track',
  ONE_TIME: 'one time',
};

let situationWords: ((s: GroundScenario | null) => string | null) | null = null;
function plainWordsFor(key: string): string | null {
  if (PLAIN[key]) return PLAIN[key];
  if ((Object.values(GroundScenario) as string[]).includes(key)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    situationWords ??= require('../modules/conversation/setup-already-asked-this').situationInWords;
    return situationWords!(key as GroundScenario);
  }
  return null;
}

/** What a person would read here instead, and the tokens taken out. Quoted words are left exactly as they are. */
export function withoutInternalNames(text: string): { text: string; caught: string[] } {
  if (typeof text !== 'string' || !text) return { text, caught: [] };
  const caught: string[] = [];
  /* Split on quotations: odd pieces are somebody's own words and pass through untouched. */
  const pieces = text.split(/("[^"\n]*"|“[^”\n]*”)/);
  const out = pieces.map((piece, i) => {
    if (i % 2 === 1) return piece;
    let p = piece;
    for (const re of PLACEHOLDERS) {
      p = p.replace(re, (m) => { caught.push(m); return ''; });
    }
    /* Set off by commas ("this new project, NEW_PROJECT, off"): the key and its commas go. */
    p = p.replace(/,\s*\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b\s*,/g, (_m, k) => { caught.push(k); return ''; });
    p = p.replace(A_KEY_IN_TEXT, (k) => { caught.push(k); return plainWordsFor(k) ?? ''; });
    return p;
  });
  if (!caught.length) return { text, caught };
  const tidied = out.join('')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/\( *\)/g, '')
    .replace(/,\s*,/g, ',');
  return { text: tidied, caught };
}

/** The same, with what was caught written to the log, where it was caught. */
export function aPersonNeverReadsAnInternalName(text: string, where: string, log?: { warn: (m: string) => void }): string {
  const { text: clean, caught } = withoutInternalNames(text);
  if (caught.length) (log ?? console).warn(`An internal name was about to reach a person (${where}): ${[...new Set(caught)].join(', ')}. It was taken out.`);
  return clean;
}
