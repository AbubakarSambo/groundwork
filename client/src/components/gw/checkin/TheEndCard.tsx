import { Button } from '@/components/gw/ui/Button'
import { ProofMark } from '@/components/gw/ui/ProofMark'
import { FoldedLine } from '@/components/gw/ui/FoldedLine'
import '@/components/gw/ui/gw-ui.css'
import type { TheEndCard as EngineEndCard } from '@/api/conversation'
import { useTheDirectMorning } from '@/lib/the-direct-morning'

/**
 * THE END CARD (B3, docs/prototype/screens/B3-the-check-in/check-in-end-card.txt).
 *
 * Groundwork's last message ("That’s all for today. Below is what I wrote down from your answers. Is
 * anything wrong?") is the engine's and sits above this in the conversation. Under it, as the light
 * prototype draws it (s68, docs/light-rebuild/sales-first.md section 5):
 *
 *   What goes in your record    one short list (the approved rename of "1. What is now in your
 *                               record"), each line with its mark (proven, their word) and its
 *                               one-line source, which says when it is something to do. Only the
 *                               engine writes these.
 *   Your next check-in opens …  one line, from the schedule
 *   Why answering matters, and what happens next   folded behind one line: why answering matters,
 *                               when the lead also answers, and what would change a line
 *
 * THE PROTOTYPE'S LINE, BUILT FROM THE CHECK-IN'S REAL SETTING (group 3's review, batch A fault 2).
 * "Your team will see what you said today, and a short summary of what moved." sat out for months
 * on the comment that it was "the open question about the invitation's promise" - but that question
 * was settled 29 September (Conflict A, docs/morning-report-ui.md): the people in a check-in,
 * including the lead, can see what you say in it, once the team's report is shared. `aTeamReportComes`
 * (already on the `Ground` the chat page holds - nothing new from the server) says whether more than
 * one party answers this check-in at all, which is exactly what decides whether there is a team to
 * see anything. Where there is, the prototype's own line is shown; where this check-in has nobody
 * else in it, the true sentence for that case is shown instead.
 *

 * "That’s right, finish" is the one press that finishes, and "Change something" goes back to the
 * conversation, where the person says what is wrong in their own words.
 *
 * GROUP 3, PIECE 3: rebuilt from the shared parts - `Button` and `ProofMark` from
 * `components/gw/ui` rather than the old `kit.tsx` (which drew the same two things under the
 * names `Button` and `Mark`), and every size, colour and spacing as a `.gwui-ci-endcard-*` class
 * in gw-ui.css rather than an inline style.
 */
export function TheEndCard({
  engine,
  beingWritten,
  leadName,
  nextOpens,
  othersCanSeeWhatYouSay,
  whoReadsIt,
  finishing,
  whileFinishing,
  onFinish,
  onChange,
}: {
  engine: EngineEndCard | null | undefined
  /** True while the card is still being written, so the empty space is said to be that and not a card with nothing in it. */
  beingWritten?: boolean
  /** The lead's first name, when the lead also answers this check-in. See whoElseAnswers. */
  leadName: string | null
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
  whoReadsIt?: string | null
  finishing: boolean
  /** What to show while finishing, which takes about half a minute. */
  whileFinishing?: React.ReactNode
  onFinish: () => void
  onChange: () => void
}) {
  /*
   * THE DIRECT MORNING (lib/the-direct-morning.tsx): what goes in the record, when the next one opens, and what the engine says
   * happens next. No line about why answering matters, no reassurance and no line about who sees it. Who sees it is the
   * backend's rule, the same either way.
   */
  const direct = useTheDirectMorning()
  const record = (engine?.inYourRecord ?? []).filter(l => typeof l?.says === 'string' && l.says.trim())
  const fromTheEngine = (engine?.next ?? []).filter(l => typeof l === 'string' && l.trim())
  /* When the next one opens is said once, as its own line above the fold (sales-first.md, section 5). */
  const next = direct ? fromTheEngine : [
    ...fromTheEngine,
    'If you don’t want to talk about something yet, that’s fine. You can leave it for now.',
  ]

  return (
    <section aria-label="What I wrote down" className="gwui-ci-endcard">
      {record.length === 0 && (
        <p className="gwui-ci-endcard-body">
          {beingWritten
            ? 'I am still writing down what you said. It takes a few seconds.'
            : engine
              ? 'I did not find anything in your answers to write down yet. If something is missing, choose “Change something” and tell me.'
              : 'I could not show you what I wrote down just now. It is written from your answers when you finish.'}
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
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextOpens && <p className="gwui-ci-endcard-body gwui-ci-endcard-nextopens">{nextOpens}</p>}

      {/* Why answering matters and what happens next, folded behind one line (the light prototype's s68). */}
      {direct ? (next.length > 0 && (
        <div className="gwui-ci-endcard-more-body">
          <h3 className="gwui-ci-endcard-heading">What happens next</h3>
          <ul className="gwui-ci-endcard-next">
            {next.map((l, i) => <li key={i} className="gwui-ci-endcard-body">{l}</li>)}
          </ul>
        </div>
      )) : (
      <FoldedLine name={leadName ? 'Why answering matters, and what happens next' : 'What happens next'}>
        <div className="gwui-ci-endcard-more-body">
          {leadName && (
            <div>
              <h3 className="gwui-ci-endcard-heading">Why answering matters</h3>
              <p className="gwui-ci-endcard-body">
                {leadName} also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right.
              </p>
            </div>
          )}
          <div>
            <h3 className="gwui-ci-endcard-heading">What happens next</h3>
            <ul className="gwui-ci-endcard-next">
              {next.map((l, i) => <li key={i} className="gwui-ci-endcard-body">{l}</li>)}
            </ul>
          </div>
        </div>
      </FoldedLine>
      )}

      {!direct && othersCanSeeWhatYouSay !== undefined && (
        <p className="gwui-ci-endcard-body">
          {othersCanSeeWhatYouSay
            ? 'Your team will see what you said today, and a short summary of what moved.'
            : whoReadsIt
              ? `Nobody else answers this check-in, but ${whoReadsIt} runs it and reads what you said today.`
              : 'Nobody else answers this check-in, so what you said today stays yours alone.'}
        </p>
      )}

      {finishing && whileFinishing}
      <div className="gwui-ci-endcard-actions">
        <Button kind="primary" wide onClick={onFinish} disabled={finishing}>
          {finishing ? 'Saving…' : 'That’s right, finish'}
        </Button>
        <Button kind="secondary" wide onClick={onChange} disabled={finishing}>
          Change something
        </Button>
      </div>
    </section>
  )
}

