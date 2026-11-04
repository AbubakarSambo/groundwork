import type { MyWork } from '@/api/grounds'

/**
 * WHAT GET /grounds/:id/my-work SERVES THE LEAD OF A CHECK-IN WITH NOTHING IN IT YET, for the page specs that open My work.
 *
 * My work is the B7 page (MyWorkPage.tsx) for everybody since Release 1B's switch went (batch 1, group 10), so a spec that
 * opens My work on GroundAdminPage needs the server's answer to draw it. The rest of today's My work ("Every session",
 * "Who has answered", the roster's way in) is drawn under it, in the fold "More from your check-ins".
 */
export const SERVED_TO_THE_LEAD: MyWork = {
  on: true,
  view: 'self',
  checkInName: 'This check-in',
  person: { participantId: 'p1', name: 'The lead', firstName: 'The lead' },
  heading: 'Your work',
  topLine: 'What you need to do, what you’ve done, and how to get better.',
  numbers: [],
  focus: null,
  focusEmpty: 'Nothing needs work yet. Your focus will show here once your check-ins show something to work on.',
  toDo: { othersNeed: [], own: [], emptySays: 'Nothing to do yet.' },
  achieved: { items: [], note: '', emptySays: 'Nothing yet.' },
  performing: { note: '', behaviours: [], libraryNote: '' },
  coaching: { better: [], keep: [], betterEmpty: 'Nothing yet.', keepEmpty: 'Nothing yet.' },
  checkIns: { heading: 'Your check-ins', due: 0, done: 0, onTime: 0, specific: 0, emptySays: 'No check-ins yet.' },
  reports: { heading: 'Your reports', items: [], emptySays: 'No reports yet.' },
  items: { heading: 'Your deals', note: '', itemWord: 'item', rows: [], emptySays: 'Nothing yet.' },
}
