import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTourStore } from '@/stores/tour'
import { TOUR_STEPS, whereItPoints, isSomebodyNew, tourOutcome, rememberTour, type TourStep } from './the-short-tour'

/**
 * THE OFFER, AND THE TOUR ITSELF (A1). See the-short-tour for what it says and who is offered it.
 *
 * The offer appears once, to somebody new, and says what it is and how long. They can start it or
 * say "Not now". Inside the tour they can go on, go back, skip it, or finish it; Esc skips. Whatever
 * they choose is remembered, and the tour can be taken again from the person's own menu.
 */
export function ShortTour({ list, me }: { list: Parameters<typeof isSomebodyNew>[0]; me: string | null | undefined }) {
  const step = useTourStore(s => s.step)
  const start = useTourStore(s => s.start)
  const go = useTourStore(s => s.go)
  const stop = useTourStore(s => s.stop)
  const [answered, setAnswered] = useState<string | null>(null)

  const offered = step === null && answered !== me && isSomebodyNew(list, me) && tourOutcome(me) === null

  /* Only the steps whose part is on this screen, read when the tour starts. */
  const [steps, setSteps] = useState<TourStep[]>([])
  useLayoutEffect(() => {
    if (step === 0) setSteps(TOUR_STEPS.filter(s => whereItPoints(s)))
  }, [step])

  const begin = () => { rememberTour(me, 'started'); setAnswered(me ?? null); start() }
  const notNow = () => { rememberTour(me, 'skipped'); setAnswered(me ?? null) }
  const skip = () => { rememberTour(me, 'skipped'); stop() }
  const finish = () => { rememberTour(me, 'finished'); stop() }

  if (step === null) {
    if (!offered) return null
    return (
      <div className="gw-tour-offer" role="region" aria-label="A short tour">
        <p><b>New to Groundwork?</b> A short tour shows you where things are. It takes under a minute.</p>
        <div className="gw-tour-acts">
          <button type="button" className="gw-b gw-b-primary gw-b-small" onClick={begin}>Start the tour</button>
          <button type="button" className="gw-b gw-b-quiet gw-b-small" onClick={notNow}>Not now</button>
        </div>
      </div>
    )
  }

  if (steps.length === 0) return null
  const at = Math.min(step, steps.length - 1)
  return <TourStepCard step={steps[at]} at={at} of={steps.length} onBack={() => go(at - 1)} onNext={() => go(at + 1)} onSkip={skip} onFinish={finish} />
}

/** The sidebar's right edge, so a card never covers the part of the sidebar it is talking about. */
function railEdge(): number {
  const rail = document.querySelector('.gw-sidebar-desktop')
  return rail && rail.getClientRects().length ? rail.getBoundingClientRect().right : 0
}

function TourStepCard({ step, at, of, onBack, onNext, onSkip, onFinish }: {
  step: TourStep; at: number; of: number
  onBack: () => void; onNext: () => void; onSkip: () => void; onFinish: () => void
}) {
  const [box, setBox] = useState<DOMRect | null>(null)
  const mainRef = useRef<HTMLButtonElement>(null)
  const last = at === of - 1

  useLayoutEffect(() => {
    const place = () => setBox(whereItPoints(step)?.getBoundingClientRect() ?? null)
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [step])

  useEffect(() => { mainRef.current?.focus() }, [at])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onSkip])

  /* Beside what it points at on a computer; above the bar on a phone, where there is no room beside. */
  const narrow = typeof window !== 'undefined' && window.innerWidth <= 640
  const cardStyle: React.CSSProperties = box && !narrow
    ? { top: Math.max(12, Math.min(box.top, window.innerHeight - 220)), left: Math.min(Math.max(box.right, railEdge()) + 14, window.innerWidth - 336) }
    : { left: 16, right: 16, bottom: 76 }

  return (
    <>
      {box && (
        <div
          className="gw-tour-ring"
          aria-hidden
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <div className="gw-tour-card" role="dialog" aria-modal="false" aria-label={`A short tour, step ${at + 1} of ${of}`} style={cardStyle}>
        <p className="gw-tour-count">Step {at + 1} of {of}</p>
        <p className="gw-tour-says">{step.says}</p>
        <div className="gw-tour-acts">
          {last
            ? <button ref={mainRef} type="button" className="gw-b gw-b-primary gw-b-small" onClick={onFinish}>Finish</button>
            : <button ref={mainRef} type="button" className="gw-b gw-b-primary gw-b-small" onClick={onNext}>Next</button>}
          {at > 0 && <button type="button" className="gw-b gw-b-secondary gw-b-small" onClick={onBack}>Back</button>}
          {!last && <button type="button" className="gw-b gw-b-quiet gw-b-small" onClick={onSkip}>Skip the tour</button>}
        </div>
      </div>
    </>
  )
}
