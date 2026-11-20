/**
 * THE SET-UP UNDERSTANDS WHAT IT IS TOLD (Hafsah, 20 November 2026).
 *
 * Setting up leave, spending, time sheets or reviews asked a fixed list of questions and read each answer by rules, so "it comes to
 * me" was not understood, and an admin with a written policy still had to answer every question. Now the model reads whatever they
 * give it, one answer, several answers in one message, or a whole policy from the Desk, against the set-up's own questions, and writes
 * each answer it finds in the plain words the set-up already reads ("their manager", "an admin", a person's full name). Those answers
 * then go through the set-up's own reading (takeAnswer), so who approves is still decided by the same fixed rules, and nothing is kept
 * until the admin says yes. Anything the model did not find is asked, as before.
 */
import { nextQuestion, takeAnswer, SUITE_IN_WORDS, type Plan, type WhatIsKnown } from './a-suite-set-up-by-talking';
import { aPlaceholderFor, isAPolicyKey, policyQuestions } from './a-leave-policy-set-up-by-talking';

export const READ_INTO_THE_SET_UP_PROMPT_KEY = 'suites.read-into-the-set-up';

export const READ_INTO_THE_SET_UP_PROMPT = `You help an admin set up how {suite} work in their organisation. You are given the set-up's questions, and some words from the admin: an answer to the question just asked, several answers at once, or their written policy.

For each question the words answer, write the answer as a short plain phrase. Leave out every question the words do not answer. Never guess.

Write who approves, or who something goes to, only with these words: "their manager", "their manager's manager", "the head of their team", "finance", "HR", "the chief executive", "an admin", or a person's full name from the list of people. When the admin says "me", "I" or "myself", write their own full name, {me}. Several people in turn are written with "then", for example "their manager, then HR". A rule for when there is nobody is written with "or", for example "their manager, or an admin".

Write a number as a number. Write "no" when the answer is no or nobody. For what happens when somebody does not respond, write who it goes to and after how many working days, for example "it goes to an admin after 2 working days", or "it waits".`;

export const READ_INTO_THE_SET_UP_SCHEMA = {
  name: 'the_answers',
  description: 'The answers the words give, one per question key.',
  input_schema: {
    type: 'object',
    properties: { answers: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, answer: { type: 'string' } }, required: ['key', 'answer'] } } },
    required: ['answers'],
  },
};


/**
 * How the model writes the leave policy's answers, so the set-up's own readings take them (a-leave-policy-set-up-by-talking.ts).
 * Sent beside the questions, not in the prompt, so a stored version of the prompt still reads them.
 */
const HOW_TO_WRITE_THE_POLICY = `How to write the answers about the leave policy:
- The types of leave: a list joined by commas. Use annual, sick, compassionate, maternity, paternity, adoption and unpaid for those (bereavement is compassionate), and the policy's own name for any other.
- How long a type is: a number with "a year" or "each time", or weeks or months with "each time" ("12 weeks each time"), or "no set number".
- Notice: a number of days, or weeks, or "none". Paid, adoptive parents, weekends and public holidays: "yes" or "no", or "birth parents only", "adoptive parents too".
- Who a type is for: words that follow "It is for", for example "everyone", "mothers", "anyone after 6 months of service", "anyone, by agreement with their manager".
- A document: what it is and after how many days, for example "a sick note after 2 days", or "no".
- The working week: the days, for example "Monday to Friday". The country: its name only.
- Offices in other countries: each as "Name in Country", joined by semicolons, or "no". Who works from an office: the people's full names or their team.
- How annual leave is given: "at the start" or "each month". Months: the month's name. Carry-over: "no", "all", or a number of days.`;

/** Questions a written policy may leave unanswered without stopping the rest being read: the policy's own, the days a year, and who differs. */
const passable = (key: string) => isAPolicyKey(key) || key === 'days' || key === 'forSome';

