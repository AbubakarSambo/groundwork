import { aTitleIs, theExceptionsSaid, theNumberSaid, whoSaid, type ASetting, type AnException, type ForWhom, type WhoKind } from '../suites/who-a-rule-is-for';
import type { APersonHere } from '../suites/the-people-and-their-lines';

/**
 * THE ROLE MAP AND THE NUMBERS FOR SOME PEOPLE, SAID IN ASK (Batch S, S3 and S6: "Everything that can be set up on screen can also
 * be set up by chat").
 *
 *   - Reporting lines: "Amina reports to Joseph", "Brian and Chidi report to Joseph", "Joseph manages Amina and Brian",
 *     "Amina's manager is Joseph". The People page's "Reports to" sets the same line through the same writer
 *     (users/who-they-report-to.ts).
 *   - Numbers for some people (suites/who-a-rule-is-for.ts): "Managers get 25 days, field agents 18", "Joseph gets 30 days of
 *     leave", "People in Sales are asked for 45 hours a week", "Field agents' managers approve up to 20,000". The Suites page's
 *     "Different for some people" sets the same exceptions through the same `SuitesService.setForWhom`.
 *
 * Who is named is read from the organisation's own record, never a list of words: a person by their name, a team by the names of
 * the teams here, an app role (admins, leads, members), or a job title somebody here holds ("managers" covers every title ending
 * in manager). Anything that names nobody here is not read as this, so the message is answered as before. Everything is said back,
 * with who it covers today by name, and saved only on a yes.
 */

export interface ALine { userId: string; toUserId: string }

