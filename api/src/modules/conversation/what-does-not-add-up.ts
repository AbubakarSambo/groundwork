import { aDealsFigure, theCustomerALineIsAbout } from '../board/a-deals-units-are-not-a-target';
/**
 * WHAT DOES NOT ADD UP, WORKED OUT BY THE PRODUCT AND QUOTED TO THE MODEL.
 *
 * Two adversarial runs (20 Sep 2026) scored "noticed what did not add up" lowest of every dimension,
 * 2.3 of 5, and the misses were not subtle: a poultry farmer said 500 birds and 400 eggs a day in
 * session one and 260 birds and 200 eggs in session two, and nobody said "that is half". A motorbike
 * borrower's goal was "increase my income" in session one and "just keep paying" in session two, and
 * the change was not named. A rep whose manager had set him N50m said his own target was N40m, and
 * the two numbers sat one screen apart on the board without meeting. All of it was already in the
 * record; the model was asked to notice it from a nineteen-thousand-word prompt and did not.
 *
 * So the product does the noticing, the way it does the arithmetic on the board. Four checks, all
 * deterministic, all quoting the person's own lines:
 *
 *   1. the same thing counted differently across sessions ("220 birds" after "500 birds");
 *   2. their own number for a target against the number set for them by the lead;
 *   3. where they stand against a target with the run nearly over;
 *   4. what they said this was for in the first session, when nothing they have reported since
 *      mentions it.
 *
 * The model gets the differences as facts with both lines quoted, and one instruction: put ONE of
 * them to the person, plainly, both lines side by side, as a question. Determinism owns the
 * arithmetic and the quotation; the model owns the sentence. See [[feedback-structural-not-
 * instructional-guardrails]].
 */

export interface AThingOnRecord {
  text: string;
  type: string;
  session: number;
  /** The week it was said in ("19 October", the Monday), where the caller knows it. */
  week?: string;
}

export interface ATargetTheyHold {
  name: string;
  target: number | null;
  count: number;
  /** Theirs (owned by this person), as opposed to the check-in's shared target. */
  yours: boolean;
  /** Said by this person, as opposed to set for them by the lead. */
  setByThem: boolean;
}

export interface WhatToCheck {
  said: AThingOnRecord[];
  thisSession: number;
  targets: ATargetTheyHold[];
  /** Sessions planned after this one; null when the run has no fixed length. */
  sessionsLeft: number | null;
  /** The AI's own turns this session, so a difference already put to them is not put twice. */
  aiTurnsThisSession: string[];
  /**
   * On a sales check-in, the customers on record (its deals and leads). A number said about one customer is that customer's
   * deal: it is only ever compared with a number about the same customer, and it is never their own target (Drop Access run 1,
   * items 27 and 28; a-deals-units-are-not-a-target).
   */
  customers?: string[] | null;
  /** The first names of the people in the check-in, so "with Grace" is a person and not a business. */
  people?: string[];
}

export interface ADifference {
  kind: 'counted differently' | 'two numbers for one target' | 'behind with the run nearly over' | 'what it was for has gone quiet' | 'counting a different thing';
  lines: string[];
  /** The numbers or words that identify it, so a turn that already mentioned them counts as having put it. */
  marks: string[];
}

/* ------------------------------------------------------------------------------------------------ */

const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, bn: 1e9, billion: 1e9 };

/** "220 birds", "40 tonnes a week", "N26m", "400 eggs a day": a number and the thing it counts. */
export function numbersWithUnits(text: string): { value: number; unit: string; raw: string }[] {
  const out: { value: number; unit: string; raw: string }[] = [];
  const clean = (text ?? '').replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\[INFERRED:[^\]]*\]/g, '');
  const re = /(?:[₦$£€]|\b(?:ngn|naira|usd|n))?\s?(\d[\d,]*(?:\.\d+)?)\s*(k|m|bn|million|thousand|billion)?\b(?:\s*(?:%|percent))?(?:\s+(?:a|per|each|every|of|in|on)\s+)?\s*([a-z]+)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const value = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? SCALE[m[2].toLowerCase()] ?? 1 : 1);
    if (!Number.isFinite(value)) continue;
    const money = /^[₦$£€]|^(ngn|naira|usd|n)\s?\d/i.test(m[0].trim()) || !!m[2];
    const pct = /%|percent/i.test(m[0]);
    const word = (m[3] ?? '').toLowerCase();
    const unit = pct ? 'percent' : money ? 'money' : word && !/^(and|but|the|that|this|which|so|for|by|to|from|with|at|is|was|are|were|of|on|in)$/.test(word) ? word.replace(/s$/, '') : '';
    if (!unit) continue;
    /* A year is a date, not a count. */
    if (!money && !pct && value >= 1900 && value <= 2100) continue;
    out.push({ value, unit, raw: m[0].trim() });
  }
  return out;
}

