/**
 * ASK UNDERSTANDS WHAT PEOPLE MEAN WITH THE MODEL; FIXED RULES KEEP ONLY WHAT GETS APPROVED OR WRITTEN (Hafsah, 27 October 2026; fix
 * plan, pattern 2).
 *
 * In the quarter test, Brian wrote in Ask "I have raised two fee notes this month." and Peter "It says 4 of my check-ins were specific
 * out of 6, but it should be 4 out of 14", and both read "I cannot answer that one yet": the router matched text patterns, and anything
 * it had no pattern for fell through. Now, when the rules place nothing, or the message reads as a correction, the model reads the
 * message with the person's own record and says what it is: a question, a correction, or an update. The model never chooses a lane
 * that writes, approves or sends anything (leave, spending, hours, decisions, to-dos, notes): those are reached only by the rules and
 * the person's own yes, so nobody can talk it into one.
 *
 * NO MENU OF LANES (Hafsah, 1 November 2026). The model also picked one of 26 lanes that only read, and that lane's own narrow lookup
 * then answered: "When is the Kasarani filing due?" went to what is due from the asker ("Nothing is due."), and "Tell me everything
 * Brian told you" to a list of what Ask can do. Every one of those answers was wrong on the assessment test, and both right ones came
 * from the model reading the record. A question no rule places is now answered from the record and the documents, by the model, through
 * the one reader of the assessments (a-question-is-answered-from-the-documents.ts).
 */

export type WhatTheyMean = 'question' | 'correction' | 'update' | 'agreement' | 'greeting' | 'thanks' | 'finished' | 'delegate' | 'help' | 'how_to' | 'wants' | 'report' | 'arrangement' | 'other';

export interface TheMessageUnderstood {
  kind: WhatTheyMean;
  /** What it is about, in a few of their words: a person, a deal, a matter, a policy. */
  about: string | null;
  /** How many separate things a question asks: "What did I say I would do tomorrow, and who still owes us money?" asks two (S12). */
  parts: number;
  /** For "how_to" and "wants": the key of the thing in the guide they asked how to do (what-the-assistant-can-do.ts, THE_GUIDE). */
  guide?: string;
  /** For a delegate: the person they say should act for them, as they wrote it. The say-back that follows checks it against the People list, and only their own yes grants anything. */
  who?: { name: string | null; email: string | null };
}

