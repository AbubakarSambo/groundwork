/**
 * A PERSON'S CV AND EMERGENCY CONTACT: WHO MAY READ AND CHANGE EACH (Hafsah, 21 November 2026). One rule, in one file, that the
 * routes ask on every request. Pure functions over who is reading and whose details these are.
 *
 *   the CV                 read by the person, an admin here, and the person's own manager (the one they report to here);
 *                          changed by the person or an admin.
 *   the emergency contact  read and changed by the person and an admin here, and nobody else, their manager included.
 *
 * A guest, or somebody still waiting to be let in, reads only their own. Nothing here is served in any list: the People
 * list, the Desk's directory and colleagues never carry either, because both live in their own tables
 * (`PersonCv`, `EmergencyContact`) that only `PersonDetailsService` reads.
 */
export interface Reader {
  userId: string;
  /** Their role here, from their membership. Null when they have none, or still wait to be let in. */
  role: string | null;
}

export interface Subject {
  userId: string;
  /** Who they report to here, from their membership (`reportsToUserId`). */
  reportsToUserId: string | null;
}

const isThemselves = (r: Reader, s: Subject) => r.userId === s.userId;
const isAnAdminHere = (r: Reader) => r.role === 'ADMIN';
const isTheirManager = (r: Reader, s: Subject) => !!r.role && r.role !== 'GUEST' && !!s.reportsToUserId && s.reportsToUserId === r.userId;

export const mayReadTheCv = (r: Reader, s: Subject): boolean => isThemselves(r, s) || isAnAdminHere(r) || isTheirManager(r, s);
export const mayChangeTheCv = (r: Reader, s: Subject): boolean => isThemselves(r, s) || isAnAdminHere(r);
export const mayReadTheEmergencyContact = (r: Reader, s: Subject): boolean => isThemselves(r, s) || isAnAdminHere(r);
export const mayChangeTheEmergencyContact = mayReadTheEmergencyContact;

/** The files a CV may be. Word is .doc or .docx. */
export const A_CV_MAY_BE: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
export { MOST_A_FILE_MAY_WEIGH as MOST_A_CV_MAY_WEIGH } from '../../common/the-most-a-file-may-weigh';

export const NOT_A_CV = 'A CV has to be a PDF or a Word file. Choose one of those and add it again.';