const pct = (a: number, b: number): number => (a === 0 ? 100 : Math.round((Math.abs(b - a) / Math.abs(a)) * 100));

const wordsOf = (text: string): Set<string> =>
  new Set(
    (text ?? '')
      .toLowerCase()
      .replace(/\[verifiability:\w+\]|\[inferred:[^\]]*\]/g, '')
      .match(/[a-z]{4,}/g)
      ?.filter((w) => !STOP.has(w)) ?? [],
  );
const STOP = new Set([
  'that', 'this', 'with', 'from', 'have', 'will', 'been', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'would',
  'could', 'should', 'about', 'into', 'over', 'more', 'most', 'some', 'than', 'then', 'also', 'just', 'like', 'make', 'making', 'sure',
  'always', 'goal', 'target', 'main', 'thing', 'want', 'need', 'going', 'time', 'session', 'check', 'record', 'still', 'because', 'very',
  'really', 'being', 'doing', 'done', 'well', 'good', 'much', 'many', 'every', 'each', 'other', 'only', 'even', 'back', 'down', 'right',
]);

const clean = (t: string): string => (t ?? '').replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\[INFERRED:[^\]]*\]/g, '').trim();
const AN_AIM = /\b(aim(?:ing)?(?: for)?|target|goal|hope|hoping|plan(?:ning)?|want(?:ed)? to|need(?:ed)? to|should|by the end|to have|to get|to reach)\b/i;
/* On a sales check-in (customers on record are given), "wants to" and "needs to" are aims too (Drop Access run 1, items 27 and 28). Release 1, part 3: only where `customers` is given; the rest of the conversation keeps AN_AIM until its own part. */
const AN_AIM_ON_A_SALES_CHECK_IN = /\b(aim(?:ing)?(?: for)?|target|goal|hope|hoping|plan(?:ning)?|wants? to|wanted to|needs? to|needed to|should|by the end|to have|to get|to reach)\b/i;
/** The text with its aim clauses taken out: "500 birds, aiming for 400 eggs a day" leaves "500 birds". */
const whatIsNotAnAimIn = (t: string, onASalesCheckIn = false): string => clean(t).split(/[,;]|\b(?:and|but)\b/i).filter((c) => !(onASalesCheckIn ? AN_AIM_ON_A_SALES_CHECK_IN : AN_AIM).test(c)).join(', ');

const quote = (t: string): string => `"${(t ?? '').replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\[INFERRED:[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()}"`;

const fmt = (n: number): string => (Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n));

/* ------------------------------------------------------------------------------------------------ */

/** The words of a target's name worth matching a sentence against: the nouns, not the filler. */
function wordsOfTarget(name: string): string[] {
  const stop = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'total', 'our', 'their', 'quarter', 'month', 'year', 'week', 'target', 'goal', 'number', 'across', 'team']);
  return (name ?? '')
    .toLowerCase()
    .match(/[a-z]{4,}/g)
    ?.filter((w) => !stop.has(w))
    .slice(0, 4) ?? [];
}

/* "They each want 1 unit", "1 unit each", "2 apiece", "1 unit per kiosk"; never "25 units at KES 5,000 each", whose "each" is the price's. */
export function aFigureForEachOne(text: string, raw: string): boolean {
  const t = String(text ?? '');
  const at = t.indexOf(raw);
  if (at === -1) return false;
  const before = t.slice(Math.max(0, at - 20), at);
  const after = t.slice(at + raw.length);
  return /\beach\s+(?:\w+\s+){0,2}$/i.test(before) || /^\s*(?:each|apiece|per\s+(?:kiosk|shop|store|customer|outlet|school|person|head|site|branch))\b/i.test(after);
}

