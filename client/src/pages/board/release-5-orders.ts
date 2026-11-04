import type { APicturedSection } from './pictured/ThePicturedBoard'

/**
 * RELEASE 5 (release-5-projects in the engine): a project, as the Check-in Reports file's "A project" (Mastercard market study): the plan,
 * money in and out, the stakeholders, what is coming up, and if it goes off track; then who checked in, the reports and every session,
 * folded, as every other board.
 */
/* What needs you and Blockers, the board's own sections, so a project's lead reads her decisions and what is stuck (boards audit R5-1). */
export const PROJECT_ORDER: APicturedSection[] = ['plan', 'money', 'stakeholders', 'projectComingUp', 'offTrack', 'needsYou', 'blockers', 'whoCheckedIn', 'reports', 'everySession', 'heading', 'recommends']
export const PROJECT_FOLD_AFTER: APicturedSection = 'needsYou'