/** The questions still to ask, in order, as the set-up would ask them if every answer were "no" or left as it is. */
function theQuestionsLeft(plan: Plan, known: WhatIsKnown, change = false): { key: string; ask: string }[] {
  const out: { key: string; ask: string }[] = [];
  /* A change said after the say-back may be about any part of the policy, answered or not. */
  if (change && plan.suite === 'leave') out.push({ key: 'days', ask: 'How many days of annual leave does each person have in a year?' }, ...policyQuestions(plan.policy, known, true));
  let p: Plan = plan;
  for (let i = 0; i < 120; i++) {
    const q = nextQuestion(p, known);
    if (!q || out.some((o) => o.key === q.key)) break;
    out.push(q);
    /* A placeholder answer only to reach the next question; nothing here is kept. */
    const r = takeAnswer(p, q.key, isAPolicyKey(q.key) ? aPlaceholderFor(q.key) : q.key === 'days' ? '21' : q.key === 'approver' || q.key === 'above' || q.key === 'longerWho' ? 'their manager, or an admin' : q.key === 'currency' ? 'KES' : q.key === 'limit' ? '1000' : q.key === 'clients' ? 'Internal' : q.key === 'every' ? 'every 12 months' : q.key === 'writer' ? 'their manager' : 'no', known);
    if ('again' in r) break;
    p = r.plan;
  }
  return out;
}

/**
 * The words read into the plan: each answer the model found goes through the set-up's own reading, in the order the set-up asks.
 * Returns the plan as far as the answers took it, and how many were used. Without a model, nothing is read.
 */
export async function readIntoTheSetUp(
  engine: { extract?: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined,
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  plan: Plan,
  words: string,
  known: WhatIsKnown,
  /** A change said after the say-back: every part of the policy may be said again. */
  change = false,
): Promise<{ plan: Plan; used: number }> {
  if (typeof engine?.extract !== 'function' || !String(words ?? '').trim()) return { plan, used: 0 };
  const me = known.people.find((p) => p.id === known.me)?.name ?? 'the admin';
  const version = await prompts?.getActive(READ_INTO_THE_SET_UP_PROMPT_KEY).catch(() => null);
  const system = (version?.content ?? READ_INTO_THE_SET_UP_PROMPT).replace('{suite}', SUITE_IN_WORDS[plan.suite]).replace('{me}', me);
  let p: Plan = { ...plan, asking: null };
  let used = 0;
  const seen = new Set<string>();
  /* What was heard before and not yet used (Plan.heard) is read with these words, and what is still not used stays heard for its question. */
  const found = new Map<string, string>(Object.entries(plan.heard ?? {}));
  const heardBefore = found.size;
  /*
   * A written policy answers many questions at once, and some only appear once others are answered (the details of a type of leave
   * named in it, the people of an office). So it is read again, at most three times, while new questions appear.
   */
  for (let round = 0; round < 3; round++) {
    const questions = theQuestionsLeft(p, known, change && round === 0);
    const fresh = questions.filter((q) => !seen.has(q.key));
    if (!fresh.length) break;
    for (const q of questions) seen.add(q.key);
    const content = [
      `The questions:\n${questions.map((q) => `- ${q.key}: ${q.ask}`).join('\n')}`,
      plan.asking && round === 0 ? `The question just asked: ${questions[0].ask}` : '',
      plan.suite === 'leave' ? HOW_TO_WRITE_THE_POLICY : '',
      `The people: ${known.people.slice(0, 200).map((x) => x.name).join(', ') || 'none listed'}.`,
      `The admin's words:\n${String(words).slice(0, 12000)}`,
    ].filter(Boolean).join('\n\n');
    const raw = await engine.extract(system, [{ role: 'user', content }], READ_INTO_THE_SET_UP_SCHEMA, { thinkingBudget: 256 }).catch(() => null);
    let fresh0 = 0;
    for (const a of Array.isArray(raw?.answers) ? raw.answers : []) {
      if (typeof a?.key === 'string' && typeof a?.answer === 'string' && a.answer.trim()) { found.set(a.key.trim(), a.answer.trim().slice(0, 2000)); fresh0++; }
    }
    if (!fresh0 && !found.size) break;
    const before = used;
    /* A change: the policy answers given are read first, whatever was said before. */
    if (change && round === 0) {
      for (const q of questions.filter((x) => isAPolicyKey(x.key) || x.key === 'days')) {
        const said = found.get(q.key);
        if (said === undefined) continue;
        const r = takeAnswer(p, q.key, said, known);
        if ('plan' in r) { p = r.plan; used++; found.delete(q.key); }
      }
    }
    /* The set-up's own order; a question the words do not answer is passed over when it is one the rest does not depend on. */
    const passed = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const q = nextQuestion({ ...p, passed: [...passed] }, known);
      if (!q) break;
      const said = found.get(q.key);
      if (said === undefined) { if (passable(q.key)) { passed.add(q.key); continue; } break; }
      const r = takeAnswer(p, q.key, said, known);
      if ('again' in r) { found.delete(q.key); if (passable(q.key)) { passed.add(q.key); continue; } break; }
      found.delete(q.key);
      p = r.plan;
      used++;
    }
    /* The policy's answers do not depend on the rest, so any the order above did not reach are read too. */
    for (let again = 0; again < 3 && found.size; again++) {
      let took = 0;
      for (const q of p.suite === 'leave' ? policyQuestions(p.policy, known) : []) {
        const said = found.get(q.key);
        if (said === undefined) continue;
        found.delete(q.key);
        const r = takeAnswer(p, q.key, said, known);
        if ('plan' in r) { p = r.plan; used++; took++; }
      }
      if (!took) break;
    }
    if (used === before) break;
  }
  delete p.passed;
  /* Answers heard that no question has reached yet wait for theirs (whatWasHeard), so nothing said is asked again. */
  p = { ...p, heard: Object.fromEntries(found) };
  return used || found.size > heardBefore ? { plan: p, used } : { plan, used: 0 };
}