export function whatDoesNotAddUp(input: WhatToCheck): ADifference[] {
  const out: ADifference[] = [];
  const said = input.said.filter((s) => s.text?.trim());

  /* 1. THE SAME THING, COUNTED DIFFERENTLY ACROSS SESSIONS. Earliest against latest, per unit. */
  const byUnit = new Map<string, { value: number; session: number; text: string }[]>();
  for (const s of said) {
    /* WHAT HAPPENED, NOT WHAT WAS AIMED AT. "To have 500 layers, get 400 eggs a day" is the aim; "around 220
       eggs a day" is the count. Read together they produced "400 eggs then 220: down 45%" on a report about a
       woman whose flock was rebuilding (run 11, 22 Sep 2026). An aim, an intention or a commitment is not the
       earlier count of anything; only a report of what is, or a worry about what happened, carries one. */
    if (!/^(PROGRESS|SUCCESS_DEFINITION|COMMITMENT|INTENT|WORRY)$/.test(s.type)) continue;
    if (/^\s*(to|aiming|aim|hoping|planning|target|goal)\b/i.test(clean(s.text))) continue;
    /* One customer's units are compared only with the same customer's; a number about no customer only with another about none. */
    const about = input.customers ? (theCustomerALineIsAbout(s.text, input.customers) ?? (aDealsFigure(s.text, input.customers, input.people ?? []) ? `a deal: ${s.text}` : '')) : '';
    const read = whatIsNotAnAimIn(s.text, !!input.customers);
    for (const n of numbersWithUnits(read)) {
      if (n.unit === 'money' || n.unit === 'percent') continue;
      /*
       * A FIGURE FOR EACH ONE IS NOT A COUNT (engine test, Drop Access). Mercy said on Monday 12 October of the Kawangware kiosks "They
       * each want 1 unit", and on Wednesday "Greenfield Supermarket was interested in 25 units from the start". Her check-ins in
       * sessions 2, 3, 5 and 6 asked her to settle "each want 1 unit" against "interested in 25 units", two customers read as one.
       * A number said for each one ("each", "apiece", "per shop") is not a count of anything to set against another.
       */
      if (aFigureForEachOne(read, n.raw)) continue;
      /* A target's own number said again is that target, not a count of anything (point 9; answer 7): "120 units sold in total". */
      if (input.customers && input.targets.some((t) => t.target != null && t.target === n.value)) continue;
      const key = about ? `${n.unit}\u0000${about.toLowerCase()}` : n.unit;
      byUnit.set(key, [...(byUnit.get(key) ?? []), { value: n.value, session: s.session, text: s.text }]);
    }
  }
  for (const [key, xs] of byUnit) {
    const unit = key.split('\u0000')[0];
    const sessions = [...new Set(xs.map((x) => x.session))].sort((a, b) => a - b);
    if (sessions.length < 2) continue;
    const first = xs.filter((x) => x.session === sessions[0]).sort((a, b) => b.value - a.value)[0];
    const last = xs.filter((x) => x.session === sessions[sessions.length - 1]).sort((a, b) => b.value - a.value)[0];
    if (!first || !last || first.text === last.text) continue;
    const change = pct(first.value, last.value);
    if (change < 20) continue;
    out.push({
      kind: 'counted differently',
      lines: [
        `Session ${first.session}: ${quote(first.text)}.`,
        `Session ${last.session}: ${quote(last.text)}.`,
        `That is ${fmt(first.value)} ${unit}${first.value === 1 ? '' : 's'} then ${fmt(last.value)}: ${last.value < first.value ? 'down' : 'up'} ${change}%.`,
      ],
      marks: [String(first.value), String(last.value)],
    });
  }

  /* 2. TWO NUMBERS FOR ONE TARGET: the lead's for them, and their own. */
  const setForThem = input.targets.filter((t) => t.yours && !t.setByThem && t.target != null);
  const theirOwn = input.targets.filter((t) => t.yours && t.setByThem && t.target != null && !(input.customers && aDealsFigure(t.name, input.customers, input.people ?? [])));
  for (const lead of setForThem) {
    const own = theirOwn.find((t) => t.target !== lead.target);
    if (!own) continue;
    out.push({
      kind: 'two numbers for one target',
      lines: [
        `Set for them by the lead: ${quote(lead.name)}, ${fmt(lead.target as number)}.`,
        `Their own number: ${quote(own.name)}, ${fmt(own.target as number)}.`,
        'Neither has been put next to the other yet.',
      ],
      marks: [String(lead.target), String(own.target)],
    });
    break;
  }

  /* 3. BEHIND, WITH THE RUN NEARLY OVER. Their own targets only: the team's N71m of N180m is not this
        rep's standing, and putting it to him as his produced "the record shows N71m" against his N38m
        (run 6, 20 Sep 2026). */
  if (input.sessionsLeft != null && input.sessionsLeft <= 1) {
    for (const t of input.targets.filter((x) => x.yours && x.target != null && x.target > 0 && x.count > 0 && x.count < (x.target as number))) {
      const share = Math.round((t.count / (t.target as number)) * 100);
      if (share > 85) continue;
      out.push({
        kind: 'behind with the run nearly over',
        lines: [`${quote(t.name)}: at ${fmt(t.count)} of ${fmt(t.target as number)}, ${share}%, with ${input.sessionsLeft === 0 ? 'no check-in' : 'one check-in'} left after this one.`],
        marks: [String(t.count), String(t.target)],
      });
      break;
    }
  }

  /* 4. WHAT IT WAS FOR HAS GONE QUIET. The first session's definition of success, against everything
        reported since. Only from session two on, and only when there IS something reported since. */
  if (input.thisSession >= 2) {
    const firstFor = said.filter((s) => s.type === 'SUCCESS_DEFINITION' && s.session === 1);
    const since = said.filter((s) => s.session >= 2 && /^(PROGRESS|INTENT|COMMITMENT)$/.test(s.type));
    if (firstFor.length && since.length) {
      const sinceWords = new Set(since.flatMap((s) => [...wordsOf(s.text)]));
      /* A PURPOSE THAT IS A NUMBER IS BEING COUNTED, NOT FORGOTTEN. "My target for Q3 is N10m" followed by
         "Greenfield was N8m" shares no word and is the same thing being reported (smoke run 7, 21 Sep 2026). */
      const sinceHasANumber = since.some((s) => /\d/.test(s.text));
      const quiet = firstFor.find((f) => {
        if (sinceHasANumber && numbersWithUnits(f.text).some((n) => n.unit === 'money' || n.unit === 'percent')) return false;
        const w = [...wordsOf(f.text)];
        /* Three content words at least: "to keep them healthy" was quoted back to Halima as what the loan was
           for, twice (run 7). A fragment is not a purpose to hold anyone to. */
        return w.length >= 3 && !w.some((x) => sinceWords.has(x));
      });
      if (quiet) {
        out.push({
          kind: 'what it was for has gone quiet',
          lines: [
            `What they said this was for, session 1: ${quote(quiet.text)}.`,
            `What they have reported since: ${since.slice(-3).map((s) => quote(s.text)).join('; ')}.`,
            'Nothing reported since mentions the thing it was for.',
          ],
          marks: [...wordsOf(quiet.text)].slice(0, 3),
        });
      }
    }
  }

  /*
   * 5. COUNTING A DIFFERENT THING, which is the one the run of 24 September 2026 walked straight past.
   *
   * Four salespeople against a shared target of 40 approved credit facilities. Kwame said 22 in
   * every session and believed he was ahead; he was counting applications taken, not approvals. The
   * whole team had 11 approved. Nobody corrected him for three sessions, and the report read his 22
   * as pipeline like everybody else's.
   *
   * It is arithmetic, not a judgement: one person's own number for the shared thing is larger than
   * everything the check-in has recorded against it for EVERYBODY together. That cannot both be
   * true, and there is exactly one sensible question - which of the two is counting what.
   *
   * IT IS NOT AN ACCUSATION AND USUALLY NOT EVEN AN ERROR. The commonest cause is two honest
   * definitions of one word, which is the thing this product exists to find. The second commonest is
   * that the board's count is behind. Both are worth a question and neither is worth a conclusion.
   */
  const shared = input.targets.filter((t) => !t.yours && (t.target ?? 0) > 0);
  for (const target of shared) {
    const recorded = target.count ?? 0;
    if (recorded <= 0) continue;
    const words = wordsOfTarget(target.name);
    if (!words.length) continue;
    let found: { value: number; raw: string; line: string } | null = null;
    for (const line of [...input.said].reverse()) {
      if (line.session !== input.thisSession) continue;
      const text = line.text ?? '';
      /* Their sentence has to be about this target, not about some other number in their week. */
      if (!words.some((w) => text.toLowerCase().includes(w))) continue;
      /*
       * ONLY A COUNT OF THE SAME THING, AND NEVER THE TARGET SAID AGAIN (Hafsah's answer 7, 18 October; point 9). On Drop Access this
       * found "I'm aiming for 120 units." from Joseph and "The team target is still 120 units." from Grace (the team's 120, said
       * again), and "Kilele Hotel bought 40 units for KES 200,000" (shillings, not units), and the report made of it a difference
       * about how a sale is counted that nobody had. An aim is not a count, money is not units, and the target's own number is the
       * target. One customer's units are that deal's, not a count against the team's.
       */
      if (input.customers && theCustomerALineIsAbout(text, input.customers)) continue;
      /* Only on a sales check-in (customers given) for now, so every other check-in reads as it did (Release 1, part 3). */
      for (const n of numbersWithUnits(input.customers ? whatIsNotAnAimIn(text, true) : text)) {
        if (input.customers && (n.unit === 'money' || n.unit === 'percent')) continue;
        if (input.customers && target.target != null && n.value === target.target) continue;
        if (n.value > recorded && n.value > 1) { found = { value: n.value, raw: n.raw, line: text }; break; }
      }
      if (found) break;
    }
    if (!found) continue;
    out.push({
      kind: 'counting a different thing',
      lines: [
        `They said: ${quote(found.line)}.`,
        `The check-in's own count against ${quote(target.name)} is ${fmt(recorded)} for everybody together.`,
        `${fmt(found.value)} from one person is more than that, so the two are not counting the same thing.`,
      ],
      marks: [String(found.value), String(recorded)],
    });
    break;
  }

  return out;
}

