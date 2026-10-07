import { Button } from '@/components/gw/ui/Button'
import { ProofMark } from '@/components/gw/ui/ProofMark'
import '@/components/gw/ui/gw-ui.css'
import type { TheEndCard as EngineEndCard } from '@/api/conversation'

/**
 * THE END CARD (B3, docs/prototype/screens/B3-the-check-in/check-in-end-card.txt).
 *
 * Groundwork's last message ("That’s all for today. Below is what I wrote down from your answers. Is
 * anything wrong?") is the engine's and sits above this in the conversation. Under it, three parts:
 *
 *   1. What is now in your record   each line with its mark. Only the engine can write these, from
 *                                   the answers just given (request 7). Left out until it does.
 *   2. Why answering matters        the prototype's words, when the lead also answers this check-in
 *   3. What happens next            when the next one opens, what the engine says would prove a line,
 *                                   and "If you don’t want to talk about something yet, that’s fine."
 *
 * Numbered by what is drawn, so a card with two parts reads 1 and 2, not 2 and 3.
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
  finishing: boolean
  /** What to show while finishing, which takes about half a minute. */
  whileFinishing?: React.ReactNode
  onFinish: () => void
  onChange: () => void
}) {
  const record = (engine?.inYourRecord ?? []).filter(l => typeof l?.says === 'string' && l.says.trim())
  const fromTheEngine = (engine?.next ?? []).filter(l => typeof l === 'string' && l.trim())
  const next = [
    ...(nextOpens ? [nextOpens] : []),
    ...fromTheEngine,
    'If you don’t want to talk about something yet, that’s fine. You can leave it for now.',
  ]

  let n = 0
  const part = () => (n += 1)

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
          <h2 className="gwui-ci-endcard-heading">{part()}. What is now in your record</h2>
          <ul className="gwui-ci-endcard-list">
            {record.map((l, i) => (
              <li key={i} className="gwui-ci-endcard-row">
                <span className="gwui-ci-endcard-markcol"><ProofMark mark={l.mark} /></span>
                <span>
                  <span className="gwui-ci-endcard-line">{l.says}</span>
                  {l.how && <span className="gwui-ci-endcard-how">{l.how}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leadName && (
        <div className="gwui-ci-endcard-box">
          <h2 className="gwui-ci-endcard-heading">{part()}. Why answering matters</h2>
          <p className="gwui-ci-endcard-body">
            {leadName} also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right.
          </p>
        </div>
      )}

      <div className="gwui-ci-endcard-box">
        <h2 className="gwui-ci-endcard-heading">{part()}. What happens next</h2>
        <ul className="gwui-ci-endcard-next">
          {next.map((l, i) => <li key={i} className="gwui-ci-endcard-body">{l}</li>)}
        </ul>
      </div>

      {othersCanSeeWhatYouSay !== undefined && (
        <p className="gwui-ci-endcard-body">
          {othersCanSeeWhatYouSay
            ? 'Your team will see what you said today, and a short summary of what moved.'
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
