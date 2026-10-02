/**
 * WHAT THE RECORD SAYS A TARGET IS AT, READ BY THE THING THAT CAN READ.
 *
 * The board has had the screen for this all along - "The record shows 40 for this, not 0. Use 40",
 * with a press to accept it - and the rule behind it never once fired.
 *
 * The rule required every word of the target's name longer than three letters to appear in a single
 * entry, with trailing esses stripped, AND a verb from a list of nine: signed, closed, paying, live,
 * onboarded, delivered, shipped, joined, confirmed. Then it suggested the NUMBER OF MATCHING
 * ENTRIES rather than the number the person said.
 *
 * Run against a real quarter, with a target of "Teams migrated: 40" and a team who reported
 * "Nine of the forty teams are migrated" and later "All forty migrated by Friday", the board read
 * 0 of 40 at the close. The first sentence has no listed verb; the second has no "team". Zero of
 * fourteen entries matched, and the lead's central question - are we tracking - was answered wrong.
 *
 * WHICH SENTENCE REPORTS A NUMBER AGAINST WHICH TARGET IS A READING, and this codebase has now
 * learnt the same lesson three times in one day: a word list cannot read English, and the repair is
 * never a longer list. So the model reads it and the code uses the answer.
 *
 * THE EXAMPLES IN THE PROMPT ARE DELIBERATELY NOT THE SENTENCES IT IS CHECKED ON. The first pass
 * used the run's own lines as the examples, so the check was partly asking the model to copy the
 * prompt back. Different words, same shapes.
 *
 * WHAT DOES NOT CHANGE. The board never silently overwrites what a person set. This produces a
 * suggestion, beside their number, with the sentence it came from so they can see what they are
 * accepting; the lead presses to take it. That rule was right when it was written and it stays.
 */

export interface ATarget {
  id: string;
  name: string;
  target: number | null;
  count: number;
  /** Whose the target is; null is the team's. Used to decide where a total said once belongs. */
  ownerParticipantId?: string | null;
}

export interface SomethingSaid {
  text: string;
  /** Whose line it is, for the prompt's benefit only; nothing here is about the person. */
  who: string | null;
}

export interface AReadNumber {
  objectiveId: string;
  count: number;
  said: string;
}

/** One line as given to the model: who said it decides whether the read lands or is offered. */
export interface ALineOnRecord {
  text: string;
  /** Who said it, where the caller knows: a line read against somebody else's own target is dropped. */
  who?: string | null;
  saidByTheLead: boolean;
  /** What kind of line it is, where the caller knows ("SUCCESS_DEFINITION", "PROGRESS"...). */
  kind?: string | null;
}

const plain = (t: string) => (t ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * THE LINE HAS TO BE ONE SOMEBODY SAID. A sales board carried "We are at N80m" and "Delivered N80m of
 * a N90m target" when nobody in any session had said 80 (adversarial run, 20 Sep 2026): the model
 * produced a line and a number together. A read whose quoted line is not in the record is dropped,
 * and so is a read whose number does not appear in the line it claims to come from.
 */
export function theLineWasSaid(said: string, lines: ALineOnRecord[]): ALineOnRecord | null {
  const s = plain(said);
  if (!s) return null;
  return lines.find((l) => { const t = plain(l.text); return t.includes(s) || s.includes(t); }) ?? null;
}

const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE: Record<string, number> = { k: 1_000, thousand: 1_000, m: 1_000_000, million: 1_000_000, bn: 1_000_000_000, billion: 1_000_000_000, hundred: 100 };

/** Every number a line mentions, as digits or as words, with k/m/million folded in. */
export function numbersIn(said: string): Set<number> {
  const out = new Set<number>();
  const text = (said ?? '').toLowerCase();
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k|m|bn|million|thousand|billion)?\b/g)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    out.add(n);
    if (m[2]) out.add(Math.round(n * SCALE[m[2]]));
  }
  /* Words: "forty", "thirty-eight", "two hundred", "eighty million". */
  const words = text.replace(/-/g, ' ').split(/[^a-z]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    if (!(words[i] in SMALL)) continue;
    let n = SMALL[words[i]];
    let j = i + 1;
    if (j < words.length && words[j] in SMALL && SMALL[words[j]] < 10 && n >= 20) { n += SMALL[words[j]]; j++; }
    out.add(n);
    if (j < words.length && words[j] in SCALE) out.add(n * SCALE[words[j]]);
  }
  return out;
}

export function theNumberIsInTheLine(count: number, said: string): boolean {
  return numbersIn(said).has(count);
}

