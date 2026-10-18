/**
 * A PERSON CORRECTING THEMSELVES SETTLES IT (Drop Access short run, item 1).
 *
 * Mercy said on 13 October "That's 25 units, KES 120,000, in the bag." and on 14 October "I mistakenly said it was KES 120,000, but
 * it's actually KES 125,000." The team report then kept a difference, "The value of the signed deal with Greenfield Supermarket is
 * reported differently in the same week", with both sides Mercy's ("Mercy Wairimu first reported the Greenfield deal as 25 units for
 * KES 120,000."), and its judgement said "Ask Mercy Wairimu which of the two figures for the Greenfield Supermarket deal, KES 120,000
 * or KES 125,000, is the correct one." Grace's What needs you read "People in this check-in said different things", and Mercy's own
 * board "You first reported ...". Nobody said different things: Mercy corrected herself, and her correction is her latest word.
 *
 * FROM THE RECORD, IN CODE. A correction is a person's own line that says an earlier figure of theirs was wrong ("I mistakenly said",
 * "I said ... but it's actually", "I meant", "correction") and gives the right one. What it settles, wherever the report keeps it:
 *   - a difference whose every side is that one person, and which names the figure they corrected;
 *   - a line of the judgement (what to do, what the numbers say) that names the figure they corrected.
 * Nothing else is touched: their earlier words stay in the record as what they said.
 */

export interface ALineOnRecord {
  participantId: string | null;
  text: string;
  createdAt?: Date | string | null;
}

export interface ACorrection {
  participantId: string;
  /** The figures they said were wrong, as numbers ("KES 120,000" is 120000). */
  wrong: number[];
  /** The figures they gave in their place. */
  right: number[];
  text: string;
}