export const UNDERSTAND_PROMPT_KEY = 'ask.understand-the-message';
export const UNDERSTAND_PROMPT = `You read one message somebody typed into Ask Groundwork, a work assistant, and say what they mean. You do not answer it.

Say which kind it is:
- question: they want to know something.
- correction: they say something Groundwork showed them is wrong, or give the true figure or fact instead ("that's not right", "I sent it on Monday", "it should be 4 out of 14", "I have raised two fee notes this month", "she is excellent with clients"). Ending or changing something they set up themselves, such as somebody acting for them ("Amina no longer acts for me"), is wants, not this.
- update: they tell Groundwork something new about their work that is not a correction.
- agreement: they say what Groundwork showed or asked them is right, or that there is nothing wrong, nothing to change and nothing to add ("that's right", "no, nothing is wrong", "all good", "No, that is right"). A "no" that answers "Is anything wrong?" is this, not a correction.
- greeting: hello, or similar, with nothing else to ask or tell, or a hello that says who they are or who sent them to Groundwork ("Good morning", "Hello, I am the new finance head", "Good morning. Our administrator said you will help my office this year").
- thanks: thank you, thanks, or goodbye, with nothing else to ask or tell.
- finished: they say they are done, that this is all, that they have nothing more to say, or give the words of a finish button ("That's right, finish", "I'm done", "that's all"), and add nothing else to tell or ask.
- delegate: they name a person who is their assistant, executive assistant, PA or secretary, or who should see what they see or act for them ("Zainab Musa is my executive assistant, she can see what I see", "my PA is Amina"). Put the person's name and the address they wrote in who.
- help: they ask, in any words, what Groundwork or this assistant can do for them, what they can ask it, or what they can set up, request or get from it, and nothing more specific ("what are you good for?", "what sort of things do you do?", "I'm new, what can I use this for?").
- how_to: they ask how to do something in Groundwork itself, the product: where to find it, which button to press, or how to get it done here ("how do I add someone?", "where do I change my number?", "how can I share the report with my team?"). A question about the organisation's own rules or ways of working ("how do we handle expenses?", "what is our leave policy?") is a question, not this.
- wants: they want one of the things in the list below done for them now, in any words, however short ("I want to apply for leave", "can I get 3 days off?", "get me updates from my team", "my list", "make the Q4 one fortnightly"). Saying they have a question for somebody else, or want to ask somebody something, is wants, because Groundwork is to ask that person ("I have a question for Amina about her leave request"). A question about something they already asked for, or how many days they have left, is a question.
- report: they ask Groundwork to put together, write or prepare a report for them, on their departments, teams, check-ins or work, from what it holds and what they can give it, or ask for a report it wrote for them before, or ask to see or change the outline of a report or add a section to it ("Can you prepare a report on my departments?", "I need a quarterly report for operations for the board, can you draft it", "can u send me a report on my departments for the quarter", "can you show me the outline first and add a section on what is blocking us", "whats the outline of the report"). A question about how the quarter or the year went, asked to be answered now ("what did we get done this quarter?"), is a question, not a report.
- arrangement: they set how their organisation is arranged for other people: who reports to whom or who manages whom ("Amina reports to Joseph", "Joseph manages Amina and Brian"), or a number that differs for some people by job title, team or person, such as days of leave a year, hours a week, or how much a manager approves on their own ("managers get 25 days, field agents 18", "people in Sales give 45 hours"). Not their own leave, hours or spending, and not a question.
- other: anything else.

For who, only when the kind is delegate, give the name as they wrote it and the email address only if they wrote one.

For about, give the person, deal, client, matter or topic it is about, in a few of their own words, or leave it empty.

For guide, when it is how_to, wants, or a question that one of the things below answers, give the key of the thing below that they ask how to do, or leave it empty when none of them fits.

For parts, say how many separate things a question asks for. "What did I say I would do tomorrow, and who still owes us money?" asks for two. "When is my next check-in?" asks for one. Anything that is not a question is one.`;

export const UNDERSTAND_SCHEMA = {
  name: 'what_they_mean',
  description: 'What the message is, and what it is about.',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['question', 'correction', 'update', 'agreement', 'greeting', 'thanks', 'finished', 'delegate', 'help', 'how_to', 'wants', 'report', 'arrangement', 'other'] },
      about: { type: 'string' },
      who: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } },
      guide: { type: 'string', description: 'For how_to or wants: the key of the thing they ask how to do, from the list given, or empty.' },
      parts: { type: 'integer', description: 'How many separate things the question asks for. 1 when it is not a question.' },
    },
    required: ['kind'],
  },
};

/**
 * What the model said, made safe: an unknown kind is "other", and whatever else it says is not read. "help" and "how_to" are only kept
 * where the guide was given to choose from (Ask), and a "how_to" with no key from that guide is read as a question, so the check-in
 * conversation and any other caller are answered exactly as before.
 */
export function whatTheModelSaid(raw: any, guideKeys?: Set<string>): TheMessageUnderstood | null {
  if (!raw || typeof raw !== 'object') return null;
  const kinds: WhatTheyMean[] = ['question', 'correction', 'update', 'agreement', 'greeting', 'thanks', 'finished', 'delegate', 'help', 'how_to', 'wants', 'report', 'arrangement', 'other'];
  let kind = kinds.includes(raw.kind) ? (raw.kind as WhatTheyMean) : 'other';
  const guide = guideKeys && typeof raw.guide === 'string' && guideKeys.has(raw.guide.trim()) ? raw.guide.trim() : undefined;
  if (kind === 'help' && !guideKeys) kind = 'question';
  if ((kind === 'how_to' || kind === 'wants') && !guide) kind = 'question';
  const about = typeof raw.about === 'string' && raw.about.trim() ? raw.about.trim().slice(0, 120) : null;
  const parts = Number.isInteger(raw.parts) && raw.parts > 1 ? Math.min(raw.parts, 5) : 1;
  if (kind === 'delegate') {
    const name = typeof raw.who?.name === 'string' && raw.who.name.trim() ? raw.who.name.trim().slice(0, 80) : null;
    const email = typeof raw.who?.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.who.email.trim()) ? raw.who.email.trim().toLowerCase() : null;
    return { kind, about, parts, who: { name, email } };
  }
  return (kind === 'how_to' || kind === 'wants' || kind === 'question') && guide ? { kind, about, parts, guide } : { kind, about, parts };
}

