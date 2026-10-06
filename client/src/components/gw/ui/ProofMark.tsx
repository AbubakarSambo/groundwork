import { MARK_WORDS, readMark } from '@/components/gw/the-mark'
import './gw-ui.css'

/**
 * PROOF MARK (prototype: the small dot before a noticed line, `.mk`/`.mk-proven` etc., app.css).
 *
 * Brought over from kit.tsx's `Mark` (a different thing from this kit's own `Mark`, the Groundwork
 * wordmark - renamed `ProofMark` here so the two are never confused). A 14px dot that says how
 * something is known: proven, confirmed by the person it is about, only said, a memory, or none -
 * never a score or a judgement on the person, only on the claim.
 */
export function ProofMark({ mark, large }: { mark: unknown; large?: boolean }) {
  const kind = readMark(mark)
  if (!kind) return null
  return (
    <span
      className={`gwui-mk gwui-mk-${kind}${large ? ' gwui-mk-lg' : ''}`}
      role="img"
      aria-label={MARK_WORDS[kind]}
      title={MARK_WORDS[kind]}
    />
  )
}
