/**
 * FOR YOU TO DO NEXT WEEK, AS PICTURED (weekly-report.jpg and every check-in's weekly report): three things, each from a
 * different place ("This comes from a disagreement in the team.", "This comes from a blocker.", "This comes from the
 * plan."), in the order the server serves them. Where fewer places have anything, the next ones fill the three. Every
 * item is still on the report as it was (?whole=1) and on Today.
 */
export function threeFromDifferentPlaces<T extends { comesFrom?: string | null }>(rows: T[]): T[] {
  const picked: T[] = []
  const places = new Set<string>()
  for (const r of rows) if (picked.length < 3 && !places.has(String(r.comesFrom ?? ''))) { picked.push(r); places.add(String(r.comesFrom ?? '')) }
  for (const r of rows) if (picked.length < 3 && !picked.includes(r)) picked.push(r)
  return rows.filter((r) => picked.includes(r))
}