const SAYS_IT_WAS_WRONG = /\b(?:mistakenly|wrongly|accidentally|by mistake|incorrectly)\s+(?:said|told|gave|put|wrote|reported)\b|\bI\s+(?:said|told you|gave|reported)\b[^.?!]*?\b(?:but|when)\b[^.?!]*?\b(?:actually|really|in fact)\b|\bI\s+meant\b|\bcorrection\b|\bthat\s+was\s+wrong\b|\bnot\s+(?:KES|KSh|Ksh|NGN|USD|\$|₦)?\s?\d[\d,]*(?:\.\d+)?\s*,?\s*(?:it['’]s|but|it\s+is)\b/i;
const THE_TURN = /\b(?:but|actually|really|in fact|I\s+meant|it['’]s|it\s+is|instead)\b/i;
/** The figures in a stretch of words: "KES 120,000", "120000", "25 units". Only figures of three digits or more, or with a currency. */
export function theFiguresIn(text: string): number[] {
  const out: number[] = [];
  for (const m of String(text ?? '').matchAll(/(?:(KES|KSh|Ksh|NGN|USD|\$|₦)\s?)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(k|m)?\b/gi)) {
    let n = Number(m[2].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    if (m[3]?.toLowerCase() === 'k') n *= 1000;
    if (m[3]?.toLowerCase() === 'm') n *= 1_000_000;
    if (m[1] || n >= 100) out.push(n);
  }
  return out;
}

/** Each correction a person made of a figure of their own, from their lines on record. */
export function theCorrectionsOnRecord(lines: readonly ALineOnRecord[]): ACorrection[] {
  const out: ACorrection[] = [];
  for (const l of lines) {
    if (!l.participantId) continue;
    const t = String(l.text ?? '');
    for (const sentence of t.split(/(?<=[.!?])\s+/)) {
      if (!SAYS_IT_WAS_WRONG.test(sentence)) continue;
      const turn = THE_TURN.exec(sentence.replace(/^[^]*?\b(?:said|told you|gave|reported|not)\b/i, (m) => ' '.repeat(m.length)));
      if (!turn) continue;
      const wrong = theFiguresIn(sentence.slice(0, turn.index));
      const right = theFiguresIn(sentence.slice(turn.index));
      if (!wrong.length || !right.length) continue;
      const w = wrong.filter((n) => !right.includes(n));
      if (w.length) out.push({ participantId: l.participantId, wrong: w, right, text: sentence.trim() });
    }
  }
  return out;
}

const everyText = (v: unknown, acc: string[] = []): string[] => {
  if (typeof v === 'string') acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyText(x, acc));
  else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach((x) => everyText(x, acc));
  return acc;
};
const namesAFigure = (v: unknown, figures: readonly number[]) => figures.some((f) => everyText(v).some((t) => theFiguresIn(t).includes(f)));

/**
 * Whether a difference is only somebody's correction of themselves: every side is the same person (`whoIs` reads a side's label as
 * their row), they corrected a figure, and the difference names it.
 */
export function isOnlyACorrection(d: any, corrections: readonly ACorrection[], whoIs: (label: string) => string | null): boolean {
  const sides: any[] = Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : [];
  if (!sides.length) return false;
  const who = [...new Set(sides.map((s) => whoIs(String(s?.participantLabel ?? s?.who ?? '').trim())))];
  if (who.length !== 1 || !who[0]) return false;
  const theirs = corrections.filter((c) => c.participantId === who[0]);
  return theirs.some((c) => namesAFigure(d, c.wrong));
}

/**
 * The report's parts with what a correction settled left out: the differences that are only a correction, the judgement's lines that
 * name a corrected figure, and the question or focus drawn from a difference that went. Returns what it left out, for the log.
 */
export function withWhatACorrectionSettled<R extends Record<string, any>>(
  report: R,
  corrections: readonly ACorrection[],
  whoIs: (label: string) => string | null,
): { report: R; leftOut: string[] } {
  if (!corrections.length || !report) return { report, leftOut: [] };
  const out: any = { ...report };
  const leftOut: string[] = [];
  const wrong = [...new Set(corrections.flatMap((c) => c.wrong))];
  if (Array.isArray(out.divergences)) {
    const gone = (out.divergences as any[]).filter((d) => isOnlyACorrection(d, corrections, whoIs));
    if (gone.length) {
      out.divergences = (out.divergences as any[]).filter((d) => !gone.includes(d));
      const topics = gone.map((d) => String(d?.topic ?? '').trim().replace(/[.!?]+$/, '')).filter(Boolean);
      leftOut.push(...topics.map((t) => `difference: ${t}`));
      if (typeof out.centralQuestion === 'string' && topics.some((t) => out.centralQuestion.includes(t))) out.centralQuestion = null;
      if (out.engagement && Array.isArray(out.engagement.session2Focus)) {
        out.engagement = { ...out.engagement, session2Focus: out.engagement.session2Focus.filter((f: string) => !topics.some((t) => String(f ?? '').includes(t))) };
      }
    }
  }
  const j = out.theJudgement && typeof out.theJudgement === 'object' ? { ...out.theJudgement } : null;
  if (j) {
    for (const k of ['whatToDo', 'whatTheNumbersSay']) {
      if (!Array.isArray(j[k])) continue;
      const kept = (j[k] as any[]).filter((x) => !namesAFigure(x, wrong));
      if (kept.length !== j[k].length) leftOut.push(...(j[k] as any[]).filter((x) => !kept.includes(x)).map((x) => `judgement: ${String(x?.move ?? x?.says ?? '').slice(0, 80)}`));
      j[k] = kept;
    }
    out.theJudgement = j;
  }
  return { report: out as R, leftOut };
}

/**
 * The corrections on a check-in, read from each person's own words: their lines on record and their own answers in their own
 * check-ins (the record keeps "It's actually KES 125,000." where they said "I mistakenly said it was KES 120,000, but it's actually
 * KES 125,000."). Read only, to leave out what a correction settled; nothing of them is served.
 */
export async function theCorrectionsOnTheCheckIn(prisma: any, groundId: string): Promise<ACorrection[]> {
  const read = <T,>(p: Promise<T> | undefined, fallback: T): Promise<T> => Promise.resolve(p ?? fallback).catch(() => fallback);
  const [lines, turns] = await Promise.all([
    read(prisma?.recordEntry?.findMany?.({ where: { disputedAt: null, participant: { groundId } }, select: { participantId: true, text: true, createdAt: true } }), [] as any[]),
    read(prisma?.conversationTurn?.findMany?.({ where: { role: 'PERSON', checkIn: { groundId } }, select: { content: true, createdAt: true, checkIn: { select: { participantId: true } } } }), [] as any[]),
  ]);
  return theCorrectionsOnRecord([
    ...((lines ?? []) as any[]).map((l) => ({ participantId: l.participantId ?? null, text: String(l.text ?? ''), createdAt: l.createdAt })),
    ...((turns ?? []) as any[]).map((t) => ({ participantId: t.checkIn?.participantId ?? null, text: String(t.content ?? ''), createdAt: t.createdAt })),
  ]);
}

/**
 * Who is behind a side's label: a stored label ("Participant B", "the initiator"), or a name where the report was served with names
 * ("Mercy Wairimu", "Mercy"). Null where nobody is.
 */
export function whoIsBehindALabel(participants: readonly any[], labelOf: Map<string, string>): (label: string) => string | null {
  return (label: string) => {
    const n = String(label ?? '').trim().toLowerCase();
    if (!n) return null;
    for (const [pid, l] of labelOf.entries()) if (String(l ?? '').trim().toLowerCase() === n) return pid;
    const p = (participants ?? []).find((x: any) => {
      const full = [x.user?.firstName, x.user?.lastName].filter(Boolean).join(' ').trim().toLowerCase();
      return (full && full === n) || (x.user?.firstName ?? '').trim().toLowerCase() === n || (x.nameGiven ?? '').trim().toLowerCase() === n;
    });
    if (p) return p.id;
    if (/^(?:the\s+)?(?:initiator|lead)$/.test(n)) return (participants ?? []).find((x: any) => x.partyType === 'INITIATOR')?.id ?? null;
    return null;
  };
}
