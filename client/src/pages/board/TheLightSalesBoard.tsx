import { createContext, useCallback, useContext, useMemo, useState, type ReactNode, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { SectionPlacement, Box, FoldedLine, type PlaceASection } from '@/components/gw/ui'
import type { GlanceBox, GlanceLine, TheBoardAtAGlance } from '@/api/board'
import { DealRowsAreShortOnAPhone } from './WorkRecords'

/**
 * THE LIGHT SALES BOARD (docs/light-rebuild/sales-first.md, section 1; the light prototype's s57,
 * s58, s59 and s64, read as a specification, never copied).
 *
 * The board's own sections are not rewritten here. Each one is drawn exactly as before, by the
 * same code, with the same words and buttons; this only decides WHERE it sits. Every top-level
 * `Section` (and every block wrapped in `Placed`) is handed over by its heading, and goes:
 *
 * - to the top, under "What needs you" (what needs the lead, and what to settle together);
 * - beside the headline (the quick read, which the mapping table puts with the headline);
 * - into one of five boxes, as a folded line: its name, one fact, a chevron;
 * - or, when no rule names it, back where it always drew. Nothing is ever dropped here.
 *
 * The facts on each line and box are the server's `atAGlance` (rule 3: from the record, never read
 * off the screen). Where the server has no fact for a line, the section's own note stands in, the
 * same sentence it already showed under its heading. Folding is layout, not access: everything
 * folded away is still on the page, one tap away, and a reader never gets a section the server did
 * not already send them (rule 5).
 */

type Fold = {
  key: string
  box: GlanceBox
  /** The name on the folded line: the section's own heading, or the mapping table's new name. */
  name: string
  line?: GlanceLine
  /** The headings (or `Placed` names) drawn inside, in this order. The first is the main one. */
  parts: RegExp[]
  /** One folded line for each block with this name ("What the target of 25 assumes", one per target). */
  onePerBlock?: boolean
  /** Open by itself on a laptop, closed on a phone ("Every deal, day by day"). */
  openOnALaptop?: boolean
}

export const BOX_NAMES: Record<GlanceBox, string> = {
  work: 'Deals and targets',
  team: 'The team',
  plan: 'Plan and commitments',
  risk: 'Risks and open issues',
  rest: 'Reports and other boards',
}
const BOX_ORDER: GlanceBox[] = ['work', 'team', 'plan', 'risk', 'rest']

/**
 * "Deals and targets" where there are deals on record; on a sales organisation's goals board, with no
 * deal named, "Work and targets" (the prototype's s58 names the first box the same way).
 */
export function boxName(box: GlanceBox, glance: TheBoardAtAGlance): string {
  if (box === 'work' && !glance.lines?.deals) return 'Work and targets'
  return BOX_NAMES[box]
}

/**
 * WHERE EVERY SECTION GOES (sales-first.md, section 1, "Where every build-only piece goes", and the
 * prototype's own five groups in s58). Names in the right-hand column of the mapping table replace
 * the build's own heading on the folded line; every other line keeps the build's heading.
 */
export const FOLDS: Fold[] = [
  /* Deals and targets */
  { key: 'deals', box: 'work', name: 'Every deal, day by day', line: 'deals', parts: [/^Every deal, day by day$/], openOnALaptop: true },
  { key: 'assumes', box: 'work', name: 'What the target assumes', parts: [/^What the target of .+ assumes$/], onePerBlock: true },
  { key: 'reported', box: 'work', name: 'Reported, stage by stage', line: 'reported', parts: [/^Reported, stage by stage$/] },
  { key: 'overTime', box: 'work', name: 'Targets over time', line: 'targetsOverTime', parts: [/^Over time$/, /^What we are aiming for$/, /^What success looks like$/] },
  { key: 'heading', box: 'work', name: 'Where this is heading', line: 'whereHeading', parts: [/^Where this is heading$/] },
  { key: 'forecast', box: 'work', name: 'Where this could end up', line: 'forecast', parts: [/^Where this could end up$/] },
  { key: 'likelyEnd', box: 'work', name: 'Where the sales numbers are likely to end up', line: 'likelyEnd', parts: [/^Where the .+ numbers are likely to end up$/] },
  { key: 'byArea', box: 'work', name: 'By area', line: 'byArea', parts: [/^By area$/] },
  { key: 'sitsUnder', box: 'work', name: 'What this sits under', line: 'sitsUnder', parts: [/^What this sits under$/] },
  { key: 'landing', box: 'work', name: 'Where the sales are landing', line: 'landing', parts: [/^Where work is landing$/] },
  /* The team */
  { key: 'ask', box: 'team', name: 'What to ask each person', line: 'whatToAsk', parts: [/^What to ask each person$/] },
  { key: 'teamToday', box: 'team', name: 'The team today', line: 'teamToday', parts: [/^The team today$/, /^Contribution against role$/] },
  { key: 'whoCheckedIn', box: 'team', name: 'Who checked in', line: 'whoCheckedIn', parts: [/^Who checked in$/] },
  { key: 'patterns', box: 'team', name: 'What keeps coming up', line: 'patterns', parts: [/^What keeps coming up/] },
  { key: 'help', box: 'team', name: 'Help nobody mentioned', line: 'helpNobodyMentioned', parts: [/^Help nobody mentioned$/] },
  { key: 'leading', box: 'team', name: 'How the leading is landing', parts: [/^How the leading is landing$/] },
  { key: 'namedHere', box: 'team', name: 'Named here, and not in this check-in', parts: [/^Named here, and not in this check-in$/] },
  { key: 'after', box: 'team', name: 'What people are after, and where', parts: [/^What people are after, and where$/] },
  { key: 'history', box: 'team', name: 'What each person has done so far', parts: [/^What each person has done so far$/] },
  /* Plan and commitments */
  { key: 'yourNextStep', box: 'plan', name: 'Your own next step', line: 'yourNextStep', parts: [/^What to work on next$/] },
  { key: 'commitments', box: 'plan', name: 'Commitments', line: 'commitments', parts: [/^Who owns what$/, /^What each person said$/] },
  { key: 'workPlan', box: 'plan', name: 'Work plan', line: 'workPlan', parts: [/^Work plan$/] },
  { key: 'promised', box: 'plan', name: 'What each side promised', parts: [/^What each side promised$/] },
  { key: 'timeline', box: 'plan', name: 'Timeline', parts: [/^Timeline$/] },
  { key: 'questions', box: 'plan', name: 'Questions for you', parts: [/^Questions for you$/] },
  /* Risks and open issues */
  { key: 'blockers', box: 'risk', name: 'Blockers', line: 'blockers', parts: [/^Blockers$/] },
  { key: 'risks', box: 'risk', name: 'What could go wrong', line: 'risks', parts: [/^What could go wrong$/] },
  { key: 'waiting', box: 'risk', name: 'Waiting on other teams', line: 'waitingOnOtherTeams', parts: [/^Waiting on$/] },
  { key: 'openIssues', box: 'risk', name: 'Open issues', line: 'openIssues', parts: [/^Open issues$/, /^Where people differ$/, /^Decisions needed$/, /^Asked for, not answered$/, /^Find a time$/] },
  { key: 'contradictions', box: 'risk', name: 'Contradictions', parts: [/^Contradictions$/] },
  /* Reports and other boards */
  { key: 'reports', box: 'rest', name: 'Reports', line: 'reports', parts: [/^Reports$/, /^The sessions so far$/] },
  { key: 'recordShows', box: 'rest', name: 'What the record shows', parts: [/^What the record shows$/] },
  { key: 'answersSay', box: 'rest', name: 'What the answers say', parts: [/^What the answers say$/] },
  { key: 'evidence', box: 'rest', name: 'Evidence index', parts: [/^Evidence index$/] },
  { key: 'alignment', box: 'rest', name: 'Alignment feed', parts: [/^Alignment feed$/] },
  { key: 'howToRead', box: 'rest', name: 'How to read this board', parts: [/^How to read this board$/, /^How this board is put together$/] },
]

/** Drawn first, under "What needs you" (the mapping table: "What to settle together" goes there). */
const NEEDS: RegExp[] = [/^What needs you in this check-in$/, /^Groundwork recommends$/, /^What to settle together$/]
/** Drawn with the headline (the mapping table: "The quick read" goes to the headline). */
const BESIDE_THE_HEADLINE: RegExp[] = [/^The quick read$/]

type Slots = {
  glance: TheBoardAtAGlance
  readerRunsIt: boolean
  onALaptop: boolean
  el: (id: string) => HTMLElement | null
  slot: (id: string) => (el: HTMLElement | null) => void
}
const LightSlots = createContext<Slots | null>(null)

/** Whether this board is drawn light: a sales board the server sent `atAGlance` for. */
export function isLight(b: { atAGlance?: TheBoardAtAGlance | null } | null | undefined): boolean {
  return !!b?.atAGlance
}

export function findTheFold(heading: string): { fold: Fold; part: number } | null {
  for (const fold of FOLDS) {
    const part = fold.parts.findIndex((re) => re.test(heading))
    if (part >= 0) return { fold, part }
  }
  return null
}

/**
 * The provider: every `Section` under it is placed by its heading. `readerRunsIt` is the lead (the
 * full board, opened); anybody else the server sends `atAGlance` to (an admin) reads the summary first.
 */
export function TheLightSalesBoard({ glance, readerRunsIt, children }: { glance: TheBoardAtAGlance; readerRunsIt: boolean; children: ReactNode }) {
  const [els, setEls] = useState<Record<string, HTMLElement | null>>({})
  const [onALaptop] = useState(() => typeof window === 'undefined' || typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 700px)').matches)
  const setters = useMemo(() => new Map<string, (el: HTMLElement | null) => void>(), [])
  const slot = useCallback((id: string) => {
    let s = setters.get(id)
    if (!s) {
      s = (el: HTMLElement | null) => setEls((prev) => (prev[id] === el ? prev : { ...prev, [id]: el }))
      setters.set(id, s)
    }
    return s
  }, [setters])
  const value = useMemo<Slots>(() => ({ glance, readerRunsIt, onALaptop, el: (id) => els[id] ?? null, slot }), [glance, readerRunsIt, onALaptop, els, slot])

  const place: PlaceASection = (heading, section, { note, key }) => {
    const portal = (id: string, node: ReactElement) => {
      const target = els[id]
      return target ? createPortal(node, target) : null
    }
    const needs = NEEDS.findIndex((re) => re.test(heading))
    if (needs >= 0) return portal(`needs:${needs}`, section)
    const beside = BESIDE_THE_HEADLINE.findIndex((re) => re.test(heading))
    if (beside >= 0) return portal(`beside:${beside}`, section)
    const found = findTheFold(heading)
    if (!found) return section
    const { fold, part } = found
    if (fold.onePerBlock) {
      return portal(`fold:${fold.key}`, (
        <FoldedLine name={heading} fact={key ? glance.assumesEach?.[key] ?? null : null}>
          <div className="gwui-light-part" data-main="1">{section}</div>
        </FoldedLine>
      ))
    }
    /* Where the server has no fact for this line, the main section's own note stands in (s57), and is then not said twice inside. */
    const noteIsTheFact = part === 0 && !(fold.line && glance.lines[fold.line]) && !!note
    return (
      <>
        {portal(`part:${fold.key}:${part}`, <div className="gwui-light-sec" data-note-is-fact={noteIsTheFact ? '1' : undefined}>{section}</div>)}
        {noteIsTheFact && portal(`fact:${fold.key}`, <>{note}</>)}
      </>
    )
  }

  return (
    <LightSlots.Provider value={value}>
      <DealRowsAreShortOnAPhone.Provider value={true}>
        <SectionPlacement.Provider value={place}>{children}</SectionPlacement.Provider>
      </DealRowsAreShortOnAPhone.Provider>
    </LightSlots.Provider>
  )
}

/** Where "What needs you" and what to settle together are drawn. For the lead, first on the page. */
export function TheLightNeedsYou({ title }: { title?: string }) {
  const s = useContext(LightSlots)
  if (!s) return null
  return (
    <div className="gwui-light-needs">
      {/* Approved rename: for an admin or the chief executive, "What needs you in this check-in" reads "What needs the lead". */}
      {title && <h2 className="t-h2 gwui-light-needs-title">{title}</h2>}
      {NEEDS.map((_, i) => <div key={i} ref={s.slot(`needs:${i}`)} className="gwui-light-slot" />)}
    </div>
  )
}

/** Drawn right after "To close the gap": what the mapping table puts with the headline. */
export function TheLightBesideTheHeadline() {
  const s = useContext(LightSlots)
  if (!s) return null
  return <>{BESIDE_THE_HEADLINE.map((_, i) => <div key={i} ref={s.slot(`beside:${i}`)} className="gwui-light-slot" />)}</>
}

/** The five boxes, under "Everything else" (s57, s58). */
export function TheLightBoxes() {
  const s = useContext(LightSlots)
  if (!s) return null
  return (
    <section className="sec gwui-light-else" aria-labelledby="gwui-light-else-h">
      <div className="sec-h">
        <h2 id="gwui-light-else-h" className="t-h2">Everything else</h2>
        <span className="t-small mut">Tap any line to see more</span>
      </div>
      <div>
        <div className="gwui-boxes">
          {BOX_ORDER.map((box) => (
            <Box key={box} name={boxName(box, s.glance)} facts={s.glance.boxes?.[box] ?? []} defaultOpen={box === 'work' && s.onALaptop}>
              {FOLDS.filter((f) => f.box === box).map((f) => (
                f.onePerBlock
                  ? <div key={f.key} ref={s.slot(`fold:${f.key}`)} className="gwui-light-folds" />
                  : (
                    <FoldedLine
                      key={f.key}
                      name={f.name}
                      fact={(f.line && s.glance.lines[f.line]) || <span ref={s.slot(`fact:${f.key}`)} />}
                      defaultOpen={!!f.openOnALaptop && s.onALaptop}
                    >
                      {f.parts.map((_, i) => (
                        <div key={i} ref={s.slot(`part:${f.key}:${i}`)} className="gwui-light-part" data-main={i === 0 ? '1' : undefined} />
                      ))}
                    </FoldedLine>
                  )
              ))}
            </Box>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * FOR AN ADMIN OR THE CHIEF EXECUTIVE (s59): the headline and the gap, then "At a glance" (one line
 * for each box, and what needs the lead), then "Open the full board", which holds everything the
 * lead reads, folded the same way. Nothing is taken away: the full board is one tap away.
 */
export function TheLightSummaryFirst() {
  const s = useContext(LightSlots)
  const [open, setOpen] = useState(false)
  if (!s) return null
  return (
    <>
      <section className="sec gwui-light-glance" aria-labelledby="gwui-light-glance-h">
        <div className="sec-h">
          <h2 id="gwui-light-glance-h" className="t-h2">At a glance</h2>
          <span className="t-small mut">For you as an admin. The lead runs this check-in.</span>
        </div>
        <div>
          <div className="gwui-light-glance-rows">
            {BOX_ORDER.map((box) => (
              <div key={box} className="gwui-light-glance-row">
                <span className="gwui-light-glance-name">{boxName(box, s.glance)}</span>
                <span className="gwui-light-glance-fact">{(s.glance.boxes?.[box] ?? []).slice(0, 2).join(' · ')}</span>
              </div>
            ))}
            {s.glance.needsTheLead && (
              <div className="gwui-light-glance-row">
                <span className="gwui-light-glance-name">What needs the lead</span>
                <span className="gwui-light-glance-fact">{s.glance.needsTheLead}</span>
              </div>
            )}
          </div>
        </div>
      </section>
      <details className="gwui-light-full" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="gwui-light-full-btn">{open ? 'Close the full board' : 'Open the full board'}</summary>
        <div className="gwui-light-full-body">
          <TheLightNeedsYou title="What needs the lead" />
          <TheLightBoxes />
        </div>
      </details>
    </>
  )
}
