import { whatEachLabelIsCalled, withoutInternalLabels, withoutInternalLabelsIn, youTakesItsVerb } from './no-internal-label-reaches-anyone';
import type { LabelParty } from './party-labels';

/**
 * A STAND-IN LABEL NEVER REACHES A READER, WHICHEVER ROAD THE TEXT TOOK (decision 139, item 1).
 *
 * Reports are stored without names: "the initiator", "Participant A", "Participant B". Names go in only
 * when the text is served, through the report's own door (`ReportsService.theReportAsItWasShared`), which
 * also keeps a copy shared without names free of anybody's name. The final evaluation (11 October 2026)
 * found two roads that never went through it:
 *
 *   - the check-in page served the lead and the admin the stored agreements and differences as they were
 *     kept: "The price list has been sent by Participant B.", "A 30-day plan is in place for Participant A's
 *     onboarding.";
 *   - the lead's own conversation was handed a finding from the stored report and said it word for word:
 *     "Samuel's own account reads: Participant A's own account of calls has risen from 6 a day to 10".
 *
 * Each road now goes through the door. This is the last line behind it, for a road nobody has found yet:
 * any stand-in label still left in what a reader is served, or in what a conversation is handed, becomes
 * what this reader may call that person. Their name where this reader may read it, otherwise the same plain
 * words every other surface uses ("a colleague", "the lead"). On a report shared without names, a reader
 * who does not run the check-in is never given a name here either: every label becomes plain words, as the
 * door's own anonymous copy has them.
 */

export interface TheReader {
  /** The reader's own row in the check-in, when they take part in it. */
  participantId: string | null;
  /** Runs the check-in (its lead, the admin who set it up, or an admin who reads it as the lead does). */
  isLead: boolean;
  /** Whether this check-in names people to each other, for this reader (`peersAreNamedOn`). */
  peersAreNamed: boolean;
  /** The report was shared without names (`sharedAs === 'ANONYMOUS'`). */
  sharedWithoutNames?: boolean;
}

/** What this reader calls each label. On a copy shared without names, nobody is named to a reader who does not run it. */
export function whatThisReaderCallsEachLabel(parties: LabelParty[] | null | undefined, reader: TheReader): Map<string, string> {
  const people = (parties ?? []) as any[];
  const withoutNames = !!reader.sharedWithoutNames && !reader.isLead;
  const asTheyMayBeCalled = withoutNames
    ? people.map((p) => ({ ...p, nameGiven: null, organisationGiven: null, email: null, user: p?.user ? { ...p.user, firstName: null, lastName: null, email: null } : p?.user }))
    : people;
  return whatEachLabelIsCalled(asTheyMayBeCalled as LabelParty[], {
    viewerParticipantId: reader.participantId,
    viewerIsLead: reader.isLead,
    peersAreNamed: withoutNames ? false : reader.peersAreNamed,
    readerIsYou: true,
  });
}

const A_STAND_IN = /\b(?:[Tt]he initiator|[Pp]articipants? [A-Z]{1,2})\b/;

/** Whether a piece of text still carries a stand-in label. */
export function carriesAStandInLabel(text: string | null | undefined): boolean {
  return !!text && A_STAND_IN.test(text);
}

/**
 * One string, with any stand-in label said the way this reader may read it. NEVER INSIDE QUOTATION MARKS: there it
 * is either somebody's own words, or one of the engine's rules naming the label it must not write ('Never write
 * "the initiator"'), and turning that into a name would rewrite the rule into nonsense.
 */
export function noStandInLabelIn(text: string, called: Map<string, string>): string {
  if (!carriesAStandInLabel(text)) return text;
  const named = text.split(/("[^"\n]*"|“[^”\n]*”)/).map((part, i) => (i % 2 ? part : withoutInternalLabels(part, called))).join('');
  /* A label said as "you" takes the verb that goes with it ("Is you waiting" was read on the lead's line), and a name is
     not said twice over in one breath ("Samuel Owino says Samuel Owino is"). Both only outside quotation marks. */
  return theSameNameNotSaidTwice(youTakesItsVerb(named));
}

const SAYING = '(?:says|said|thinks|thought|believes|believed|feels|felt|reports|reported|explains|explained|admits|admitted|mentions|mentioned)';

/**
 * A NAME NOT SAID TWICE IN ONE BREATH (decision 139, item 1, left from change 1). The model writes "Participant A says
 * Participant A is still figuring out Participant A's role"; named, that read "Samuel Owino says Samuel Owino is still
 * figuring out Samuel Owino's role". After a verb of saying, the same name again becomes "they", and its "'s" in the
 * same sentence "their". Narrow on purpose: only the person who is speaking, only straight after the verb of saying,
 * only with "is", "was", "has" or a past-tense verb after it, so the verb agrees without guessing.
 */
export function theSameNameNotSaidTwice(text: string): string {
  if (!text) return text;
  return text.split(/("[^"\n]*"|“[^”\n]*”)/).map((part, i) => (i % 2 ? part : part.replace(
    new RegExp(`\\b([A-Z][\\w'’-]*(?: [A-Z][\\w'’-]*){0,2}) (${SAYING}) (that )?\\1 (is|was|has|had|[a-z]+ed)\\b([^.?!\\n]*)`, 'g'),
    (_m, name: string, verb: string, that = '', aux: string, rest: string) => {
      const agreed = ({ is: 'are', was: 'were', has: 'have' } as Record<string, string>)[aux] ?? aux;
      const ownLater = rest.split(`${name}'s`).join('their').split(`${name}’s`).join('their');
      return `${name} ${verb} ${that}they ${agreed}${ownLater}`;
    },
  ))).join('');
}

/** Everything a reader is served, walked. Ids and addresses are left as they are (see withoutInternalLabelsIn). */
export function noStandInLabelAnywhereIn<T>(value: T, called: Map<string, string>): T {
  return withoutInternalLabelsIn(value, called);
}
