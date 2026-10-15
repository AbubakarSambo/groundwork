/**
 * The words and the reading of a mark, kept out of kit.tsx so that file only exports components.
 * See `Mark` in kit.tsx for what a mark is.
 */
export type MarkKind = 'proven' | 'confirmed' | 'said' | 'memory' | 'none'
export const MARK_WORDS: Record<MarkKind, string> = {
  proven: 'Proven',
  confirmed: 'Confirmed by the person who received it',
  said: 'Only someone’s word',
  memory: 'From memory only',
  none: 'Not reached',
}
const MARK_KINDS = Object.keys(MARK_WORDS) as MarkKind[]
/** Accepts the engine's names as well as these, and nothing else. Unknown or empty is no mark. */
export function readMark(value: unknown): MarkKind | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'not_reached' || v === 'not reached') return 'none'
  return (MARK_KINDS as string[]).includes(v) ? (v as MarkKind) : null
}
