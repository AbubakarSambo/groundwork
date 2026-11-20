/**
 * THE SHAPE OF A LONG LIST, IN ONE PLAIN SENTENCE (board assessment, 15 November). A table cut after its first rows still has to say what
 * the whole list is. Counted from the rows alone: how many, how many have a document behind them, and where they stand by stage.
 * Nothing is invented: a row with no stage is not counted in one.
 */
type Row = { mark?: string; stage?: string | null }

export function theShapeOfTheRecords(rows: readonly Row[], many: string): string {
  const proven = rows.filter((r) => r.mark === 'proven').length
  const byStage = new Map<string, number>()
  for (const r of rows) if (r.stage) byStage.set(r.stage, (byStage.get(r.stage) ?? 0) + 1)
  const stages = [...byStage.entries()].sort((a, z) => z[1] - a[1]).slice(0, 4).map(([s, n]) => `${n.toLocaleString('en-GB')} at ${s}`)
  const proof = proven === 0 ? 'None has a document behind it.' : proven === rows.length ? 'Each has a document behind it.' : `${proven.toLocaleString('en-GB')} ${proven === 1 ? 'has' : 'have'} a document behind it.`
  return `There are ${rows.length.toLocaleString('en-GB')} ${many} on record. ${proof}${stages.length > 1 ? ` The most common stages are ${stages.slice(0, -1).join(', ')} and ${stages[stages.length - 1]}.` : stages.length ? ` The most common stage is ${stages[0]}.` : ''}`
}
