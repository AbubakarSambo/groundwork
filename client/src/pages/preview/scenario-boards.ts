import type { ComponentType } from 'react'

/**
 * THE SCENARIO BOARDS' REGISTRY (preview only, /scenario-boards and /scenario-boards/:kind, development builds only).
 * Eleven example boards, one per kind of work, drawn from docs/prototype/screens/G1-example-check-ins/<kind>.txt and .jpg
 * with demo data. No sign-in and no server: each board reads its own fixture.
 *
 * HOW TO ADD A BOARD (the eleven kinds are already listed below; only the file is missing):
 *  1. Put the prototype's sample data, word for word, in `__fixtures__/scenario-<kind>.json`.
 *  2. Make `scenario-boards/<kind>.tsx`: `export { fixture }` (the JSON import) and a default export, the board component taking
 *     `{ data? }`. Wrap it in `<ScenarioBoardFrame ...>` and supply only the sections. Copy `scenario-boards/gov.tsx`.
 *     Use `Section`, `Panel`, `Tag` and the open `Table` from `@/components/gw/ui`; never `Fold` or `FoldedLine` here.
 *  3. Nothing else: this file finds `scenario-boards/*.tsx` by itself, so two boards added at once never touch the same file.
 *  4. Add `scenario-boards/<kind>.spec.tsx` beside the gov one, with the prototype's headings and a sample of its cells as literals.
 */
export type ScenarioBoard = {
  kind: string
  /** The prototype's board title. */
  title: string
  /** The prototype's one line under it. */
  about: string
  Component: ComponentType<any> | null
}

const KINDS: Omit<ScenarioBoard, 'Component'>[] = [
  { kind: 'eng', title: 'Engineering release', about: '5 engineers. Daily check-ins. Release on 30 Sep.' },
  { kind: 'founder', title: 'Founder’s own check-in', about: 'One person. Weekly check-in. Decisions and commitments.' },
  { kind: 'gov', title: 'Extension Access Programme', about: 'The ministry, three counties, their projects and extension officers. Weekly. Month 9 of 24.' },
  { kind: 'loans', title: 'Asset loans, cohort 3', about: '40 traders, freezer loans. Weekly, on WhatsApp. Week 14 of 26.' },
  { kind: 'matter', title: 'Kasarani Foods v Pwani Mills', about: 'A Partner, a Senior Associate, two Associates, a paralegal and a tax specialist. Weekly. Reply due Friday 2 October.' },
  { kind: 'mvnext', title: 'MarketView, where next', about: '24 people: 10 agroprocessors, 10 input distributors, 4 research organisations. Answered once.' },
  { kind: 'mvq4', title: 'MarketView, Q4', about: 'Sales and product. Daily, weekdays. Numbers from MarketView and Paystack.' },
  { kind: 'ops', title: 'Distribution operations', about: '4 depot managers. Daily check-ins. Each problem is written down once, then followed up.' },
  { kind: 'programme', title: 'Trader training programme', about: '6 field officers in 3 counties. WhatsApp check-ins after each session.' },
  { kind: 'salesorg', title: 'Sales org, Q3', about: '20 reps in 4 teams. Daily check-ins. A head of sales and 4 team leads.' },
  { kind: 'support', title: 'Support desk', about: '6 agents in 3 queues. ~400 tickets a week. Daily check-ins on exceptions only.' },
]

const files = import.meta.glob(['./scenario-boards/*.tsx', '!./scenario-boards/*.spec.tsx'], { eager: true }) as Record<string, { default: ComponentType<any> }>

export const SCENARIO_BOARDS: ScenarioBoard[] = KINDS.map((k) => ({ ...k, Component: files[`./scenario-boards/${k.kind}.tsx`]?.default ?? null }))
