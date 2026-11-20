/**
 * THE OTHER SIX SUITES, SWITCHED ON OR OFF BY TALKING (chat is king, step 5).
 *
 * Onboarding, when someone leaves, the role map, to-dos, customers and equipment have no rules a conversation could shape beyond who looks
 * after what, so asking for them is small: say which, answer the one or two questions it needs (who, by name), hear it said back, and say
 * yes. The write is the Suites page's own, `SuitesService.switch`, which checks again that the person may, and keeps the change in the
 * rules history as theirs. Nobody but whoever may set the suite up is asked anything.
 */
import { suiteOf, type Question, type Suite } from '../suites/the-ten-suites';

export const SUITE_SWITCH_ASK_KIND = 'suite_switch_ask';
export const SUITE_SWITCH_KIND = 'suite_switch';

export type SwitchableSuite = 'onboard' | 'leaving' | 'roles' | 'todos' | 'customers' | 'equipment';

/** The words each is called in, and how it is said in a sentence. */
const WORDS: Record<SwitchableSuite, { says: string; words: string }> = {
  onboard: { says: 'onboarding', words: String.raw`onboarding` },
  leaving: { says: 'the process for when someone leaves', words: String.raw`(?:when\s+someone\s+leaves|leaving|leavers?|offboarding|exits?)` },
  roles: { says: 'the role map', words: String.raw`(?:the\s+)?role\s+map` },
  todos: { says: 'to-dos', words: String.raw`to-?dos?` },
  customers: { says: 'customers and deals', words: String.raw`customers(?:\s+and\s+deals)?` },
  equipment: { says: 'equipment', words: String.raw`equipment` },
};
const KEYS = Object.keys(WORDS) as SwitchableSuite[];

const NEUTRAL = String.raw`(?:\s+(?:our|the|a|an|my|company|company'?s|whole|new|process|suite|for\s+(?:us|everyone|the\s+company)))*`;
const patternFor = (k: SwitchableSuite, verb: string) => new RegExp(String.raw`^\s*(?:please\s+|can\s+you\s+)?${verb}${NEUTRAL}\s+${WORDS[k].words}${NEUTRAL}\s*(?:suite|process|please)?\s*[.!?]*\s*$`, 'i');
const ON = String.raw`(?:switch\s+on|turn\s+on|set\s*up|start|enable|put\s+in\s+place)`;
const OFF = String.raw`(?:switch\s+off|turn\s+off|stop|disable)`;

/** The patterns the router reads, one for each suite and direction. A check-in, an objective or a person never reads as one. */
export const SWITCH_A_SUITE_PATTERNS: RegExp[] = KEYS.flatMap((k) => [patternFor(k, ON), patternFor(k, OFF)]);

/** Which suite and which way, or null. */
export function readTheSwitch(message: string): { suite: SwitchableSuite; on: boolean } | null {
  const t = (message ?? '').trim();
  if (!t || /\bcheck[\s-]?ins?\b|\bsessions?\b|\bobjectives?\b|\bgoals?\b|\btargets?\b/i.test(t)) return null;
  for (const k of KEYS) {
    if (patternFor(k, ON).test(t)) return { suite: k, on: true };
    if (patternFor(k, OFF).test(t)) return { suite: k, on: false };
  }
  return null;
}

export const thisSuiteSays = (k: SwitchableSuite) => WORDS[k].says;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const ONLY_WHO_MAY_SWITCH = (k: SwitchableSuite) => `Only an admin switches ${WORDS[k].says} on or off. Ask an admin in your organisation, and they can ask me. Nothing has changed.`;

export interface APersonToName { id: string; name: string }

/** The question to ask next, or null when every one is answered. Only the suite's own questions, and only the ones that are about a person. */
export function theNextQuestion(suite: Suite, answers: Record<string, unknown>): Question | null {
  return suite.questions.find((q) => answers[q.id] === undefined) ?? null;
}

/** Whom the words name: one person, nobody, or several (then the candidates). A full name first, then a first name. */
export function thePersonNamed(typed: string, people: APersonToName[]): { id: string; name: string } | { several: string[] } | null {
  const t = typed.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ');
  const exact = people.filter((p) => t.includes(p.name.toLowerCase()));
  if (exact.length === 1) return exact[0];
  const by = (re: (p: APersonToName) => string) => people.filter((p) => new RegExp(String.raw`\b${re(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(t));
  const first = by((p) => p.name.split(/\s+/)[0]);
  if (first.length === 1) return first[0];
  const pool = exact.length > 1 ? exact : first;
  return pool.length > 1 ? { several: pool.map((p) => p.name) } : null;
}

export const askedQuestion = (q: Question, lead = '') => `${lead}${q.ask}`;

export function theSayBack(k: SwitchableSuite, on: boolean, answers: Record<string, unknown>, nameOf: (id: string) => string): string {
  const suite = suiteOf(k)!;
  if (!on) return `I will switch off ${WORDS[k].says}. What was set for it stays, so switching it on again brings it back. Shall I go ahead?`;
  const lines = suite.questions.map((q) => {
    const v = answers[q.id];
    return q.kind === 'person' && typeof v === 'string' ? `${nameOf(v)} will be the answer to “${q.ask.replace(/\?$/, '')}”.` : null;
  }).filter(Boolean) as string[];
  return `I will switch on ${WORDS[k].says}.${lines.length ? ` ${lines.join(' ')}` : ''} Shall I go ahead?`;
}

export const NOT_DONE = (k: SwitchableSuite) => `I have left ${WORDS[k].says} as it was. Nothing was changed.`;
export const STOPPED = (k: SwitchableSuite) => `I have stopped. ${capital(WORDS[k].says)} is as it was, and nothing was changed.`;
export const DONE = (k: SwitchableSuite, on: boolean, kept: string[]) => on
  ? `${capital(WORDS[k].says)} is switched on.${kept.length ? ` ${kept.join(' ')}` : ''} You can change it by asking me again, or on the Suites page.`
  : `${capital(WORDS[k].says)} is switched off. What was set for it is kept. Ask me to switch it on, and it comes back.`;
export const COULD_NOT = (k: SwitchableSuite) => `I could not finish switching ${WORDS[k].says} as I said it, because something in it is no longer true in your organisation. Nothing has changed. Ask me again to go through it.`;