const tidy = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/^[“"']|[”"'.!]+$/g, '').trim();

/** The one person these words name, by full name, then first name, then last name. Null for nobody or more than one. */
export function thePersonNamed(words: string, people: Pick<APersonHere, 'userId' | 'name' | 'firstName'>[]): string | null {
  const w = tidy(words).toLowerCase().replace(/(?:'s|’s)$/, '');
  if (!w) return null;
  for (const pick of [
    (p: { name: string }) => p.name.toLowerCase() === w,
    (p: { firstName: string }) => p.firstName.toLowerCase() === w,
    (p: { name: string }) => p.name.toLowerCase().split(' ').slice(-1)[0] === w,
  ]) {
    const found = people.filter((p) => pick(p as any) && p.name);
    if (found.length === 1) return found[0].userId;
    if (found.length > 1) return null;
  }
  return null;
}

/** "Amina, Brian and Chidi" as each name. */
const namesIn = (words: string) => tidy(words).split(/\s*,\s*|\s+and\s+|\s*&\s*/i).map(tidy).filter(Boolean);

/**
 * The reporting lines said, or null when the message is not that, or names anybody who is not here. Never a question.
 */
export function reportingLinesIn(message: string, people: Pick<APersonHere, 'userId' | 'name' | 'firstName'>[]): ALine[] | null {
  /* A pasted list of reporting lines, one on each line, is read line by line (the role map as a document, 21 November 2026). */
  const t = tidy((message ?? '').replace(/\s*\n+\s*/g, '; '));
  if (!t || /\?\s*$/.test(message ?? '')) return null;
  const out: ALine[] = [];
  for (const clause of t.split(/\s*(?:;|\.\s+|,\s*(?=\S+(?:\s+\S+)?\s+(?:reports?|manages)\b))\s*/i).map(tidy).filter(Boolean)) {
    let below: string[] = [];
    let above = '';
    const m1 = /^(.+?)\s+(?:now\s+)?reports?\s+(?:directly\s+)?to\s+(.+)$/i.exec(clause);
    const m2 = /^(.+?)(?:'s|’s)\s+(?:line\s+)?manager\s+is\s+(.+)$/i.exec(clause);
    const m3 = /^(.+?)\s+manages\s+(.+)$/i.exec(clause);
    if (m1) { below = namesIn(m1[1]); above = m1[2]; }
    else if (m2) { below = namesIn(m2[1]); above = m2[2]; }
    else if (m3) { below = namesIn(m3[2]); above = m3[1]; }
    else return null;
    const to = thePersonNamed(above, people);
    if (!to || !below.length) return null;
    for (const b of below) {
      const id = thePersonNamed(b, people);
      if (!id || id === to) return null;
      out.push({ userId: id, toUserId: to });
    }
  }
  return out.length ? out : null;
}

const nameOf = (people: Pick<APersonHere, 'userId' | 'name'>[], id: string) => people.find((p) => p.userId === id)?.name || 'somebody';
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "Amina Otieno will report to Joseph Kamau, and Brian Mwangi will report to Joseph Kamau." */
export function theLinesSaid(lines: ALine[], people: Pick<APersonHere, 'userId' | 'name'>[], done = false): string {
  return `${capital(listed(lines.map((l) => `${nameOf(people, l.userId)} ${done ? 'now reports' : 'will report'} to ${nameOf(people, l.toUserId)}`)))}.`;
}

export const theLinesSaidBack = (lines: ALine[], people: Pick<APersonHere, 'userId' | 'name'>[]) =>
  `${theLinesSaid(lines, people)} Their leave requests, hours and requests to spend will then go to that manager first. Shall I save this? Nothing changes until you say yes.`;

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

// ------------------------------------------------ numbers for some people ------------------------------------------------

export interface ANumberSaid { setting: ASetting; who: AnException['who']; value: number }

type Here = Pick<APersonHere, 'userId' | 'name' | 'firstName' | 'title' | 'team' | 'appRole'>;
const APP_ROLE_IN = (w: string): string | null => {
  const x = w.toLowerCase().replace(/^(?:all|every|the)\s+/, '').replace(/s$/, '');
  return x === 'admin' ? 'ADMIN' : x === 'lead' ? 'LEAD' : x === 'member' ? 'MEMBER' : null;
};

/** "partners" said as a job title: "Partner". Kept as said when nobody holds it yet. */
export const aTitleAsSaid = (w: string) => { const t = tidy(w).replace(/^(?:all|every|the|our)\s+/i, '').replace(/(?<=[a-z]{3})s$/i, ''); return `${t.charAt(0).toUpperCase()}${t.slice(1)}`; };

/** The groups of people named in each clause, before anything is matched: what the model is asked to read against the titles here. */
export function theGroupsNamedIn(message: string): string[] {
  return theClausesOf(message).map((c) => (theNumberIn(c)?.who ?? '').trim()).filter((x) => x.length >= 3);
}

/**
 * Who these words name in this organisation: a person, a team, an app role, the job titles the model read them as meaning
 * (`meant`, from ask-understands-with-the-model.ts), or a job title somebody here holds. Words that name nobody here are a job
 * title kept for whoever is given it later ("partners get 30 days" before anyone has joined, Batch S round 2, T1).
 */
export function whoIsNamed(words: string, people: Here[], meant: Record<string, string[]> = {}): AnException['who'][] | null {
  const w = tidy(words).replace(/^(?:people|everyone|everybody|anyone|those)\s+(?:in|on)\s+(?:the\s+)?/i, 'team:').replace(/\s+team$/i, '');
  if (!w) return null;
  const teams = [...new Set(people.map((p) => p.team).filter((t): t is string => !!t))];
  const asTeam = w.startsWith('team:') ? w.slice(5).trim() : w;
  const team = teams.find((t) => t.toLowerCase() === asTeam.toLowerCase());
  if (team) return [{ kind: 'team', value: team }];
  if (w.startsWith('team:')) return null;
  const person = thePersonNamed(w, people);
  if (person) return [{ kind: 'person', value: person }];
  const role = APP_ROLE_IN(w);
  if (role) return [{ kind: 'appRole', value: role }];
  const titles = [...new Set(people.map((p) => p.title).filter((t): t is string => !!t))];
  const byMeaning = (meant[w] ?? meant[w.toLowerCase()] ?? []).filter((t) => titles.includes(t));
  if (byMeaning.length) return byMeaning.map((t) => ({ kind: 'title' as WhoKind, value: t }));
  const literal = titles.filter((t) => aTitleIs(t, w.replace(/^(?:all|every|the|our)\s+/i, '')));
  if (literal.length) return literal.map((t) => ({ kind: 'title' as WhoKind, value: t }));
  if (w.replace(/[^a-z]/gi, '').length < 3) return null;
  return [{ kind: 'title', value: aTitleAsSaid(w) }];
}

function theClausesOf(message: string): string[] {
  return tidy(message ?? '').split(/\s*(?:;|,|\.\s+|\band\s+(?=[a-z][\w ’']*?\s+\d))\s*/i).map(tidy).filter(Boolean);
}

/** One clause's group, number and unit word, or null. */
function theNumberIn(raw: string): { who: string; n: number; unit: ASetting | null } | null {
  const clause = raw.replace(/\s+(?:of\s+(?:annual\s+)?leave|a\s+year|per\s+year|each\s+year|a\s+week|per\s+week|each\s+week)\b/gi, '');
  const spend = /^(.+?)(?:(?:'s|’s|s’|s')\s+managers?)?\s+(?:can\s+|may\s+)?(?:approve|approves|sign\s+off)\s+(?:spending\s+|requests\s+)?(?:of\s+)?up\s+to\s+(?:[A-Z]{3}\s*)?([\d,]+(?:\.\d+)?)\s*(k)?$/i.exec(clause);
  const m = spend ?? /^(.+?)\s+(?:get|gets|have|has|are\s+given|is\s+given|should\s+get|should\s+have|work|works|give|gives|are\s+asked\s+for|is\s+asked\s+for|owe|owes)?\s*(\d[\d,]*)\s*(days?|hours?|hrs?)?$/i.exec(clause);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, '')) * (spend && m[3] ? 1000 : 1);
  if (!Number.isFinite(n)) return null;
  return { who: m[1], n, unit: spend ? 'spend.limit' : m[3] ? (/^d/i.test(m[3]) ? 'leave.days' : 'time.hoursAWeek') : null };
}

/**
 * Numbers for some people, or null when the message is not that, or names somebody who is not here. A clause without its own
 * unit takes the one before it: "Managers get 25 days, field agents 18".
 */
export function numbersForSomePeopleIn(message: string, people: Here[], unitAsked: ASetting | null = null, meant: Record<string, string[]> = {}): ANumberSaid[] | null {
  const t = tidy(message ?? '');
  if (!t || /\?\s*$/.test(message ?? '') || !/\d/.test(t)) return null;
  const out: ANumberSaid[] = [];
  let unit: ASetting | null = unitAsked;
  for (const raw of theClausesOf(t)) {
    const x = theNumberIn(raw);
    if (!x) return null;
    if (x.unit) unit = x.unit;
    if (!unit) return null;
    const whos = whoIsNamed(x.who, people, meant);
    if (!whos) return null;
    for (const who of whos) out.push({ setting: unit, who, value: x.n });
  }
  return out.length ? out : null;
}

/** The organisation's own number for a setting, as "Everybody else ..." says it. */
export interface TheEveryone { 'leave.days'?: number | null; 'time.hoursAWeek'?: number | null; 'spend.limit'?: number | null }

const same = (a: AnException['who'], b: AnException['who']) => a.kind === b.kind && a.value.toLowerCase() === b.value.toLowerCase();

/** The numbers said, laid over what is kept, each with who it covers today by name. */
export function theseNumbersSaid(said: ANumberSaid[], kept: ForWhom, people: Here[], currency: string | null): string[] {
  const after: ForWhom = JSON.parse(JSON.stringify(kept));
  for (const n of said) after[n.setting] = [...(after[n.setting] ?? []).filter((e) => !same(e.who, n.who)), { who: n.who, value: n.value }];
  const lines: string[] = [];
  for (const setting of [...new Set(said.map((n) => n.setting))]) {
    const all = theExceptionsSaid(after, setting, people as any, currency);
    const list = after[setting] ?? [];
    for (const n of said.filter((x) => x.setting === setting)) {
      const i = list.findIndex((e) => same(e.who, n.who));
      if (i >= 0) lines.push(all[i]);
    }
  }
  return lines;
}

/** Said back before the yes, and said again from what is stored after it: each number, who it covers today, and everybody else. */
export function theNumbersSaid(said: ANumberSaid[], kept: ForWhom, people: Here[], everyone: TheEveryone, currency: string | null, done = false): string {
  const lines: string[] = [];
  for (const setting of [...new Set(said.map((n) => n.setting))]) {
    lines.push(...theseNumbersSaid(said.filter((n) => n.setting === setting), kept, people, currency));
    const base = everyone[setting];
    lines.push(base != null
      ? `Everybody else ${setting === 'leave.days' ? theNumberSaid(setting, base).replace(/^has /, 'keeps ') : setting === 'time.hoursAWeek' ? theNumberSaid(setting, base).replace(/^is /, 'is still ') : theNumberSaid(setting, base, currency)}.`
      : setting === 'leave.days' ? 'Nobody else has a number of days set yet.' : setting === 'time.hoursAWeek' ? 'Nobody else is asked for a number of hours.' : 'For everybody else, the steps by amount stay as they are.');
  }
  return done
    ? `I have set it. ${lines.join(' ')} You can change it by telling me, or under “Different for some people” on the Suites page.`
    : `Here is what I will set. ${lines.join(' ')} Shall I set this? Nothing changes until you say yes.`;
}

export { whoSaid };
