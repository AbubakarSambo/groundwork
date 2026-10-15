import { GroundScenario } from '@prisma/client';
import { BoardFamily, familyFor, SCENARIO_FAMILY } from '../board/board-families';

/**
 * THE ONE PLACE A CHECK-IN IS KNOWN TO BE AN EVALUATION CHECK-IN.
 *
 * Decision 6, clarified 29 September: "the check-ins where a verdict is reached are the evaluation
 * check-ins of decision 17." Decision 17 names them itself: "a performance plan, a promotion and a
 * renewal." Those three are not a new list - they are exactly `board-families.ts`'s `BoardFamily.
 * EVALUATION`, which already carries the same three scenarios (PIP, RECOGNITION, CONTRACT_RENEWAL)
 * under the same reasoning ("the output stays close"). `reports.service.ts` already tests this
 * exact equality in one place (`aboutOnePerson`), and `peers-are-named.ts` already builds its own
 * evaluative check from the same family. This file gives that one test a name, so a fourth place
 * that needs to know cannot invent a fifth list that drifts from the other four.
 *
 * NEW_HIRE, NEW_MANAGER and NEW_ADVISOR are ONBOARDING, not EVALUATION - ramping someone in is a
 * different situation from deciding whether they keep their job, even though both involve a person
 * who is new (see the note on `SCENARIO_FAMILY`). COHORT_CHECK is its own family: many people
 * against one shared bar, not one person under review with colleagues giving views about them.
 */
/**
 * THE SCENARIOS, AS A LIST, for a database query that cannot call the function above (the list of
 * check-ins an admin may see, request 78) and for the screens, which are told the same list in
 * `docs/answers-from-engine.md`. Built from the same family, so it cannot drift from `isEvaluationCheckIn`.
 */
/**
 * A PROBATION, OR A NEW PERSON'S FIRST 90 DAYS, IS AN EVALUATION CHECK-IN TOO (decision 75, item 25). The
 * prototype reaches a verdict on Kwame's "first 90 days" ("Groundwork suggests keeping Kwame on"), and Hafsah
 * decided that is right: whether a new person is kept at the end of their probation is a decision about one
 * person. A probation and a first 90 days are NEW_HIRE (entry/which-situation-this-is.ts sends both there).
 *
 * Its board keeps the onboarding shape (board-families.ts is unchanged): this list decides who reads it, who is
 * named to whom, and whether a verdict is reached, never the shape of the board. NEW_MANAGER and NEW_ADVISOR
 * are not on it: nobody decided that a manager's or an advisor's first weeks end in a verdict.
 */
const ALSO_AN_EVALUATION: GroundScenario[] = ['NEW_HIRE' as GroundScenario];

export const EVALUATION_SCENARIOS: GroundScenario[] = [
  ...(Object.keys(SCENARIO_FAMILY) as GroundScenario[]).filter((s) => SCENARIO_FAMILY[s] === BoardFamily.EVALUATION),
  ...ALSO_AN_EVALUATION,
];

export function isEvaluationCheckIn(scenario: GroundScenario | null | undefined): boolean {
  if (!scenario) return false;
  return familyFor(scenario) === BoardFamily.EVALUATION || ALSO_AN_EVALUATION.includes(scenario);
}

/** A participant, as far as picking out the subject of an evaluation check-in needs to know one. */
export interface AParticipantForTellingTheSubject {
  id: string;
  partyType: string;
  managingOnly?: boolean | null;
  createdAt?: Date | string | null;
}

/**
 * THE PERSON THIS EVALUATION CHECK-IN IS ABOUT.
 *
 * Nothing in the schema says which participant a PIP, a renewal or a recognition round is FOR - only
 * `PartyType.INITIATOR` (who set it up) and `PartyType.PARTICIPANT` (everybody else) exist. For PIP
 * and CONTRACT_RENEWAL that is never ambiguous: the packs describe exactly two people, the one who
 * set it up and the one it is about (contract_renewal__initiator.md: "they are not the subject of
 * it... they are still not the person this check-in is about"). RECOGNITION can add more: its pack
 * asks the lead "who else would know", which invites colleagues onto the same ground to give a view
 * about the person being recognised, not about themselves.
 *
 * So where there is more than one non-lead party, this takes the EARLIEST one added - the person the
 * check-in was opened for - and treats anyone added after them as a colleague giving a view about
 * that person. This is a judgement call, not something written down anywhere else in the product:
 * flagged for Hafsah to confirm, the same way request 36's colleague-naming order was. It only ever
 * matters for RECOGNITION today, since PIP and CONTRACT_RENEWAL are always exactly two people.
 *
 * A managing-only party gives no account of their own and is never the subject of one.
 */
export function theSubjectOfAnEvaluationCheckIn(
  participants: readonly AParticipantForTellingTheSubject[] | null | undefined,
): string | null {
  const nonLead = (participants ?? [])
    .filter((p) => p && p.partyType !== 'INITIATOR' && !p.managingOnly)
    .slice()
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return at - bt;
    });
  return nonLead[0]?.id ?? null;
}

/**
 * WHETHER THIS VIEWER IS THE SUBJECT OF THIS EVALUATION CHECK-IN, AND SO GETS THE FACTS INSTEAD OF
 * COLLEAGUES' EXACT WORDS.
 *
 * False for the lead (the manager who runs it, and an admin - "an admin is treated like the manager",
 * morning report, 29 September, item 4: decision 5 already keeps a performance plan from an admin
 * with no access, so one who does have access reads it as the manager does). False for a colleague
 * giving a view: they read what they read today. True only for the one non-lead party this check-in
 * is about, reading their own copy.
 */
export function viewerIsTheSubjectOfAnEvaluationCheckIn(v: {
  scenario: GroundScenario | null | undefined;
  isLead: boolean;
  viewerParticipantId: string | null | undefined;
  participants: readonly AParticipantForTellingTheSubject[] | null | undefined;
}): boolean {
  if (v.isLead || !v.viewerParticipantId) return false;
  if (!isEvaluationCheckIn(v.scenario)) return false;
  return theSubjectOfAnEvaluationCheckIn(v.participants) === v.viewerParticipantId;
}
