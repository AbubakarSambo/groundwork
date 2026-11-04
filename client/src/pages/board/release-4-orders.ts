import type { APicturedSection } from './pictured/ThePicturedBoard'

/**
 * RELEASE 4: EACH TEAM TYPE'S BOARD, IN ITS KIT PICTURE'S ORDER (release plan, Release 4; docs/prototype/screens/G1-example-check-ins).
 * Drawn only where the organisation has Release 4 on (board/release-4-teams on the server); off, every board keeps its order. The first
 * screen is the headline with each target, what needs you and the team today, as on Grace's board (Hafsah, 24 October); everything
 * after it is folded under its own heading (FoldTheRest). The team today comes before every ticket or sale (boards audit R4-1).
 */
export const RELEASE_4_ORDERS: Record<string, APicturedSection[]> = {
  /* support.jpg */
  'support desk': ['headlineTargets', 'needsYou', 'teamToday', 'everySale', 'themes', 'byTeam', 'whoCheckedIn', 'blockers', 'patterns', 'overTime', 'reports', 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'],
  /* ops.jpg: the same shape, with incidents by site and type, and by site */
  'distribution operations': ['headlineTargets', 'needsYou', 'teamToday', 'everySale', 'themes', 'byTeam', 'whoCheckedIn', 'blockers', 'patterns', 'overTime', 'reports', 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'],
  /* eng.jpg: reported against evidence, stage by stage, and by area of work */
  'engineering release': ['headlineTargets', 'needsYou', 'teamToday', 'everySale', 'reported', 'byTeam', 'whoCheckedIn', 'blockers', 'patterns', 'overTime', 'reports', 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'],
  /* salesorg.jpg: the same as engineering, by team */
  'sales org': ['headlineTargets', 'needsYou', 'teamToday', 'everySale', 'reported', 'byTeam', 'whoCheckedIn', 'blockers', 'patterns', 'overTime', 'reports', 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'],
  /* mvq4.jpg: the question, what needs you, what the systems show, where people and the systems differ, where this is heading */
  'MarketView Q4': ['question', 'needsYou', 'systemsShow', 'saidAndSystemsDiffer', 'heading', 'recommends'],
  /* leadership, for whoever runs it: the priorities across the teams, what needs you, the leadership report, the team, then the rest */
  leadership: ['priorities', 'needsYou', 'teamReport', 'teamToday', 'whoCheckedIn', 'blockers', 'patterns', 'reports', 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'],
}

/** leadership-board.jpg (lead-taking-part): a member of the leadership team reads the priorities, their own part, the shared report and the company board. */
export const LEADERSHIP_MEMBER_ORDER: APicturedSection[] = ['participantNote', 'priorities', 'yourPart', 'teamReport', 'companyBoard', 'everySession', 'otherBoards', 'ask']

/** The order a Release 4 board is drawn in for this reader, or null where its kind has none. */
export function theRelease4Order(kind: string | null | undefined, runsIt: boolean): APicturedSection[] | null {
  if (kind === 'leadership' && !runsIt) return LEADERSHIP_MEMBER_ORDER
  const order = RELEASE_4_ORDERS[kind ?? '']
  /* A template the lead attached shows as its own folded part, before Ask. */
  return order ? [...order.filter((k) => k !== 'ask'), 'template', ...(order.includes('ask') ? ['ask' as APicturedSection] : [])] : null
}

export const RELEASE_4_FOLD_AFTER: APicturedSection = 'teamToday'

/** Where a type's board folds: after the team today, except MarketView Q4's and leadership's, each already about one screen long (mvq4.jpg, leadership-board.jpg). */
export function whereItFolds(kind: string | null | undefined): APicturedSection | undefined {
  return kind === 'MarketView Q4' || kind === 'leadership' ? undefined : RELEASE_4_FOLD_AFTER
}