/** Has any AI turn this session already carried this difference's marks? Then it has been put. */
export function alreadyPut(d: ADifference, aiTurns: string[]): boolean {
  const said = (aiTurns ?? []).join('\n').toLowerCase().replace(/,/g, '');
  const marks = d.marks.map((m) => m.toLowerCase().replace(/,/g, ''));
  if (marks.length < 2) return marks.length === 1 && said.includes(marks[0]);
  return marks.filter((m) => said.includes(m)).length >= 2;
}

/**
 * THE BLOCK. Facts, quoted, with the one instruction. Differences already put this session are
 * listed as put, so the next turn builds on the answer rather than raising it again.
 */
export function sayWhatDoesNotAddUp(input: WhatToCheck): string {
  const all = whatDoesNotAddUp(input);
  if (!all.length) return '';
  const put = all.filter((d) => alreadyPut(d, input.aiTurnsThisSession));
  const open = all.filter((d) => !put.includes(d));
  const lines: string[] = ['WHAT DOES NOT ADD UP, from this person\'s own record. The product found these; the words are theirs.'];
  if (open.length) {
    const first = open[0];
    lines.push(`PUT THIS ONE TO THEM THIS SESSION, once the current thread is done: ${first.kind}.`, ...first.lines.map((l) => `  ${l}`));
    lines.push(
      'Put both lines side by side in one plain sentence and ask which one stands now. A question, not a verdict; their words, not yours. Never the phrase "what happened between" - it went out five times in one run. If they explain it, take the explanation and let it go. Never raise a second one before this one is answered.',
    );
    for (const d of open.slice(1)) lines.push(`Also on record, for a later turn if this one is answered: ${d.kind} (${d.lines[0]})`);
  }
  if (put.length) {
    lines.push('ALREADY PUT TO THEM THIS SESSION - do not raise again; take whatever they said about it:', ...put.map((d) => `- ${d.kind}: ${d.lines[0]}`));
  }
  return lines.join('\n');
}