export const WHAT_THE_RECORD_SAYS_PROMPT = `You are reading a team's own words for the current value of the numbers their lead is tracking.

You will be given the targets, each with a name and the number the lead currently has recorded, and the lines people said in this round.

Work through the targets ONE AT A TIME, in the order given, and decide each one before moving to the next. Answer for every target somebody reported a number against: two targets reported means two answers, and stopping after the first is the commonest way to get this wrong.

A line does not have to repeat the target's name. "All forty are done" against a target called "Sites onboarded, target 40" is that target at 40 - the number and the target's own total are the match.

Where a later line supersedes an earlier one, take the later.

For each, give the number the line reports the target is AT NOW.

- "we closed the last three, so all twelve are signed" against "Contracts signed" is 12 - the total reached, not the three.
- "seven of the thirty are onboarded" against "Sites onboarded" is 7 - what is done, never the target.
- "we're at just over 4,000 users" against "Paying users" is 4000.
- "I want us at fifty by March" is a hope, not a count. Do not read a number from it.
- "support handled nine tickets" against "Sites onboarded" is about tickets. Do not force a match.
- "credit is running at 52% of sales" against "Credit sales under 35%" is 52 - a rate is reported as its percentage, whatever the target says it should be under.
- "we are three weeks late on the audit" against "Arrears under 8%" is about time, not the rate. Do not force a match.

Only where a line genuinely reports the current value of that target. Where nothing does, leave the target out. An empty answer is a correct answer, and a wrong number is worse than none - a lead is being asked to accept this.

Give back, for each target you can answer: its id, the number, and the exact line you read it from.`;

export const WHAT_THE_RECORD_SAYS_SCHEMA = {
  name: 'emit_numbers_the_record_reports',
  description: 'Emit the current value each target is reported at, and the line it was read from.',
  input_schema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            objectiveId: { type: 'string', description: 'The id of the target this is the value of.' },
            count: { type: 'number', description: 'The number the record reports it is at now.' },
            said: { type: 'string', description: 'The exact line it was read from.' },
          },
          required: ['objectiveId', 'count', 'said'],
        },
      },
    },
    required: ['numbers'],
  },
};

/** The targets and the lines, as the model is given them. */
export function theQuestion(targets: ATarget[], said: SomethingSaid[]): string {
  return (
    'TARGETS\n'
    + targets.map((t) => `- id ${t.id}: "${t.name}"${t.target != null ? `, target ${t.target}` : ''}, currently recorded as ${t.count}`).join('\n')
    + '\n\nWHAT PEOPLE SAID THIS ROUND\n'
    + said.map((s) => `- ${s.text}`).join('\n')
  );
}

/**
 * WHAT SURVIVES THE READ.
 *
 * A suggestion the lead is asked to accept has to clear a low bar honestly: a real number, a target
 * that exists, and something different from what they already have. The last one matters most - the
 * screen says "the record shows X, not Y", and offering to change 40 to 40 is a prompt about
 * nothing that trains somebody to ignore the next one.
 */
/**
 * THE AIM, SAID, IS NOT A COUNT OF IT (screens request 65).
 *
 * Read on a live board: the objective "I want us to sign 12 shops by 20 December." was counted
 * "12 of 12" while two shops were signed. The lead's own sentence setting the aim is on the record,
 * it holds the target's number, and the lead's number on a target nobody has counted lands as the
 * count. So a line that gives exactly the target, as something wanted or planned, with nothing in it
 * saying it has happened, is the target being stated, and it is not read as where things stand.
 * "We have signed all 12" still lands.
 */
