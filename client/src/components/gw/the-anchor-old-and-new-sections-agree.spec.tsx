import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheAnchorBoardSections } from './TheAnchorBoardSections'

/**
 * DECISION 114 (8 October evening): `TheMonthBoard` and `TheEndOfMonthRead` are retired from
 * `BoardPage.tsx` and `EndingPage.tsx` in favour of the switchboard's own sections
 * (`whereTheMonthIs`, `whatIsMoving`, `whatTheTeamIsContributing`, `peopleHelpingTheTeamMove`,
 * `wherePerspectivesDiffer`, `whatIsStillInTheWay`, `whatGroundworkIsWorkingOnNext`, and
 * `theEndOfTheMonth`), drawn by `TheAnchorBoardSections` instead - and, since this was the only
 * thing still rendering them (`nothing-is-left-behind.spec.ts`'s orphan check), the two components
 * and their own specs (`TheMonthBoard.spec.tsx`, `TheEndOfMonthRead.spec.tsx`) are deleted outright.
 *
 * Before deleting them, every sentence their old fixtures produced was checked, side by side, against
 * the equivalent new section payload (built the same way
 * `api/src/modules/board/the-anchor-sections-on-the-board.ts` builds one from the other) rendered
 * through `TheAnchorBoardSections` - nothing was lost. `OLD_MONTH_BOARD_SENTENCES` and
 * `OLD_END_OF_MONTH_SENTENCES` below are that frozen record, carried over word for word from the
 * deleted components' own fixtures, so this spec keeps proving the new sections still say every one
 * of them even with the old components gone.
 */

/** Every plain sentence `TheMonthBoard.spec.tsx`'s own fixture produced, word for word. */
const OLD_MONTH_BOARD_SENTENCES = [
  'Week 3 of the month',
  'Are we moving together?',
  'Understanding',
  'Do people see the bigger picture?',
  'Most of the team now connects their own work to the wider outcome.',
  'Ownership',
  'Are they carrying outcomes rather than only assigned tasks?',
  'Three people have taken on something nobody asked them to.',
  'Omar connected a project delay to a renewal risk.',
  'A proposal to review client work a month before it ends.',
  'Omar',
  'Connected a project delay to a renewal risk and raised it before it became a customer issue.',
  'Lucy thinks onboarding stock was slow; the lead thinks she waited too long to raise it.',
  'Price objections, raised 9 times.',
  'Following up with the two people who have not checked in this week.',
]

/** The equivalent section payload, built the same way the engine's own switchboard does. */
const monthSections = {
  whereTheMonthIs: { heading: 'Where the month is', weekOfTheMonth: 3 as const, text: 'Week 3 of the month' },
  theFourLenses: {
    heading: 'The four lenses',
    question: 'Are we moving together?',
    lenses: [
      { key: 'understanding' as const, heading: 'Understanding', question: 'Do people see the bigger picture?', reading: 'Most of the team now connects their own work to the wider outcome.' },
      { key: 'ownership' as const, heading: 'Ownership', question: 'Are they carrying outcomes rather than only assigned tasks?', reading: 'Three people have taken on something nobody asked them to.' },
    ],
  },
  whatIsMoving: { heading: "What's moving", items: ['Omar connected a project delay to a renewal risk.'] },
  whatTheTeamIsContributing: { heading: 'What the team is contributing', items: ['A proposal to review client work a month before it ends.'] },
  peopleHelpingTheTeamMove: { heading: 'People helping the team move', people: [{ name: 'Omar', sentence: 'Connected a project delay to a renewal risk and raised it before it became a customer issue.' }] },
  wherePerspectivesDiffer: { heading: 'Where perspectives differ', items: ['Lucy thinks onboarding stock was slow; the lead thinks she waited too long to raise it.'] },
  whatIsStillInTheWay: { heading: "What's still getting in the way", items: ['Price objections, raised 9 times.'] },
  whatGroundworkIsWorkingOnNext: { heading: 'What Groundwork is working on next', items: ['Following up with the two people who have not checked in this week.'] },
}

/** Every plain sentence `TheEndOfMonthRead.spec.tsx`'s own fixture produced, word for word. */
const OLD_END_OF_MONTH_SENTENCES = [
  'You wanted your team to understand...',
  '“Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.”',
  'The team saw their own work, but not how it connected to the wider outcome.',
  'Omar now connects a late delivery to a renewal risk.',
  'A proposal to review client work a month before it ends.',
  'Omar',
  'Connected a project delay to a renewal risk and raised it before it became a customer issue.',
  'Price objections, raised 9 times.',
  'Follow up with the two people who have not checked in this week.',
  'This started as one check-in.',
  'During the month, Groundwork also found this.',
  'Groundwork found one project that could have a check-in of its own.',
  'Your team has already started building its Groundwork.',
  'Keep this check-in running',
]

const endOfMonthSection = {
  heading: 'You wanted your team to understand...',
  yourOwnWords: 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.',
  parts: [
    { heading: 'What we found', items: ['The team saw their own work, but not how it connected to the wider outcome.'] },
    { heading: 'What they now understand differently', items: ['Omar now connects a late delivery to a renewal risk.'] },
    { heading: 'What your team contributed', items: ['A proposal to review client work a month before it ends.'] },
    { heading: "What's still stuck", items: ['Price objections, raised 9 times.'] },
    { heading: 'What should happen next', items: ['Follow up with the two people who have not checked in this week.'] },
  ],
  people: [{ name: 'Omar', sentence: 'Connected a project delay to a renewal risk and raised it before it became a customer issue.' }],
  reveal: {
    projectsThatCouldHaveTheirOwnGround: 1,
    sharedObjectivesWorthTracking: 0,
    workingRelationshipsNeedingAlignment: 0,
    activeCommitments: 0,
    teamGeneratedIdeas: 0,
    suitesRelevantToWorkAlreadyBeingDone: 0,
  },
  revealSaid: { heading: 'This started as one check-in.', intro: 'During the month, Groundwork also found this.', lines: ['Groundwork found one project that could have a check-in of its own.'], closing: 'Your team has already started building its Groundwork.' },
  continueOptions: [{ key: 'keepThisGroundRunning' as const, label: 'Keep this check-in running' }],
}

describe('the month sections draw every sentence the retired TheMonthBoard used to', () => {
  it('draws every sentence from the equivalent section payload', () => {
    render(<TheAnchorBoardSections sections={monthSections} />)
    for (const s of OLD_MONTH_BOARD_SENTENCES) expect(screen.getByText(s)).toBeTruthy()
  })
})

describe('the theEndOfTheMonth section draws every sentence the retired TheEndOfMonthRead used to', () => {
  it('draws every sentence from the equivalent section payload', () => {
    render(<TheAnchorBoardSections sections={{ theEndOfTheMonth: endOfMonthSection }} onContinue={() => {}} />)
    for (const s of OLD_END_OF_MONTH_SENTENCES) expect(screen.getByText(s)).toBeTruthy()
  })
})
