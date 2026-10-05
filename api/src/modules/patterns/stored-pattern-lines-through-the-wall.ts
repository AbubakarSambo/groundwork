import { PATTERN_ROW_SELECT, patternRowsThisReaderMayRead, type APatternRow } from './who-reads-a-pattern';
import { oldWordingPutPlain } from '../reports/a-stored-sentence-reads-right';

/**
 * THE PATTERN LINES KEPT IN THE RECORD OVER TIME, SERVED THROUGH DECISION 86'S WALL (6 October 2026; Hafsah to confirm).
 *
 * The live line shows the lead the pattern lines stored in the record over time ("Upward reporting was optimistic while a major
 * account was being lost."). This release stopped serving them on 27 September, because the stored text was written at synthesis,
 * before the person it is about had read anything. Leads of existing check-ins lost 288 lines on 81 check-ins.
 *
 * A stored line is served again only when the live pattern it was written for may be read by this reader right now: the same row,
 * the same three periods, and decision 86's turn for the person (they answered, or three days after they were shown it, or seven
 * days after it was ready). A stored line with no live row behind it is not served, because nothing says the person has had their
 * turn. Only whoever runs the check-in reads any of it; a participant never reads a line about a colleague, and an admin who only
 * reads gets none. A pattern about the reader is not in the lead's list: it is theirs, on their own page.
 */
export function withTheStoredPatternLinesThroughTheWall<T extends { patterns?: any[] } | null | undefined>(
  overTime: T,
  rows: readonly APatternRow[] | null | undefined,
  reader: { participantId: string | null; runsIt: boolean },
  opts: { now?: Date; storedPatterns?: any[] | null } = {},
): T {
  if (!overTime) return overTime;
  if (!reader.runsIt) return { ...(overTime as any), patterns: [] };
  const stored: any[] = Array.isArray(opts.storedPatterns) ? opts.storedPatterns : Array.isArray((overTime as any).patterns) ? (overTime as any).patterns : [];
  if (!stored.length) return overTime;
  const mayRead = patternRowsThisReaderMayRead(rows, { participantId: reader.participantId, runsIt: true }, { now: opts.now });
  const ok = new Set(mayRead.filter((r) => !reader.participantId || r.participantId !== reader.participantId).map((r) => `${r.participantId}|${r.code}`));
  const kept = stored
    .filter((p) => p && typeof p.observation === 'string' && p.observation.trim() && ok.has(`${p.participantId}|${p.code}`))
    .map((p) => ({ ...p, observation: oldWordingPutPlain(p.observation), say: typeof p.say === 'string' ? oldWordingPutPlain(p.say) : p.say }));
  return { ...(overTime as any), patterns: kept };
}

/** Reads the live rows for this check-in and applies the wall. A lookup that fails serves none of them. */
export async function theStoredPatternLinesFor<T extends { patterns?: any[] } | null | undefined>(
  prisma: any,
  groundId: string,
  overTime: T,
  reader: { participantId: string | null; runsIt: boolean },
  /* The report's row as stored: what is served has had its patterns taken out already (overTimeAsServed), so they come from here. */
  storedOverTime?: { patterns?: any[] } | null,
): Promise<T> {
  const storedPatterns = Array.isArray(storedOverTime?.patterns) ? storedOverTime!.patterns! : Array.isArray((overTime as any)?.patterns) ? (overTime as any).patterns : [];
  if (!overTime) return overTime;
  if (!reader.runsIt) return { ...(overTime as any), patterns: [] };
  if (!storedPatterns.length) return overTime;
  const rows: any[] = await Promise.resolve(prisma?.patternDetection?.findMany?.({ where: { groundId }, select: PATTERN_ROW_SELECT, take: 200 })).then((r) => (Array.isArray(r) ? r : [])).catch(() => []);
  return withTheStoredPatternLinesThroughTheWall(overTime, rows as any, reader, { storedPatterns });
}