/**
 * The answers already heard, applied in the order the set-up asks, as far as they go; the rest stay heard for their question.
 * Read again after every answer, so an answer given early (a pasted policy) is never asked for.
 */
export function whatWasHeard(plan: Plan, known: WhatIsKnown): { plan: Plan; used: number } {
  const heard = { ...(plan.heard ?? {}) };
  let p: Plan = plan;
  let used = 0;
  /* The leave policy alone asks dozens of questions, so the walk goes as far as the set-up does. */
  for (let i = 0; i < 120; i++) {
    const q = nextQuestion(p, known);
    const said = q ? heard[q.key] : undefined;
    if (!q || said === undefined) break;
    delete heard[q.key];
    const r = takeAnswer({ ...p, heard }, q.key, said, known);
    if ('again' in r) break;
    p = { ...r.plan, heard };
    used++;
  }
  return { plan: { ...p, heard }, used };
}

/** Which document on the Desk is this suite's written policy, by its title and summary, read by the model. Null when none is. */
export async function thePolicyOnTheDesk(
  engine: { extract?: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined,
  suite: Plan['suite'],
  documents: { key: string; title: string; summary: string | null }[],
): Promise<{ key: string; title: string } | null> {
  if (typeof engine?.extract !== 'function' || !documents.length) return null;
  const list = documents.slice(0, 40).map((d) => `- ${d.key}: ${d.title}${d.summary ? `. ${d.summary.slice(0, 300)}` : ''}`).join('\n');
  const raw = await engine.extract(
    `Which of these documents says how ${SUITE_IN_WORDS[suite]} work in this organisation, for example a leave policy, an expenses policy or a staff handbook with a section on it? Give its key, or "none".`,
    [{ role: 'user', content: list }],
    { name: 'the_policy', description: 'The key of the document, or none.', input_schema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } },
    { fast: true },
  ).catch(() => null);
  const d = documents.find((x) => x.key === String(raw?.key ?? '').trim());
  return d ? { key: d.key, title: d.title } : null;
}

/** Said at the start when no written policy was found on the Desk. */
export const SEND_ME_THE_POLICY = (suite: Plan['suite']) =>
  `If you have a written policy for ${SUITE_IN_WORDS[suite]}, paste it here and I will set it up from it. Or add it to the Desk with the + button below, then tell me "set up ${SUITE_IN_WORDS[suite]}" again. You can also tell me who reports to whom in one message, for example “Amina and Brian report to Joseph”, or paste your whole list of reporting lines. Otherwise I will ask you, one question at a time, and nothing is set until you say yes. `;
/** Said when the set-up was filled from a policy on the Desk. */
export const READ_FROM_THE_DESK = (title: string) => `I read “${title}” on the Desk and filled in what it says.`;
