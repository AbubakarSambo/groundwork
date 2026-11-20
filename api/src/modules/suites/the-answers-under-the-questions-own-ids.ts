import type { Answers, Suite } from './the-ten-suites';

/**
 * A SUITE'S SETTINGS ARE KEPT AND SERVED UNDER THE QUESTIONS' OWN IDS (B-124, request 180 item 7).
 *
 * Some organisations' settings were stored under other names than the suite's questions: leave kept `daysAYear` where the question is `days`, and
 * `approver` as a person's id where the question is a choice between "Their manager" and "An admin". The settings form could not read them, so it
 * refused to open ("These settings were set up another way, so they cannot be changed here yet."), and an admin could not set the days of leave a
 * year, the review frequency or a budget.
 *
 * This reads each question's answer from its own id first, then from the names it was kept under before, and gives back every question's id.
 * A question nothing answers is given as an empty string, so the form opens, shows it empty, and asks for it. Nothing stored is thrown away:
 * the old names stay in the row until the admin saves, and what she saves is written under the questions' ids.
 */
const THE_OLD_NAMES: Record<string, Record<string, string[]>> = {
  leave: { days: ['daysAYear', 'daysPerYear', 'perYear', 'days_a_year'] },
  time: { clients: ['projects'] },
  reviews: { every: ['cadence', 'frequency', 'howOften'], writer: ['approver', 'reviewer', 'writtenBy'] },
  spend: { currency: ['currencyCode'], limit: ['managerLimit', 'approvalLimit', 'threshold'], above: ['approver', 'headApprover', 'approverAbove'] },
};

/** Every key a suite's answers may have been kept under before the questions' ids, so a save can drop what it has now replaced. */
export function theOldNamesOf(suiteKey: string): string[] {
  return Object.values(THE_OLD_NAMES[suiteKey] ?? {}).flat();
}

function firstSet(raw: Record<string, unknown>, names: string[]): unknown {
  for (const n of names) if (raw[n] !== undefined && raw[n] !== null && raw[n] !== '') return raw[n];
  return undefined;
}

export function answersUnderTheQuestionsOwnIds(
  suite: Suite,
  stored: unknown,
  /** Who in the organisation is an admin, so a person kept as the approver reads as "An admin", and anybody else as "Their manager". */
  adminIds: ReadonlySet<string> = new Set(),
): Answers {
  const raw = (stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}) as Record<string, unknown>;
  if (!Object.keys(raw).length || !suite.questions.length) return raw as Answers;
  const out: Answers = {};
  for (const q of suite.questions) {
    const own = raw[q.id];
    const v = own !== undefined && own !== null && own !== '' ? own : firstSet(raw, THE_OLD_NAMES[suite.key]?.[q.id] ?? []);
    if (q.kind === 'number') {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      out[q.id] = typeof n === 'number' && Number.isFinite(n) ? n : '';
    } else if (q.kind === 'choice') {
      if (typeof v === 'string' && q.options.includes(v)) out[q.id] = v;
      else if (typeof v === 'string' && v.trim()) {
        const s = v.trim().toLowerCase();
        /* A person kept as the one who approves reads as "An admin" when she is one; anybody else is left for the admin to choose, because no choice here says it. */
        const byWords = q.options.find((o) => o.toLowerCase() === s)
          ?? (q.id === 'every' ? (/12|twelve|year|annual/.test(s) ? 'Every 12 months' : /6|six|half/.test(s) ? 'Every 6 months' : undefined) : undefined)
          ?? (q.options.includes('An admin') ? (adminIds.has(v) || /admin/.test(s) ? 'An admin' : undefined) : undefined);
        out[q.id] = byWords ?? '';
      } else out[q.id] = '';
    } else if (q.kind === 'lines') {
      const lines = (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).filter((x): x is string => typeof x === 'string' && !!x.trim());
      out[q.id] = lines.length ? lines : '';
    } else {
      out[q.id] = typeof v === 'string' ? v : '';
    }
  }
  /* Whatever else the row holds is kept as it is. */
  for (const [k, v] of Object.entries(raw)) if (!(k in out) && !theOldNamesOf(suite.key).includes(k)) out[k] = v as never;
  return out;
}