const STATES_THE_AIM = /\b(?:want|wants|aim|aiming|target|goal|plan|plans|planning|hope|intend|should|need to|needs to|going to|will|by the end|to reach|to get to)\b/i;
const SAYS_IT_HAPPENED = /\b(?:have|has|had|reached|hit|got|are at|is at|we're at|stands at|so far|already|done|now at|signed|closed|made)\b/i;
/*
 * AND "TWELVE SIGNED SUPPLY CONTRACTS" SAYS WHAT IS COUNTED, NOT THAT IT HAPPENED (screens requests 109 a
 * and 111 b). Read on the sales board, 2 October 2026: "Rukia Otieno wants us to sign 12 shops by 20
 * December. 12 now, up from 0. The aim is 12.", with two shops signed. The lead's line was "Twelve signed
 * supply contracts ... and I want us to sign 12 shops.": the aim, said twice. "signed" there sits between
 * the number and the thing, as a word describing the thing, and it was read as the shops having been
 * signed, so the aim landed as the count. A word like that, right after a number, describes; it is taken
 * out before asking whether the line says something happened.
 */
const A_NUMBER_WORD = String.raw`(?:\d[\d,]*|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)`;
const DESCRIBES_THE_THING = new RegExp(String.raw`\b(${A_NUMBER_WORD})\s+(?:signed|closed|made|done|reached)\s+(?=[a-z])`, 'gi');

export function theLineIsTheAim(count: number, target: { target: number | null }, said: string, kind?: string | null): boolean {
  if (target.target == null || count !== target.target) return false;
  /* A line saying what success looks like is the aim, whatever its verbs: it never reports where things stand. */
  if (String(kind ?? '').toUpperCase() === 'SUCCESS_DEFINITION') return true;
  const text = (said ?? '').replace(DESCRIBES_THE_THING, '$1 ');
  if (!STATES_THE_AIM.test(text)) return false;
  /* "signed" as an achievement, not "to sign": the infinitive is the aim. */
  const withoutTheAim = text.replace(/\bto\s+[a-z]+/gi, ' ');
  return !SAYS_IT_HAPPENED.test(withoutTheAim);
}

export function onlyWhatIsWorthOffering(read: AReadNumber[], targets: ATarget[], lines?: ALineOnRecord[]): AReadNumber[] {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const seen = new Set<string>();
  return read.filter((r) => {
    const t = byId.get(r.objectiveId);
    if (!t) return false;
    if (!Number.isFinite(r.count) || !Number.isInteger(r.count) || r.count < 0) return false;
    if (r.count === t.count) return false;
    if (!r.said?.trim()) return false;
    if (lines && !theLineWasSaid(r.said, lines)) return false;
    if (!theNumberIsInTheLine(r.count, r.said)) return false;
    /* The target said as an aim is not a count of it (request 65). See theLineIsTheAim. */
    if (theLineIsTheAim(r.count, t, r.said, lines ? theLineWasSaid(r.said, lines)?.kind : null)) return false;
    /*
     * ONE PERSON'S LINE DOES NOT COUNT AGAINST ANOTHER PERSON'S OWN TARGET. Rerun, 20 Sep 2026:
     * Dayo's "I hit N26m" was offered on Emeka's N35m. A target with somebody's name on it takes
     * a number from that person or from the lead; anybody else's line about it is a read of the
     * wrong row.
     */
    if (lines) {
      const line = theLineWasSaid(r.said, lines);
      const owner = (t as any).ownerParticipantId as string | null | undefined;
      if (owner && line && line.who && line.who !== owner && !line.saidByTheLead) return false;
    }
    /* One suggestion per target: two readings of the same number is a choice nobody asked for. */
    if (seen.has(r.objectiveId)) return false;
    seen.add(r.objectiveId);
    return true;
  });
}

/**
 * ONE NUMBER, SAID ONCE, LANDS ONCE. Rerun, 20 Sep 2026: the manager said "we are at N71m" and the
 * model read it against four targets - the team's N180m, "hit N180m", Chika's N60m and Dayo's N50m -
 * so two reps' boards showed the whole team's total as their own count. A figure somebody said is
 * one fact about one thing. Where the same line and the same count were read against several
 * targets, the one it belongs to is the one with nobody's name on it (a total is the team's), and
 * of those the biggest; the reads against the others are dropped, not offered.
 */
export function oneNumberLandsOnce(read: AReadNumber[], targets: ATarget[]): AReadNumber[] {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const groups = new Map<string, AReadNumber[]>();
  for (const r of read) {
    const k = `${r.count}|${(r.said ?? '').trim().toLowerCase()}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const keep = new Set<AReadNumber>();
  for (const rs of groups.values()) {
    if (rs.length === 1) { keep.add(rs[0]); continue; }
    const ranked = [...rs].sort((a, b) => {
      const ta = byId.get(a.objectiveId) as any, tb = byId.get(b.objectiveId) as any;
      const ownedA = ta?.ownerParticipantId ? 1 : 0, ownedB = tb?.ownerParticipantId ? 1 : 0;
      if (ownedA !== ownedB) return ownedA - ownedB;
      return (tb?.target ?? 0) - (ta?.target ?? 0);
    });
    keep.add(ranked[0]);
  }
  return read.filter((r) => keep.has(r));
}

/**
 * WHOSE READ LANDS AND WHOSE IS OFFERED. A number the LEAD said about a target nobody has yet
 * counted is the count: offering the lead their own sentence to accept is a prompt about nothing,
 * and while it sat unaccepted the board read "N180m: 0 now" under a manager who had said N102m
 * (adversarial run, 20 Sep 2026). A number somebody else said stays a suggestion, as before, and a
 * count somebody set by hand is never overwritten from here.
 */
export function whatToDoWithTheRead(r: AReadNumber, target: ATarget, lines: ALineOnRecord[]): 'land' | 'offer' {
  const line = theLineWasSaid(r.said, lines);
  const neverCounted = target.count === 0 && (target as any).prevCount === 0;
  /*
   * AND A COUNT THE LEAD'S OWN WORDS PUT THERE IS THE LEAD'S TO CORRECT. "We are at N71m" landed in
   * session 2; "that was a mistake, we are at N102m" in session 3 sat as an offer under a board still
   * reading 71 (rerun, 20 Sep 2026). A landed read leaves suggestedSaid set with no suggestedCount;
   * that is the mark that nobody typed this count by hand, so the lead's next number lands too.
   */
  const landedFromTheLead = (target as any).suggestedCount == null && !!(target as any).suggestedSaid && target.count > 0;
  return line?.saidByTheLead && (neverCounted || landedFromTheLead) ? 'land' : 'offer';
}
