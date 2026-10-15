import { Bubble } from './Bubble'

/**
 * THE "GROUNDWORK IS WRITING…" INDICATOR (Hafsah, 9 October).
 *
 * Replies now arrive whole, as the engine sends them - the app no longer draws them in piece by
 * piece. While one is on its way, every chat now shows the same thing: Groundwork's own bubble
 * shape and colours (`Bubble.tsx`, which follows `docs/prototype/source/app.css`'s `.bub.them`),
 * the sentence "Groundwork is writing…", and three small dots that fade gently and stop under
 * `prefers-reduced-motion` (the prototype's only animation is `@keyframes up`; these dots are new,
 * so they switch off rather than add motion the prototype never had).
 *
 * `role="status"` and `aria-live="polite"` so a screen reader says the sentence once, without
 * interrupting whatever the person is doing.
 *
 * `name` lets a reply that comes from Ask speak as Ask, under its own name where one is known
 * ("Ask Kijani Foods is writing…" - `askNameFor`/`page.data?.askName`), rather than always
 * "Groundwork".
 *
 * `wrap` is false where the caller already draws its own enclosing bubble for this turn (for
 * example `ChatPage.tsx`'s placeholder `AI` message) - nesting a second bubble inside the first
 * would draw two, one inside the other, which the prototype never does.
 */
/**
 * The three dots alone, with no sentence of their own - for the one place a wait already has its
 * own pinned sentence (`ChatPage.tsx`'s "Opening your session…", checked verbatim by
 * `the-page-says-what-it-is-doing.spec.ts`), so that sentence is not said twice under one
 * `role="status"`. Not exported from `components/gw/ui/index.ts`: everywhere else uses
 * `GroundworkIsWriting` itself, sentence and all.
 */
export function WritingDots() {
  return (
    <span className="gwui-writing-dots" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="gwui-writing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  )
}

export function GroundworkIsWriting({ name = 'Groundwork', wrap = true }: {
  name?: string
  wrap?: boolean
}) {
  const content = (
    <span role="status" aria-live="polite" className="gwui-writing">
      {name} is writing…
      <WritingDots />
    </span>
  )
  return wrap ? <Bubble mine={false}>{content}</Bubble> : content
}