export async function understandTheMessage(
  engine: { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> },
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  message: string,
  /** What Groundwork had just asked them, where it had: the same words mean different things after "Is anything wrong?" */
  asked?: string | null,
  /** The description of what Groundwork can do, fitted to this reader (theDescriptionFor), given by Ask only. With it, "help" and "how_to" are read. */
  guide?: { role: string; things: { key: string; does: string; example: string; theyMay: boolean }[] },
): Promise<TheMessageUnderstood | null> {
  const version = await prompts?.getActive(UNDERSTAND_PROMPT_KEY).catch(() => null);
  const said = String(message ?? '').slice(0, 2000);
  const content = asked ? `Groundwork had just asked them: "${String(asked).slice(0, 300)}"\nThey answered: ${said}` : said;
  /* The description rides with the message, not in the stored prompt, so it can never drift from the guide. */
  const withTheGuide = guide?.things.length
    ? `${content}\n\nThey are ${guide.role}. What Groundwork can do, as key, what it is, an example, and whether they may do it here:\n${guide.things.map((g) => `${g.key}: ${g.does}. For example, "${g.example}". ${g.theyMay ? 'They may.' : 'Somebody else does it.'}`).join('\n')}`
    : content;
  const raw = await engine.extract(version?.content ?? UNDERSTAND_PROMPT, [{ role: 'user', content: withTheGuide }], UNDERSTAND_SCHEMA, { fast: true }).catch(() => null);
  return whatTheModelSaid(raw, guide?.things.length ? new Set(guide.things.map((g) => g.key)) : undefined);
}

/**
 * WHICH JOB TITLES A GROUP OF PEOPLE MEANS (Batch S, round 2, T1). An admin says "managers get 25 days, heads 25, sales executives
 * 18", and the organisation's titles are "Managing director", "Head of Sales" and "Sales executive". The model reads each group
 * against the titles that exist, by meaning, and names only titles from that list. The rules then say back who each covers by name,
 * and nothing is kept without the admin's yes. A group that fits no title is kept as a title for whoever is given it later.
 */
export const TITLES_PROMPT_KEY = 'ask.which-job-titles';
export const TITLES_PROMPT = `An admin is setting a number (days of leave, hours a week, or a spending limit) for groups of people in their organisation, and named each group in their own words. For each group, say which of the organisation's job titles it covers, by meaning. "managers" covers a title such as "Sales manager", "Managing director" or "Operations manager"; "heads" covers "Head of Sales"; "sales executives" covers "Sales executive". Use only titles from the list, written exactly as listed. When no title on the list fits, give an empty list for that group.`;
export const TITLES_SCHEMA = {
  name: 'which_titles',
  description: 'The job titles each group covers.',
  input_schema: {
    type: 'object',
    properties: { groups: { type: 'array', items: { type: 'object', properties: { said: { type: 'string' }, titles: { type: 'array', items: { type: 'string' } } }, required: ['said', 'titles'] } } },
    required: ['groups'],
  },
};

export async function theTitlesTheyMean(
  engine: { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> },
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  groups: string[],
  titles: string[],
): Promise<Record<string, string[]>> {
  if (!groups.length || !titles.length) return {};
  const version = await prompts?.getActive(TITLES_PROMPT_KEY).catch(() => null);
  const content = `The job titles here: ${titles.slice(0, 200).map((t) => `"${t}"`).join(', ')}.\nThe groups the admin named: ${groups.slice(0, 20).map((g) => `"${g}"`).join(', ')}.`;
  const raw = await engine.extract(version?.content ?? TITLES_PROMPT, [{ role: 'user', content }], TITLES_SCHEMA, { fast: true }).catch(() => null);
  const out: Record<string, string[]> = {};
  for (const g of Array.isArray(raw?.groups) ? raw.groups : []) {
    if (typeof g?.said !== 'string' || !Array.isArray(g.titles)) continue;
    out[g.said.trim().toLowerCase()] = g.titles.filter((t: unknown): t is string => typeof t === 'string' && titles.includes(t));
  }
  return out;
}
