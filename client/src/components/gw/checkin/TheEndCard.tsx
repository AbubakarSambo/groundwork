import { Button } from '@/components/gw/ui/Button'
import { ProofMark } from '@/components/gw/ui/ProofMark'
import '@/components/gw/ui/gw-ui.css'
import type { TheEndCard as EngineEndCard } from '@/api/conversation'
import { THATS_NOT_RIGHT } from '@/components/gw/ThatsNotRight'

/**
 * THE END CARD (B3, check-in-end-card.txt), cut down by Hafsah's ruling on the audit of the check-in pages (15 November 2026).
 *
 * Groundwork's last message ("That’s all for today. Below is what I wrote down from your answers. Is anything wrong?") is the
 * engine's and sits above this. Under it:
 *
 *   What goes in your record    one short list, each line with its mark and its one-line source. Only the engine writes these.
 *   Your next check-in opens …  one line, from the schedule
 *   What happens next           the engine's own lines, when it has any
 *   one sentence, only where nobody else answers, that the lead reads what you said (the lone-participant fix, 8 October)
 *
 * Gone: the fold "Why answering matters, and what happens next", its reassurance line, and the two other variants of the line
 * about who sees what you said. Who sees it is the backend's rule and is not explained here.
 *
 * "That’s right, finish" is the one press that finishes. "That’s not right" on a line goes back to the conversation with that line
 * quoted in the answer box, where the person says what is wrong in their own words, and the check-in checks the correction like
 * any claim before the card comes back.
 */
export function TheEndCard({
  engine,
  beingWritten,
  nextOpens,
  othersCanSeeWhatYouSay,
  whoCanReadWhatYouSay,
  finishing,
  whileFinishing,
  onFinish,
  onChange,
}: {
  engine: EngineEndCard | null | undefined
  /** True while the card is still being written, so the empty space is said to be that and not a card with nothing in it. */
  beingWritten?: boolean
  /** "Your next check-in opens tomorrow at 4pm.", when it is known. */
  nextOpens: string | null
  /**
   * Whether more than one party answers this check-in (`ground.aTeamReportComes`) - whether there
   * is a team at all to see a shared report with your words in it. Undefined while the ground has
   * not loaded yet, in which case neither sentence is shown rather than guessing.
   */
  othersCanSeeWhatYouSay?: boolean
  /**
   * The first name of the person who runs this check-in, when that is not the reader (release check, 8 October 2026).
   * Where nobody else answers, the reader is still not alone: the lead reads what they said, word for word. On the
   * anchor, where the lead never answers, Juma was told "what you said today stays yours alone" while Amina read it.
   */
  whoCanReadWhatYouSay?: string | null
  finishing: boolean
  /** What to show while finishing. */
  whileFinishing?: React.ReactNode
  onFinish: () => void
  /** Back to the conversation, with the line they say is wrong, or with nothing when something is missing. */
  onChange: (line?: string) => void
}) {
  const record = (engine?.inYourRecord ?? []).filter(l => typeof l?.says === 'string' && l.says.trim())
  const next = (engine?.next ?? []).filter(l => typeof l === 'string' && l.trim())

  return (
    <section aria-label="What I wrote down" className="gwui-ci-endcard">
      {record.length === 0 && (
        <p className="gwui-ci-endcard-body">
          {beingWritten
            ? 'I am still writing down what you said. It takes a few seconds.'
            : <>
                {engine
                  ? 'I did not find anything in your answers to write down yet.'
                  : 'I could not load what I wrote down.'}
                {' '}If something is missing,{' '}<button type="button" className="gwui-plain-link" onClick={() => onChange()} disabled={finishing}>tell me</button>.
              </>}
        </p>
      )}
      {record.length > 0 && (
        <div className="gwui-ci-endcard-box">
          {/* The approved rename of "1. What is now in your record" (sales-first.md). One short list, each line marked, as the prototype draws it. */}
          <h2 className="gwui-ci-endcard-heading">What goes in your record</h2>
          <ul className="gwui-ci-endcard-list">
            {record.map((l, i) => (
              <li key={i} className="gwui-ci-endcard-row">
                <span className="gwui-ci-endcard-markcol"><ProofMark mark={l.mark} /></span>
                <span className="gwui-ci-endcard-text">
                  <span className="gwui-ci-endcard-line">{l.says}</span>
                  {l.how && <span className="gwui-ci-endcard-how">{l.how}</span>}
                  <button type="button" className="gwui-plain-link" onClick={() => onChange(l.says)} disabled={finishing}>{THATS_NOT_RIGHT}</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextOpens && <p className="gwui-ci-endcard-body gwui-ci-endcard-nextopens">{nextOpens}</p>}

      {next.length > 0 && (
        <div className="gwui-ci-endcard-more-body">
          <h3 className="gwui-ci-endcard-heading">What happens next</h3>
          <ul className="gwui-ci-endcard-next">
            {next.map((l, i) => <li key={i} className="gwui-ci-endcard-body">{l}</li>)}
          </ul>
        </div>
      )}

      {othersCanSeeWhatYouSay === false && whoCanReadWhatYouSay && (
        <p className="gwui-ci-endcard-body">{whoCanReadWhatYouSay}</p>
      )}

      {finishing && whileFinishing}
      <div className="gwui-ci-endcard-actions">
        <Button kind="primary" wide onClick={onFinish} disabled={finishing}>
          {finishing ? 'Saving…' : 'That’s right, finish'}
        </Button>
      </div>
    </section>
  )
}

