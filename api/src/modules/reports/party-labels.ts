import { PartyType } from '@prisma/client';
import { theNameInAnAddress } from './the-name-in-an-address';
import { fromTheReadersSide, noInstructionToAskYourself, theirOwnIsTheReaders } from './a-sentence-from-the-readers-side';
import { aNameInTheirWordsIsTheLabel } from './a-name-in-their-words-is-the-label';
import { theShortNameOf } from './a-title-is-not-a-first-name';
import { theQuotesKept } from './a-quote-is-what-they-said';
import { aPlainerWord } from './a-plainer-word';
import { aNameSaidTwiceInARow, aNameSaidAgainInOneSentence } from './a-name-said-twice-in-a-row';
import { aSurnameOrNothing } from './a-title-is-not-a-first-name';
import { nobodyWaitsOnThemselvesInAStory } from './nobody-waits-on-themselves-in-a-story';
import { peopleDisagreeInASentence } from './people-disagree-in-a-sentence';

export type LabelParty = {
  id: string;
  partyType: PartyType;
  roleAsDescribed?: string | null;
  /**
   * WHEN THEIR ROW WAS MADE, WHICH IS WHAT THE LETTERS ARE ORDERED BY.
   *
   * Optional because most callers already select it and the rest fall back to the id. It is not
   * decoration: see the note on `labelsForParties` about the ten agribusinesses.
   */
  createdAt?: Date | string | null;
  /** The address on their row: the one the lead typed, and the only handle a person who has not joined yet has. */
  email?: string | null;
  /** The name they typed at the end of an open-link check-in; they have no User row to carry one. */
  nameGiven?: string | null;
  organisationGiven?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

/**
 * The label each party is known by inside a report.
 *
 * Reports are written and stored WITHOUT personal names. The synthesis prompt is
 * told never to use one, and the parties reach the model as "the initiator" and
 * "participant A". That is worth keeping: a stored artefact with no names in it
 * cannot leak a name, whoever eventually reads it or wherever it is copied.
 *
 * Names are ADDED back at the read instead, for the readers entitled to them.
 * That is the opposite direction to the guide sanitiser, which strips at the
 * read, and it is safer for the same reason: the default is the private one, and
 * a bug shows up as a missing name rather than as an exposed one.
 *
 * Extracted so the write path and the read path derive the same labels from the
 * same participants. Two copies of this would drift, and a drifted label is a
 * name that silently stops resolving.
 */
/**
 * A LETTER FOR THE NTH PERSON, AND THE ALPHABET RUNS OUT.
 *
 * This was `String.fromCharCode(65 + n)`, which is A to Z and then whatever comes after Z in ASCII.
 * The twenty-seventh person was "Participant [", the thirty-third was "Participant a" - and that
 * one collides with "Participant A" case-insensitively, so the collision guard below threw and the
 * whole ground lost its report. Found by running a convening of forty: the check-in could not even
 * be opened, 500 on the first request anybody made.
 *
 * Spreadsheet columns: A to Z, then AA, AB, AC. The first twenty-six are unchanged, so every label
 * already written into a stored report still resolves.
 */
export function aLetterFor(n: number): string {
  let out = '';
  let i = n;
  while (i >= 0) {
    out = String.fromCharCode(65 + (i % 26)) + out;
    i = Math.floor(i / 26) - 1;
  }
  return out;
}

/**
 * WHOSE LETTER IS WHOSE CANNOT DEPEND ON THE ORDER A QUERY HAPPENED TO RETURN.
 *
 * Live run, 24 September 2026. Ten agribusinesses answered one open link. The shared report said:
 *
 *   "Ibrahim (Danladi Grains) said this was for: It's about having more trucks, first...
 *    if they go all that way and the customer doesn't take it, then what? ... the tomatoes spoil."
 *
 * Every one of those sentences is Chidinma Okeke's, at Freshline Cold Chain. Ibrahim aggregates
 * maize and soya and has never owned a truck. One stranger's words, published in a shared report
 * under another company's name.
 *
 * Nothing was wrong with the record - all seven truck-and-tomato lines sit on Chidinma's
 * participant - and nothing was wrong with the stored report, whose findings carried the right
 * participantId for every one. The fault is here. Letters are handed out BY ARRAY POSITION, so the
 * label a person gets depends on the order the rows arrived in. The write path fetched them
 * `orderBy: createdAt asc`. The read path used `include: { participants: ... }` with no ordering at
 * all, and Postgres does not owe an unordered query any particular order - least of all after ten
 * UPDATEs, which is what ten people finishing an open link does to those rows.
 *
 * So the read's letters drifted one place from the write's, and "Participant B" resolved to the
 * person who had been "Participant A".
 *
 * FIXED HERE RATHER THAN BY ORDERING FOURTEEN CALLERS. Labelling is meant to be a pure function of
 * the parties - its own comment says the two paths must "derive the same labels from the same
 * participants" - and a function whose answer depends on its argument's order is not that. It
 * sorts its own copy, by the same key the write path used, so every existing label keeps its
 * meaning and no caller can get it wrong again.
 */
function inAStableOrder(parties: LabelParty[]): LabelParty[] {
  const when = (p: LabelParty): number => {
    const t = p.createdAt ? new Date(p.createdAt as any).getTime() : NaN;
    return Number.isFinite(t) ? t : NaN;
  };
  /*
   * ONLY WHERE THE DATA CAN ANSWER IT, AND THE ORDER IS OTHERWISE LEFT ALONE.
   *
   * My first version fell back to sorting by id when a caller had not selected `createdAt`. Three
   * existing guards caught it in one run, and one of them failed OPEN: "participant B said the
   * handover was late" - the sentence a participant must see unresolved - came back as "Abubakar B
   * said the handover was late". Reordering a list somebody assembled deliberately is a way to
   * hand one person another person's label, which is the bug this function is being fixed FOR.
   *
   * So the sort applies when every party carries a real createdAt, which every caller that reaches
   * a real database now does, and is a no-op otherwise. A caller with no timestamps keeps exactly
   * the order it passed, which is what it has always had.
   */
  const times = parties.map(when);
  if (!times.length || times.some((t) => !Number.isFinite(t))) return parties;
  return [...parties].sort((a, b) => when(a) - when(b) || String(a.id).localeCompare(String(b.id)));
}

/** The label every check-in gives the person who set it up. Written once, read in two places. */
export const THE_LEADS_LABEL = 'the initiator';

export function labelsForParties(unordered: LabelParty[]): Map<string, string> {
  const parties = inAStableOrder(unordered);
  const labelById = new Map<string, string>();
  let participantIdx = 0;

  /**
   * Count how many parties share each role, so same-role people can be told apart
   * (e.g. six "Field officer"s become "Field officer A/B/...").
   *
   * THE INITIATOR IS COUNTED HERE TOO, AND THAT IS THE FIX.
   *
   * This used to count non-initiators only, while the initiator's label was taken
   * raw from their own role a few lines below with no disambiguation at all. So an
   * initiator whose remit matched a participant's role - "Managing the contract" on
   * both, entirely ordinary - produced the SAME label for two different people.
   *
   * That is not cosmetic. `own-reads-only.ts` keeps per-person rows by
   * `row.label === viewerLabel`, so two parties sharing a label means the filter
   * hands one of them the other's private quality read: the exact disclosure that
   * file exists to prevent, arriving through the labelling rule rather than through
   * the filter.
   *
   * Note the asymmetry that made it invisible: a label that DRIFTS fails safe,
   * because an allow-list filter simply stops matching and the viewer loses their
   * own row. A label that COLLIDES fails open. Only the second is a leak, which is
   * why the invariant at the end of this function checks uniqueness rather than
   * checking for names.
   */
  /*
   * A ROLE DESCRIPTION IS NOT A NAME, AND THIS USED TO MAKE IT ONE.
   *
   * The label was `roleAsDescribed` wherever somebody had one. `roleAsDescribed` is free text a
   * lead types when adding a person, and leads type a sentence. So the twenty-four-scenario run of
   * 25 September produced, in the middle of a paragraph:
   *
   *   "Apply the checklist from the Relationship officer, Surulere. Target 14 approved facilities
   *    this quarter. to the work of the other officers."
   *
   * The label has two full stops inside it, so it ends the sentence twice and the remainder starts
   * in lower case. That is problems 4, 6 and 8 of the twelve, all produced by one decision.
   *
   * IT ALSO COULD NOT BE SWAPPED FOR A NAME. Every label is substituted at the read, and the
   * substitution is a string match - a label that IS a sentence matches nothing reliable, so these
   * people were never named even to readers entitled to their names.
   *
   * So the label is now positional and nothing else: "the initiator", "Participant A", "Participant
   * B". Short, unique by construction, and a clean string to swap for a name. The role is not lost;
   * it lives on the participant row and is shown where a role belongs, which is not in place of
   * somebody's name.
   *
   * WHAT THIS BREAKS, SAID PLAINLY: a report stored before this change holds role-shaped labels in
   * its prose, and those no longer resolve to anybody. Every ground in this database is ours and
   * the corpus is re-run, so the cost is a re-synthesis rather than a migration.
   */
  for (const p of parties) {
    if (p.partyType === PartyType.INITIATOR) {
      labelById.set(p.id, THE_LEADS_LABEL);
    } else {
      /*
       * A PROPER NOUN, BECAUSE IT STANDS WHERE A NAME WOULD.
       *
       * Lowercase, this produced three registers in one list: "Hafsah", "participant A",
       * "Tunde Okafor (you)". Two of them are names and the third reads as a system placeholder
       * that failed to resolve, which is the wrong reading - it is the permission rule working,
       * and somebody who may not see a name should still see a person.
       *
       * Substitution back into prose is case-insensitive (see withNames).
       */
      labelById.set(p.id, `Participant ${aLetterFor(participantIdx++)}`);
    }
  }

  /**
   * FAIL CLOSED ON A COLLISION RATHER THAN RETURNING ONE.
   *
   * Everything above is designed to make labels unique, and this asserts that it
   * actually did. If two parties ever share a label again - a new party type, a new
   * naming branch, a role containing the disambiguating suffix already - the read
   * path must not silently serve one person another's rows. Throwing loses the
   * report for that ground until it is fixed, which is the cheaper failure.
   */
  const seen = new Map<string, string>();
  for (const [id, label] of labelById) {
    const key = label.toLowerCase();
    const prior = seen.get(key);
    if (prior) {
      throw new Error(
        `Party label collision on this ground: "${label}" resolves to both ${prior} and ${id}. ` +
          'Per-person report rows are filtered by label, so a shared label would disclose one ' +
          "party's private read to another.",
      );
    }
    seen.set(key, id);
  }

  return labelById;
}

/** The name to show for someone, falling back sensibly when a name is missing. */
export function displayName(p: LabelParty, theEmailIsFair = false): string | null {
  /*
   * AND WHO THEY ANSWERED FOR, WHERE THEY SAID.
   *
   * On a check-in run across a network, "Adaeze Nwosu" is not the unit anybody reads for -
   * "Adaeze Nwosu (Harvestline Foods)" is. The organisation is only ever appended to a name that
   * was already going to be shown, so it reaches exactly the readers the name reaches and no
   * others: a peer who sees "participant C" still sees "participant C".
   */
  const forWhom = (p as any).organisationGiven?.trim();
  const withOrg = (n: string) => (forWhom ? `${n} (${forWhom})` : n);
  const first = p.user?.firstName?.trim();
  const last = aSurnameOrNothing(p.user?.lastName);
  if (first) return withOrg(last ? `${first} ${last}` : first);
  /* The name they gave at the end of an open link is theirs to be read by, the same as a sign-in's. */
  if (p.nameGiven?.trim()) return withOrg(p.nameGiven.trim());
  /*
   * AND THE ROSTER THAT NAMED HALF OF ITSELF.
   *
   * Read on a live report: "Amina Yusuf - Answered. Sahar Bello - Answered. Participant C -
   * Answered. Participant D - Answered." Two colleagues by name and two by letter, on one line,
   * for no reason a reader could see: C and D had simply never set a name, so their side fell
   * back to the label the report is stored with. It reads as the product losing track of who is
   * in the room.
   *
   * The lead typed these addresses and reads them on the ground page already, so for a reader
   * entitled to their identity the address is the honest name. No first name is invented from it:
   * a person's own name is theirs to give, and guessing "Hafsah Click" out of an address is the
   * kind of helpfulness this codebase strips everywhere else.
   *
   * Never to a peer, which is what `theEmailIsFair` gates - see namesVisibleTo.
   */
  /*
   * NEVER AN ADDRESS AS A NAME. Hafsah, 28 September 2026 (screens requests 56, 58, 65): "A lead never
   * sees 'Start with zawadi.u8@example.test'; use the person's name, or a plain sentence when there
   * isn't one." This used to return the address to a reader entitled to it, so the model and every
   * sentence built from this wrote the address where a name belongs. Somebody with no name now gets
   * the plain words every surface uses ("a colleague", "another colleague"; see plainWordsByPerson).
   * The lead still sees the address where a list shows it beside the person, never as their name.
   * `theEmailIsFair` is kept so callers need not change; it no longer turns an address into a name.
   */
  void theEmailIsFair;
  /* The name the address holds ("amani.wekesa@" is Amani Wekesa), the same read the Context tab makes. Not the address itself. */
  const inTheAddress = theNameInAnAddress(p.email ?? p.user?.email);
  return inTheAddress ? withOrg(inTheAddress) : null;
}

/**
 * WHOSE NAME THIS READER IS ALLOWED TO SEE.
 *
 * The lead sees everyone. It is their ground, their team, and a report about
 * their own people written in "participant A" is unreadable - which is exactly
 * what it had become.
 *
 * Everyone else sees themselves and the lead, and nobody else. A new hire
 * reading the shared report must never find "Kavon said the handover was late":
 * that is a colleague's private account attributed to them, in front of the
 * person it is about, and it turns a shared picture into evidence. The colleague
 * stays behind their role label, which is still honest about where the account
 * came from without naming who gave it.
 *
 * Notice the shape: this decides ACCESS, not wording. It is applied in code on
 * the way out, not requested of a model on the way in.
 */
/**
 * WHOSE EYES A READER READS WITH. W8-73.
 *
 * Both the report and the board need the same answer to the same question, and both had
 * written it out inline - the report as `asWhom`, the board not at all, which is how the
 * board came to show a lead their own ground in placeholders.
 *
 * A lead of THIS ground - or the admin who set it up - reads with every name, because they
 * already see the whole ground. Anybody else reads as themselves. `null` means a reader who
 * is not a party at all, and `namesVisibleTo` gives them only the names that are public to
 * the ground.
 *
 * One function, so the two answers cannot drift apart, and testable on its own - which is
 * the reason it exists rather than staying two expressions. A bite-check of the board's copy
 * found nothing, because the only tests of the rule called `namesVisibleTo` directly and
 * never went through the resolution.
 */
export function readsWithNamesOf(
  { viewerIsLead, viewerParticipantId, parties }:
  { viewerIsLead: boolean; viewerParticipantId: string | null | undefined; parties: LabelParty[] },
): string | null {
  if (viewerIsLead) {
    const lead = parties.find(p => p.partyType === PartyType.INITIATOR);
    return lead?.id ?? viewerParticipantId ?? null;
  }
  return viewerParticipantId ?? null;
}

/**
 * WHETHER PEOPLE IN THIS CHECK-IN ARE NAMED TO EACH OTHER, WHICH IS ALREADY A SETTING.
 *
 * This read gave a participant the lead's name, their own, and nobody else's, always - so a report
 * carried three registers at once ("Hafsah", "Participant A", "Tunde Okafor (you)") and the middle
 * one read as a placeholder that had failed to resolve.
 *
 * Meanwhile the product had already answered this question, deliberately, in a setting whose own
 * copy says "each person sees the others by name": `Ground.peersVisibleToEachOther`, defaulting by
 * scenario - hidden on an EVALUATION or COHORT check-in, where a roster tells people exactly who
 * they are measured against, and shown everywhere else. The board reads it. The check-in page reads
 * it. The report did not, so the one surface everybody opens disagreed with the setting and with
 * the roster three inches above it.
 *
 * WHAT IS STILL WALLED IS THE WORDS. Knowing Zainab is in this and reading what Zainab wrote are
 * different things, and only the second was ever protected here: whose lines reach a reader is
 * decided by `readableParticipantIds` and by the release rules. Nothing about this changes that.
 */
export function namesVisibleTo(
  viewerParticipantId: string | null | undefined,
  parties: LabelParty[],
  /** From the ground. Undefined keeps the old behaviour, for callers that have no ground to hand. */
  peersVisibleToEachOther?: boolean,
): Map<string, string> {
  const labels = labelsForParties(parties);
  const visible = new Map<string, string>();

  const viewer = parties.find(p => p.id === viewerParticipantId);
  const viewerIsLead = viewer?.partyType === PartyType.INITIATOR;

  for (const p of parties) {
    const label = labels.get(p.id);
    /* The address stands in for a name only where the whole identity is already this reader's to
       see: their own row, and the lead's view of their own team. Never peer to peer. */
    const isSelf = p.id === viewerParticipantId;
    const name = displayName(p, viewerIsLead || isSelf);
    if (!label || !name) continue;

    const isLead = p.partyType === PartyType.INITIATOR;

    if (peersVisibleToEachOther || viewerIsLead || isSelf || isLead) visible.set(label, name);
  }

  return visible;
}

/**
 * Put the allowed names back into a piece of report text.
 *
 * Longest labels first, so "delivery lead A" is replaced before "delivery lead"
 * and cannot be left as "Kavon A". Case-insensitive because the model writes
 * "The initiator" at the start of a sentence and "the initiator" mid-sentence,
 * and a label that only half-resolves reads worse than one that never does.
 */
/**
 * The label belonging to the person reading, so the report can address them directly.
 *
 * `namesVisibleTo` already computes `isSelf` and then throws it away, mapping the reader's own
 * label to their own name like anybody else's. So a person opened their private report and read
 * "Hafsah Jumare described their role as building a new MVP" - about themselves, in the third
 * person, with a pronoun that is not even theirs. Nothing was broken; the reader was simply never
 * distinguished from the people being described to them.
 */
export function viewerLabelOf(
  viewerParticipantId: string | null | undefined,
  parties: LabelParty[],
): string | null {
  if (!viewerParticipantId) return null;
  return labelsForParties(parties).get(viewerParticipantId) ?? null;
}

/**
 * THE HANDLE IN A LABEL. A label is the role as the person described it, and people describe it in a
 * paragraph: "Managing Partner of Sable Behavioural, a behavioural science firm working across
 * Africa. I hired the new Engagement Director." The model, sensibly, writes "the Managing Partner".
 * The exact-label substitution then matches nothing, so the reader was called by their own role in
 * the third person on their own report, and on a difference card the other side was captioned with
 * the whole paragraph, in capitals (20 Sep 2026). The handle is the role phrase: up to the first
 * full stop, comma, "at", "of", "for", "in" or dash, without a leading "I am".
 */
export function handleOf(label: string): string {
  const first = (label ?? '').trim().split(/[.,;:(]|\s+-\s+/)[0] ?? '';
  const cut = first.split(/\s+(?:at|of|for|in|with|who|and)\s+/i)[0];
  const words = cut.replace(/^(?:i am|i'm|i work as|the)\s+(?:a|an|the)?\s*/i, '').trim().split(/\s+/).filter(Boolean);
  const handle = words.slice(0, 4).join(' ');
  return handle || (label ?? '').trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const withoutTrailingStop = (s: string) => (s ?? '').trim().replace(/[.!?,;:]+$/, '');

/**
 * A NAME IS NOT A TITLE, AND IT DOES NOT END A SENTENCE IT IS IN THE MIDDLE OF.
 *
 * Run of 25 September 2026, in the lead's own report: "The Daniel Osei. has completed a churn
 * model", "The Priti Sharma. is managing access requests". 55 of these across 19 scenarios.
 *
 * Neither artefact comes from the name. The model wrote "The <label>." - the article because a
 * label reads like a role, and the stop because the label it had been given ended in one - and the
 * substitution put a person inside both. Labels are positional now, which makes the second half
 * rarer, but the model will still write "The Participant A" because that is how you refer to a
 * label in English.
 *
 * So it is cleaned after substitution, where both halves are visible at once: an article
 * immediately before a name that is a real person's name goes, and a full stop between that name
 * and a word that carries the same sentence on goes with it.
 */
export function aNameIsNotATitle(text: string, names: Iterable<string>): string {
  let out = text;
  for (const name of names) {
    if (!name?.trim()) continue;
    const n = escapeRe(name.trim());
    /* "The Daniel Osei." mid-sentence -> "Daniel Osei". The stop only goes when a lower-case word
       follows it, because a stop that genuinely ends the sentence must stay. */
    out = out.replace(new RegExp(`\\b[Tt]he ${n}\\.(?=\\s+[a-z])`, 'g'), name);
    /* "Daniel Osei. has completed" -> "Daniel Osei has completed". */
    out = out.replace(new RegExp(`\\b${n}\\.(?=\\s+[a-z])`, 'g'), name);
    /* "The Daniel Osei is" -> "Daniel Osei is". Sentence-initial "The" keeps its capital. */
    out = out.replace(new RegExp(`(^|[.!?]\\s+)[Tt]he ${n}\\b`, 'g'), (_m, lead: string) => `${lead}${name}`);
    out = out.replace(new RegExp(`\\b[Tt]he ${n}\\b`, 'g'), name);
  }
  return out;
}

/**
 * "PARTICIPANTS A, B, AND C" IS THREE LABELS, AND THE SUBSTITUTION SAW NONE OF THEM.
 *
 * Read on the lead's own board of the sales check-in, 26 September 2026, about her own team:
 *
 *   "You believe the target is collective, while Participants A, B, and C all believe they are
 *    working towards individual targets."
 *
 * Three real people left as placeholders in front of the one reader entitled to all three names.
 * The labels are "Participant A", "Participant B" and "Participant C"; the model collapsed them
 * into a plural, and every substitution below matches word-bounded, so "Participants" matches
 * nothing at all. It is invisible to the scorer for the same reason.
 *
 * SO THE PLURAL IS EXPANDED BACK INTO SINGULARS BEFORE ANYTHING ELSE RUNS, and then the ordinary
 * machinery does the rest: each one is named for the reader who may see it, the reader's own
 * becomes "you", and one that may not be named stays a label. Nothing here knows about names,
 * which is why it is a rewrite of the label text rather than a second naming rule.
 *
 * ONLY WHERE EVERY LETTER IS A LABEL WE ACTUALLY HANDED OUT, and only for two or more of them.
 * Same discipline as the bare-label tidy-up further down: where it cannot be certain what it is
 * looking at, it does nothing. "Participants A and I" is left alone rather than inventing a
 * "Participant I", and a lone "Participants" with no letters after it is not touched.
 */
export function pluralLabelsBecomeSingular(text: string, known: Iterable<string>): string {
  const labels = new Map<string, string>();
  for (const l of known) {
    const m = /^participant\s+([A-Z]+)$/i.exec((l ?? '').trim());
    if (m) labels.set(m[1].toUpperCase(), (l ?? '').trim());
  }
  if (labels.size < 2) return text;

  /*
   * NO `i` FLAG, AND THAT IS NOT A STYLE CHOICE. With one, `[A-Z]+` matches lower case too, so the
   * list swallowed the word "and" out of "A, B, and C" and then refused the whole match because
   * "and" is not a label. The letters are upper case by construction (see aLetterFor), so matching
   * them strictly is both correct and what keeps "and" out.
   */
  return text.replace(
    /\b[Pp]articipants\s+([A-Z]+(?:\s*,\s*[A-Z]+)*)(?:\s*,)?(?:\s+and\s+([A-Z]+))?/g,
    (whole: string, list: string, last: string | undefined) => {
      const letters = [
        ...list.split(',').map((x) => x.trim()),
        ...(last ? [last.trim()] : []),
      ].filter(Boolean);
      /* Two or more, and every one of them a label this check-in actually handed out. */
      if (letters.length < 2) return whole;
      const resolved = letters.map((x) => labels.get(x.toUpperCase()));
      if (resolved.some((x) => !x)) return whole;
      const names = resolved as string[];
      /* "Participant A, Participant B and Participant C" - the last joined with "and", which is
         how a person writes a list, and how the rest of this file writes one. */
      return names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    },
  );
}

/**
 * WHAT SOMEBODY IS CALLED WHEN THIS READER MAY NOT HAVE THEIR NAME.
 *
 * Read live on run-1, in the report Amara Diallo opens about her own launch:
 *
 *   "Participant B built the front end for the project. Participant B says the hardest part of
 *    the work was Victor's script."
 *
 * and in the one Blessing Okafor opens about the logistics contract:
 *
 *   "Participant B says the most frequent issue has been around handover times."
 *
 * Nothing is leaking. Both are evaluation check-ins, where `peersAreNamed` is false and a
 * colleague's name deliberately never reaches the person being reviewed. The rule is right; the
 * WORD is wrong. "Participant B" is a slot in a template, and reading it about yourself makes the
 * product look like it has lost track of who is in the room.
 *
 * HAFSAH DECIDED THE WORD, 26 September 2026: "in evaluation check-ins (PIP, RECOGNITION,
 * CONTRACT_RENEWAL), colleagues stay unnamed to the person being reviewed. Use plain words:
 * 'a colleague' when there is one; 'one colleague', 'another colleague' when there are several,
 * used the same way through the whole report. Never 'Participant B', and never a job title or
 * detail that would give them away."
 *
 * HER WORDS COVER ONE AND TWO. A cohort can have more, so the same pattern is carried on - "a
 * third colleague", "a fourth colleague" - and beyond the twelfth everybody left is "another
 * colleague", which says less rather than more and so cannot give anybody away. That extension is
 * mine and is flagged to her.
 *
 * THE SAME PERSON IS THE SAME PHRASE EVERYWHERE THIS READER LOOKS. The order comes from the
 * parties themselves - `labelsForParties` hands its labels out in a stable order, and this walks
 * them in that order - and not from the order sentences happen to mention people in. So whoever is
 * "a colleague" in the shared picture is "a colleague" in the judgement, in the divergences,
 * and on the board.
 *
 * AND NEVER A JOB TITLE. The branch this replaces printed `handleOf(label)` for a long label,
 * which is a role description - "Relationship officer" - handed to the very person the check-in is
 * about. A phrase that carries no detail cannot do that.
 *
 * THE LEAD IS NOT A COLLEAGUE. `namesVisibleTo` always offers the lead's name to everybody, so the
 * lead is unnameable only when the product holds no name for them at all: `User.firstName` is a
 * required column but `PATCH /auth/profile` trims what it is given and accepts an empty string, so
 * a lead who blanks their first name has no name to show a peer. That reader still knows who the
 * lead is, so they read "your lead" rather than a placeholder, and a reader who is not on the
 * check-in at all reads "the lead".
 */
const AFTER_THE_SECOND = [
  'a third colleague', 'a fourth colleague', 'a fifth colleague', 'a sixth colleague',
  'a seventh colleague', 'an eighth colleague', 'a ninth colleague', 'a tenth colleague',
  'an eleventh colleague', 'a twelfth colleague',
];

/**
 * THE SECOND AND LATER MENTION OF THE SAME PERSON IN ONE TEXT. Hafsah, 27 September 2026: a later
 * mention must make clear it is the same person, never a phrase that could read as somebody new.
 * "Another colleague says the tests were the slow part, and one colleague agrees" read, the second
 * time round, as if two more people had turned up.
 *
 * THE PLAINEST FORM THAT CANNOT BE MISREAD:
 *  - while only one person without a name has come up in this text so far, "the same colleague";
 *  - once two or more have, the one the first mention numbered: "one colleague" is "the first
 *    colleague", "another colleague" is "the second colleague", "a third colleague" is "the third
 *    colleague", and so on. The numbering is the check-in's own order, the one the first mentions
 *    already use, so it is the same person on every surface.
 *  - the lead stays "your lead" or "the lead", which already says who it is.
 * Past the twelfth, where the first mention is "another colleague" for everybody left, there is no
 * number to give; they stay "another colleague", which says less and so gives nobody away.
 */
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];

export function theSameOneAgain(
  { firstMention, index, introducedSoFar }:
  { firstMention: string; /** Their place among the colleagues with no name, from 0. */ index: number; introducedSoFar: number },
): string {
  const p = (firstMention ?? '').trim().toLowerCase();
  if (p === 'your lead' || p === 'the lead') return p;
  if (introducedSoFar <= 1) return 'the same colleague';
  if (index >= 0 && index < ORDINALS.length) return `the ${ORDINALS[index]} colleague`;
  return p;
}

export function plainWordsForTheUnnameable(
  /** Every label on this check-in, in the order `labelsForParties` handed them out. */
  known: Iterable<string>,
  /** The names this reader may see, from `namesVisibleTo`. */
  visible: Map<string, string>,
  /** The reader's own label, which is already being turned into "you". */
  viewerLabel?: string | null,
): Map<string, string> {
  const out = new Map<string, string>();
  const mine = (viewerLabel ?? '').trim().toLowerCase();
  const unnameable = [...known]
    .map((l) => (l ?? '').trim())
    .filter((l) => l && !visible.has(l) && l.toLowerCase() !== mine);

  const lead = unnameable.find((l) => l.toLowerCase() === THE_LEADS_LABEL);
  if (lead) out.set(lead, viewerLabel ? 'your lead' : 'the lead');

  /*
   * ONE IS "A COLLEAGUE"; SEVERAL ARE "ONE COLLEAGUE", "ANOTHER COLLEAGUE", "A THIRD COLLEAGUE".
   * Hafsah's decision, 27 September 2026 (after a day on "a colleague" for the first of several).
   * These are the words for the FIRST time somebody is mentioned in a text. A later mention in the
   * same text says it is the same person: see `theSameOneAgain`.
   */
  const colleagues = unnameable.filter((l) => l.toLowerCase() !== THE_LEADS_LABEL);
  if (colleagues.length === 1) {
    out.set(colleagues[0], 'a colleague');
  } else {
    colleagues.forEach((l, i) => {
      const phrase = i === 0 ? 'one colleague' : i === 1 ? 'another colleague' : AFTER_THE_SECOND[i - 2];
      out.set(l, phrase ?? 'another colleague');
    });
  }
  return out;
}

/**
 * THE SAME PLAIN WORDS FOR SOMEBODY WITH NO NAME, BY PERSON, FOR EVERY SURFACE. Request 36.
 *
 * Where a person has no name, the board, the report's list of who answered, the conversation and the
 * end-state email each used to say "a teammate", which the prototype never says. They now say what
 * `plainWordsForTheUnnameable` says, from this one place: "a colleague", then "another colleague",
 * "a third colleague" when there are several, "the lead" (or "your
 * lead", with a reader) for a lead with no name. The order comes from `labelsForParties`, so the same
 * person is the same phrase on every surface.
 *
 * `visible` is the names this reader may see, from `namesVisibleTo`. Left out, anybody with a name
 * is named and only somebody with no name at all gets plain words. Keyed by participant id.
 * Lower case, for inside a sentence: see `atTheStart`.
 */
export function plainWordsByPerson(
  parties: LabelParty[],
  visible?: Map<string, string> | null,
  viewerLabel?: string | null,
): Map<string, string> {
  const out = new Map<string, string>();
  let labels: Map<string, string>;
  try {
    labels = labelsForParties(parties);
  } catch {
    for (const p of parties ?? []) if (p?.id) out.set(p.id, 'a colleague');
    return out;
  }
  const named = visible ?? new Map(
    parties.map((p) => [labels.get(p.id) ?? '', displayName(p)] as const).filter(([l, n]) => !!l && !!n) as [string, string][],
  );
  const phrases = plainWordsForTheUnnameable([...labels.values()], named, viewerLabel ?? null);
  for (const [id, label] of labels) {
    const phrase = phrases.get(label);
    if (phrase) out.set(id, phrase);
  }
  return out;
}

/** The phrase with a capital, for the start of a sentence or a line of its own. */
export function atTheStart(phrase: string): string {
  return withACapital(phrase);
}

/** Whether the text before this point has just ended a sentence, so the phrase needs a capital. */
function aSentenceIsStarting(whole: string, offset: number): boolean {
  const before = whole.slice(0, offset);
  if (!before.trim()) return true;
  return /(?:[.!?]["')\]]?\s|\n)\s*$/.test(before);
}

const withACapital = (s: string) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : s);

/**
 * "YOU" AS THE OBJECT OF A PREPOSITION IS NOT THE SUBJECT OF THE VERB AFTER IT.
 *
 * "A key worry for you is that...", "Grace's own plan for you calls for two agreements", "which for
 * you means the supplier acknowledging tickets". In all three the verb belongs to the noun before
 * the preposition, and conjugating it to agree with "you" makes correct English wrong. Every
 * agreement rule in `withNames` is held off by this.
 */
/* The adverbs that may sit between "you" and its verb, one or two of them, captured so they stay. */
const ADVERBS = '((?:(?:also|still|only|now|already|never|just|really|even|often|always|usually|actually|then|both|all) ){1,2})?';

const NOT_THE_OBJECT_OF =
  '(?<!\\b(?:for|to|with|on|at|from|of|about|between|against|by|in|than|like|towards|toward|upon|onto|into)\\s)';

/**
 * AND NEVER INSIDE A QUOTATION. What is between quotation marks is a person's own words, taken from
 * the record before the report was stored (see a-quote-is-what-they-said). Turning a label or a
 * role inside it into "you" or a name would change what they said: Zainab's "as requested by Nadia"
 * would reach Nadia as "as requested by you". So the inside of every quote is held aside, and every
 * rule below works on the sentence around it.
 */
export function withNames(
  text: string,
  visible: Map<string, string>,
  allLabels?: Iterable<string>,
  opts?: { viewerLabel?: string | null },
): string {
  if (!text) return text;
  /* And a plainer word where the report wrote a harder one, never inside a quotation (request 117, part 10). */
  return theQuotesKept(text, (outside) => aPlainerWord(withNamesOutsideTheQuotes(outside, visible, allLabels, opts)));
}

function withNamesOutsideTheQuotes(
  text: string,
  visible: Map<string, string>,
  allLabels?: Iterable<string>,
  opts?: { viewerLabel?: string | null },
): string {
  if (!text) return text;

  /* A COLLAPSED PLURAL IS EXPANDED FIRST, so the reader's own label in it can still become "you"
     and the rest can still be named. See pluralLabelsBecomeSingular. */
  text = pluralLabelsBecomeSingular(text, [...(allLabels ?? []), ...visible.keys()]);

  /**
   * SECOND PERSON FOR THE READER, BEFORE ANY NAME GOES BACK.
   *
   * Runs first so the viewer's label is spent on "you" and cannot then be matched by the name
   * loop below. Possessive before bare, or "the sales lead's account" becomes "you's account".
   *
   * THIS IS THE ONLY PLACE THIS CAN BE FIXED, which is worth stating because the obvious answer
   * is wrong. "Tell the model to write in second person" cannot work: ONE report is generated in
   * labels and then rendered per reader, each with their own name substitutions. At generation
   * time there is no reader to address. So the grammar has to be handled here or not at all.
   */
  const viewerLabel = opts?.viewerLabel?.trim();
  if (viewerLabel) {
    /*
     * THE READER'S OWN NAME IS THE READER TOO (the 1 October review). A model that met the lead's
     * name in somebody's words wrote it as it found it, so Amina read "Ask Amina for her account of
     * her role in the meetings" in her own judgement. Her name, outside a quote, becomes her label
     * here, and everything below then makes it "you", with its verb. A first name that is also an
     * everyday word ("Sunday", "Will") is left, and so is a first name somebody else here shares.
     */
    const ownLabel = [...visible.keys()].find((l) => l.trim().toLowerCase() === viewerLabel.toLowerCase());
    if (ownLabel && visible.get(ownLabel)) {
      const people = [...visible.entries()].map(([label, name]) => ({ label, name }));
      const others = [
        ...people.filter((x) => x.label !== ownLabel).flatMap((x) => [x.name, theShortNameOf(x.name)]),
        ...[...(allLabels ?? [])].filter((l) => l !== ownLabel),
      ];
      text = text.split(/(?<=[.!?])(\s+)/).map((piece) => {
        const swapped = aNameInTheirWordsIsTheLabel(piece, people, { only: ownLabel, asTheReadSeesIt: true });
        return swapped === piece ? piece : theirOwnIsTheReaders(swapped, ownLabel, others);
      }).join('');
    }
    /* A LABEL THAT ENDS IN A FULL STOP NEVER MATCHED. The Harvestline sales manager's role read "...some
       on 60-day credit." and `\b` after a full stop needs a word character next, so "credit. said this
       was for" left the whole label standing in her own report (smoke run 7, 21 Sep 2026). Labels are
       matched without their trailing punctuation; the sentence keeps its own. */
    const esc = escapeRe(withoutTrailingStop(viewerLabel));
    /* The handle too, when it is a role of two words or more that no other party shares: "the
       Engagement Director's time" is the reader's time. A one-word handle ("Trader") is left alone. */
    const handle = handleOf(viewerLabel);
    const others = [...(allLabels ?? [])].filter((l) => l !== viewerLabel).map((l) => handleOf(l).toLowerCase());
    const handleToo = handle.split(' ').length >= 2 && handle.toLowerCase() !== viewerLabel.toLowerCase() && !others.includes(handle.toLowerCase());
    const hesc = escapeRe(handle);
    text = text
      .replace(new RegExp(`\\bthe ${esc}'s\\b`, 'gi'), 'your')
      .replace(new RegExp(`\\b${esc}'s\\b`, 'gi'), 'your')
      .replace(new RegExp(`\\bthe ${esc}\\b`, 'gi'), 'you')
      .replace(new RegExp(`\\b${esc}\\b`, 'gi'), 'you');
    if (handleToo) {
      text = text
        .replace(new RegExp(`\\bthe ${hesc}'s\\b`, 'gi'), 'your')
        .replace(new RegExp(`\\bthe ${hesc}\\b`, 'gi'), 'you');
    }
    text = theVerbAgreesWithYouIn(text);
    /* And nobody is told to ask themselves. See noInstructionToAskYourself. */
    text = noInstructionToAskYourself(text, theVerbAgreesWithYouIn);

    /**
     * AND THE NEXT SENTENCE, WHICH IS STILL ABOUT THEM.
     *
     * Read off a real forming report, one paragraph, one person:
     *
     *   "Only you have checked in. Their record describes two standards... Your record states: ..."
     *
     * The reader is addressed as "you", "they" and "you" again in three sentences. Every rule
     * above works inside ONE clause - the label, its possessive, the verb that follows it. A
     * pronoun opening the NEXT sentence has no label in it to match; its antecedent was the label
     * in the sentence before, which is now "you".
     *
     * NARROW ON PURPOSE, in two ways. Only these nouns, which name a person's own testimony and
     * cannot belong to a third party in this report - there is no "their record" that is somebody
     * else's while the subject is you. And only when the sentence immediately before it is about
     * the reader, so a paragraph that genuinely moves on to another party is untouched.
     */
    const OWN_TESTIMONY = 'record|account|answers|answer|response|session|testimony|own words';
    const sentences = text.split(/(?<=[.!?])(\s+)/);
    let previousWasAboutTheReader = false;
    for (let i = 0; i < sentences.length; i += 1) {
      const piece = sentences[i];
      if (/^\s+$/.test(piece)) continue;
      if (previousWasAboutTheReader) {
        sentences[i] = piece
          .replace(new RegExp(`^(\\s*)Their (${OWN_TESTIMONY})\\b`), (_m, lead, noun) => `${lead}Your ${noun}`)
          .replace(new RegExp(`^(\\s*)They (have|had|are|were) (${OWN_TESTIMONY})\\b`), (_m, lead, verb, noun) => `${lead}You ${verb === 'has' ? 'have' : verb} ${noun}`);
      }
      previousWasAboutTheReader = /\b(You|you|Your|your)\b/.test(sentences[i]);
    }
    text = sentences.join('');
  }
  let out = text;
  const labels = [...visible.keys()].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    const name = visible.get(label)!;
    const escaped = escapeRe(withoutTrailingStop(label));
    /**
     * WORD-BOUNDED, AND THIS WAS A LIVE DEFECT. W8-73.
     *
     * The replacement had no boundaries, so a label ending in a letter suffix matched inside
     * ordinary words. "participant A" is the label for a party with no stated role, and
     * case-insensitively it matches the middle of "particip[ant a]nswered":
     *
     *   "the participant answered"  ->  "the Abubakarnswered"
     *   "the participant agreed"    ->  "the Abubakargreed"
     *
     * Those are the three or four commonest words to follow "participant" in a report about
     * what somebody said, so this has been corrupting real sentences for every reader
     * entitled to a name. Found while writing a test for something else - the assertion was
     * about the tidy-up doing nothing, and the string came back mangled by the loop above it.
     */
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), name);
  }

  /**
   * THE MODEL DOES NOT USE THE LABEL IT WAS GIVEN. W8-73.
   *
   * Seen on a real twelve-session ground, read by its own lead, with every name visible to
   * her: "the initiator" resolved to her name and "the participant" stayed a placeholder.
   * The label assigned to that person was `participant A`; the model wrote bare "the
   * participant". Substitution matches the strings we ASKED for, not the ones we got, so it
   * half-worked - and a half-resolved sentence reads as a broken template, which is worse
   * than one that never resolves.
   *
   * Fixed here rather than by asking the prompt more firmly, per the rule that a guardrail
   * belongs in code at the point of the read.
   *
   * ONLY WHEN IT IS UNAMBIGUOUS. "participant A" drops to "participant" only if no other
   * party could also be meant by that word - so a two-party ground resolves and a ground
   * with six participants leaves the bare word alone, because guessing which of six is a
   * worse failure than a placeholder.
   */
  /**
   * `allLabels` IS EVERY PARTY'S LABEL, NOT JUST THE VISIBLE ONES, AND THAT IS THE WHOLE
   * CORRECTNESS OF IT.
   *
   * My first version counted uniqueness across the VISIBLE map, and the existing wall tests
   * caught it in one run: reading as participant A, only "participant A" is visible, so
   * "participant" looked unambiguous - and the substitution rewrote "participant B said the
   * handover was late" into "Abubakar B B said the handover was late". One person's
   * statement, attributed to another, by a tidy-up.
   *
   * Uniqueness in the VISIBLE map is not uniqueness in the TEXT. With no full label set
   * this does nothing at all, which is the safe direction.
   */
  const known = [...(allLabels ?? [])];
  if (known.length === 0) return out;

  const bases = new Map<string, string[]>();
  for (const label of known) {
    const base = label.replace(/ [A-Z]$/, '').trim().toLowerCase();
    if (base === label.trim().toLowerCase()) continue;
    bases.set(base, [...(bases.get(base) ?? []), label]);
  }
  for (const [base, owners] of bases) {
    if (owners.length !== 1) continue;
    // And only if THIS reader may see that person's name.
    if (!visible.has(owners[0])) continue;
    const name = visible.get(owners[0])!;
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    /**
     * The article comes with it: collapsing "the participant" to "Abubakar" leaves "the
     * Abubakar answered" otherwise, which is the same class of half-fix as the placeholder
     * it replaced. Only "the", because that is the only article the model puts in front of
     * these labels - "a participant" would be a different claim and is left alone.
     *
     * Word-bounded, so "participant" does not eat "participants" or "participation".
     */
        out = out.replace(new RegExp(`\\bthe ${escaped}\\b`, 'gi'), name);
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), name);
  }

  /**
   * AND THE LABELS THAT STAY, IN THE FORM THE REST OF THE PAGE PRINTS THEM.
   *
   * A label this reader may not resolve is left in the prose, correctly. What it was left as was
   * whatever casing the model happened to write: "a weekend participant A was thought to be on
   * call", in a paragraph that had already resolved two other people to "Hafsah" and "you", above
   * a table listing the same person as "Participant A". One person, three spellings, on one
   * screen - which reads as the product not knowing who anybody is.
   *
   * Last, so it can only tidy what the substitutions above chose to leave. It never reveals
   * anything: the text is identical apart from a capital letter.
   */
  /**
   * AND A PERSON THIS READER MAY NOT NAME IS STILL CALLED SOMETHING A PERSON WOULD SAY.
   *
   * The phrases are worked out once, from the whole party list, so the same person is the same
   * phrase in every line of this reader's report and board. See plainWordsForTheUnnameable.
   */
  const plainly = plainWordsForTheUnnameable(known, visible, opts?.viewerLabel);
  /*
   * ONE PASS, IN THE ORDER THE TEXT MENTIONS PEOPLE, so the second mention of somebody can say it is
   * the same person (theSameOneAgain). It used to be one replace per label, which cannot know
   * whether a label has come up already in this text.
   */
  const colleagueOrder = known.filter((l) => {
    const ph = plainly.get(l.trim());
    return !!ph && ph !== 'your lead' && ph !== 'the lead';
  });
  const phrased = known.filter((l) => !visible.has(l) && !!plainly.get(l.trim()));
  if (phrased.length) {
    const byKey = new Map(phrased.map((l) => [withoutTrailingStop(l).toLowerCase(), l] as const));
    const alternatives = [...byKey.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
    const seen: string[] = [];
    let colleaguesSeen = 0;
    /*
     * THE ARTICLE COMES WITH IT, AND THE CAPITAL STAYS. The model writes "The Participant B
     * built the front end", so the phrase has to swallow that "The" or the sentence reads "The a
     * colleague built the front end"; and a phrase that opens a sentence has to open it with a
     * capital, or every one of these becomes a lower-case sentence start.
     */
    /*
     * THE LABEL'S OWN FULL STOP GOES ONLY WHEN THE SENTENCE CARRIES ON IN LOWER CASE. The lookahead
     * was `[a-z]` under the `i` flag, which matches a capital too, so "…sided with Participant C.
     * Wairimu asked" lost the full stop that ended the sentence. It is decided here, case and all.
     */
    const withArticle = new RegExp(`(?<![\\w])(?:[Tt]he\\s+)?(${alternatives})(\\.(?=\\s+[a-z]))?(?![\\w])`, 'gi');
    out = out.replace(withArticle, (m: string, which: string, stop: string | undefined, offset: number, whole: string) => {
      const keepTheStop = !!stop && /^\s+[A-Z]/.test(whole.slice(offset + m.length));
      const label = byKey.get(String(which).toLowerCase())!;
      const first = plainly.get(label.trim())!;
      const isColleague = first !== 'your lead' && first !== 'the lead';
      let phrase = first;
      if (seen.includes(label)) {
        phrase = theSameOneAgain({ firstMention: first, index: colleagueOrder.indexOf(label), introducedSoFar: colleaguesSeen });
      } else {
        seen.push(label);
        if (isColleague) colleaguesSeen += 1;
      }
      return (aSentenceIsStarting(whole, offset) ? withACapital(phrase) : phrase) + (keepTheStop ? '.' : '');
    });
  }
  for (const label of known) {
    if (visible.has(label)) continue;
    if (plainly.get(label.trim())) continue;
    /* Without its trailing stop, the way the finding prints it: "...networks next said this was for" left the
       lead's whole role sentence on a participant's card (run 8, 21 Sep 2026) because the label ended in
       a full stop and the sentence did not. */
    const escaped = escapeRe(withoutTrailingStop(label));
    /* A label this reader may not resolve stays a label - but a paragraph of one is printed as its
       handle, "Managing Partner", not as the person's whole self-description in the middle of a
       sentence. Only when the handle is unambiguous among the parties. */
    const handle = handleOf(label);
    const shared = known.filter((l) => l !== label).some((l) => handleOf(l).toLowerCase() === handle.toLowerCase());
    const printed = label.split(/\s+/).length > 5 && !shared ? handle : label;
    /* Not \b: a label that ends in a full stop has no word boundary after it. */
    /* The label's own full stop comes with it when the sentence carries on ("Director. expects"); a stop
       that ends the sentence stays. */
    const re = new RegExp(`(?<![\\w])${escaped}(\\.(?=\\s+[a-z]))?(?![\\w])`, 'gi');
    /* The same full stop rule as above: kept before a capital. */
    out = out.replace(re, (m: string, stop: string | undefined, offset: number, whole: string) =>
      printed + (stop && /^\s+[A-Z]/.test(whole.slice(offset + m.length)) ? '.' : ''));
  }
  /* AND A NAME IS NOT A TITLE. "The Daniel Osei. has completed" was 55 lines across 19 scenarios,
     and neither the article nor the stop came from the name. See aNameIsNotATitle. */
  /* AND A NAME IS SAID ONCE: "Kwabena Mensah, Kwabena Mensah, and ..." (item 18). See aNameSaidTwiceInARow. */
  /* And once in a sentence about that person: "..., and Nadia has not reviewed", "for Grace's business" (run-25). */
  const named = aNameIsNotATitle(aNameSaidAgainInOneSentence(aNameSaidTwiceInARow(out, visible.values()), visible.values()), visible.values());
  /* AND THE READER IS ONE OF THE PEOPLE IN IT. "Both Caroline Mensah and you have answered. They
     disagree" puts the reader second in their own report and then leaves them out of a
     disagreement they are half of. Self-gating: it only acts where a "you" is present, which only
     happens where the reader's own label was just substituted. */
  /* AND NOBODY WAITS ON THEMSELVES in a story stored before request 111 (e) (request 118). */
  /* And "People disagree on 1: ..." from the model's brief is said as a sentence (item 18). */
  return peopleDisagreeInASentence(nobodyWaitsOnThemselvesInAStory(fromTheReadersSide(named, visible.values())));
}

/**
 * A LABEL THE MODEL INVENTED, MATCHED TO A REAL PERSON BY POSITION.
 *
 * WHAT THIS IS NOT. A three-person report read "Person" for two of the three and this was written
 * to fix it. It was not the cause: the two were seeded with the first name "Person", the model had
 * written the roster labels correctly, and the substitution put back exactly the name it was given.
 * Left in anyway, because the hole it covers is real and cheap to hold shut - the corpus lists the
 * labels and the schema says to use them, and neither can stop a model writing a label that is not
 * on the roster. Nothing here fires while the model behaves.
 *
 * A label that is not on the roster is resolved by ORDER: the positions on a difference are in the
 * order the model wrote them, and the labels not already used in that difference are handed out in
 * roster order.
 *
 * It is a guess, and a safe one: every candidate is somebody on this check-in whose name this
 * reader is already allowed to see, so the worst case is two colleagues transposed rather than
 * anybody learning something they should not. The alternative on the page is a side of a difference
 * belonging to nobody, which is worse and is not even honest about being a guess.
 */
export function eachSideGetsSomebody<T extends { participantLabel?: string | null }>(
  sides: T[],
  knownLabels: Iterable<string>,
): T[] {
  const known = new Set([...knownLabels].map((l) => l.toLowerCase()));
  const used = new Set(
    sides.map((s) => String(s.participantLabel ?? '').toLowerCase()).filter((l) => known.has(l)),
  );
  const spare = [...knownLabels].filter((l) => !used.has(l.toLowerCase()));

  return sides.map((side) => {
    const label = String(side.participantLabel ?? '').trim();
    if (label && known.has(label.toLowerCase())) return side;
    const next = spare.shift();
    return next ? { ...side, participantLabel: next } : side;
  });
}

/**
 * THE VERB AGREES WITH "YOU", AND A SENTENCE THAT STARTS WITH IT HAS ITS CAPITAL.
 *
 * Out of `withNames`, so text the product builds with the reader's "you" already in it gets the same
 * treatment as text that had a label swapped. Seniorhire, check-3, the lead's report, a probe built
 * as `${who} is waiting on them for ...` with `who` already "you": "you is waiting on them for the
 * initiation of commercial discussions." That text never went through `withNames`, so none of the
 * rules below reached it. Nothing in here knows who anybody is; it only makes "you" read as "you".
 */
/**
 * THE -S TAKEN OFF PROPERLY. Taking the last letter off made "finishes" "finishe", "wishes"
 * "wishe" and "misses" "misse", and would make "identifies" "identifie". Case is kept.
 */
function theVerbForYou(verb: string): string {
  const lower = verb.toLowerCase();
  const base = lower === 'focuses' ? 'focus'
    : /ies$/.test(lower) ? lower.replace(/ies$/, 'y')
      : /(ss|sh|ch|x|zz)es$/.test(lower) ? lower.replace(/es$/, '')
        : lower.replace(/s$/, '');
  return verb === verb.toUpperCase() ? base.toUpperCase() : verb[0] === verb[0].toUpperCase() ? base[0].toUpperCase() + base.slice(1) : base;
}

export function theVerbAgreesWithYouIn(input: string): string {
  let text = input;
  /*
   * THE AUXILIARY THAT STAYED IN THE THIRD PERSON (run 32: "what specific decisions about the
   * product does you own?").
   *
   * A question written about "Ada" becomes a question about "you", and `does` is left behind.
   * This is the one case that needs no judgement at all: an auxiliary immediately before "you"
   * with a bare verb after it has only one correct form, and there is no reading where "does you
   * own" is right.
   *
   * DELIBERATELY ONLY THE AUXILIARY. The same run shows coordinated verbs left behind too - "You
   * see a lack of forward momentum and attributes it to the team's culture" - and those are NOT
   * touched here. A regex for them was written on 25 September, fixed three sentences, broke two
   * ("each person is working on an individual goal and are blocked"), and was removed. They belong
   * in the automatic check of task 1.6, where the reader is known and the line can be rewritten
   * whole. A narrow rule that is always right beats a broad one that is usually right.
   */
  text = text
    .replace(/\bdoes you\b(?=\s+[a-z])/g, 'do you')
    .replace(/\bDoes you\b(?=\s+[a-z])/g, 'Do you')
    .replace(/\bdoesn['’]t you\b(?=\s+[a-z])/g, "don't you");
  text = text
    /**
     * AND THE PRONOUN THAT FOLLOWS, NARROWLY.
     *
     * The model writes about every party in the third person, so a label swapped for "you"
     * leaves the pronoun behind: the live example was "Hafsah Jumare described their role",
     * which becomes "you described their role" - fixing the name and keeping the wrongness.
     *
     * AN EXPLICIT VERB LIST, and it started as `\w+ed` which was not narrow at all - almost
     * every past-tense verb ends in -ed, so the rule fired on nearly anything. A bite-check
     * broadening it to any word changed no test result, which is how the overstatement showed up.
     *
     * These are verbs of ACCOUNTING - giving your version of something. After one of them,
     * "their" can only be the speaker's own. After an ordinary verb it usually is not:
     * "you emailed their manager" is about somebody else's manager and is already correct.
     */
    .replace(
      /\byou (described|said|stated|gave|reported|characterised|characterized|framed|put|holds|held|has|have) their\b/gi,
      (_m, verb) => `you ${verb} your`,
    )
    /**
     * AND "THEIR OWN" AFTER WHAT "YOU" DID OR HAS NOT DONE WITH IT (request 107 b). "Wanjiku's progress
     * depends on you completing their own open actions." and "you have not closed their own commitment"
     * were the lead's own actions, written about the lead's label. After one of these verbs of doing or
     * finishing, with nothing between, "their own" is the doer's. Narrow on purpose, as the rule above
     * is: "you have not given each person their own target" has somebody between, and stays.
     */
    .replace(
      /\byou ((?:have|has) not (?:yet )?(?:closed|completed|finished|done|kept|met|defined|stated|set)|completing|closing|finishing|keeping|meeting|defining|stating|to (?:close|complete|finish|keep|meet|define|state)) their own\b/gi,
      (_m, verb) => `you ${verb} your own`,
    )
    /**
     * AND THE VERB AGREES WITH "YOU".
     *
     * The model writes about every party in the third person, so a label swapped for "you" leaves
     * the conjugation behind. Seen in a live report a moment after this was driven: "You is
     * concerned this sign-off will drift" and "You referenced an offer letter" sitting in the same
     * paragraph. The first reads as broken software, on the one screen whose whole claim is that
     * it holds what people said carefully.
     *
     * A CLOSED LIST, not `\w+s`. "You" followed by a bare noun is ungrammatical, so a general
     * rule would usually be right and would occasionally mangle a real sentence - and there is no
     * way to tell which from here. The four irregulars carry most of it; the -s verbs are the ones
     * a report of this kind actually uses.
     *
     * THE LIST GREW BY FOUR, FOUND BY LOOKING RATHER THAN BY GUESSING. Every `you <word>s` across
     * all twenty-four scenarios' served reports and boards was read, and four were genuine verbs
     * left in the third person: "you blames the market", "this is work you owes Dele", "while you
     * points to collecting customer bank statements", "Dr is leading the client meetings while
     * you observes".
     *
     * AND FOUR IN THE SAME SEARCH WERE CORRECT ENGLISH, which is the argument for the closed list
     * standing up in the open: "Grace's own plan for you calls for two signed distribution
     * agreements" and "which for you means the supplier acknowledging tickets within four hours".
     * The subject is the plan and the agreement; "you" is the object of "for". A general rule
     * would have broken both.
     */
    /**
     * AND NOT WHERE "YOU" IS THE OBJECT OF A PREPOSITION, WHICH THE SAME SEARCH TURNED UP AS A
     * LIVE BUG IN THE RULES BELOW. On a real lead's report:
     *
     *   "A key worry for you is that you didn't see this coming."
     *
     * `\byou is\b` would make that "A key worry for you are that...". The subject is "a key
     * worry"; "for you" is where the worry lands. One signal separates this from every case the
     * rules are for - a preposition immediately before "you" - and it is checkable rather than
     * guessed, so it guards all of them rather than only the new verbs.
     */
    /*
     * AND ONE OR TWO ADVERBS MAY SIT BETWEEN THEM. "You also believes the credit committee is the only
     * delay" reached a lead (check-1, check-2): the rules below looked for the verb straight after
     * "you". An adverb between them changes nothing about whose verb it is, so these few are allowed.
     */
    .replace(new RegExp(`${NOT_THE_OBJECT_OF}(you )${ADVERBS}is\\b`, 'gi'), (_m, you: string, adv = '') => `${you}${adv}are`)
    .replace(new RegExp(`${NOT_THE_OBJECT_OF}(you )${ADVERBS}was\\b`, 'gi'), (_m, you: string, adv = '') => `${you}${adv}were`)
    .replace(new RegExp(`${NOT_THE_OBJECT_OF}(you )${ADVERBS}has\\b`, 'gi'), (_m, you: string, adv = '') => `${you}${adv}have`)
    .replace(new RegExp(`${NOT_THE_OBJECT_OF}(you )${ADVERBS}does\\b`, 'gi'), (_m, you: string, adv = '') => `${you}${adv}do`)
    /* And the same verbs said short (item 21, the founder's board): "when you doesn't have to think about it". */
    .replace(new RegExp(`${NOT_THE_OBJECT_OF}(you )${ADVERBS}(doesn|isn|hasn|wasn)(['’])t\\b`, 'gi'), (_m, you: string, adv = '', v: string, q: string) => `${you}${adv}${({ doesn: 'don', isn: 'aren', hasn: 'haven', wasn: 'weren' } as Record<string, string>)[v.toLowerCase()]}${q}t`)
    .replace(
      new RegExp(
        `${NOT_THE_OBJECT_OF}(you )${ADVERBS}(` +
          [
            'describes', 'says', 'states', 'gives', 'reports', 'frames', 'puts', 'holds', 'seems',
            'wants', 'needs', 'expects', 'feels', 'thinks', 'notes', 'believes', 'plans', 'sees',
            'knows', 'raises', 'flags', 'treats', 'reads', 'takes', 'makes', 'sets', 'owns',
            'appears', 'remains', 'intends', 'accepts', 'refers',
            /* The four the twenty-four-scenario search actually produced. */
            'blames', 'observes', 'owes', 'points',
            /* And "The initiator agrees" read by the initiator as "You agrees" (27 September 2026,
               found while fixing the title in a name). Verbs of accounting again, all regular. */
            'agrees', 'disagrees', 'confirms', 'mentions', 'recalls', 'understands', 'considers',
            'suggests', 'argues', 'insists', 'admits', 'explains', 'hopes',
            /* Read live on the session report (screens requests 54 and 65, 28 September 2026). */
            'sends', 'assumes', 'asks', 'waits', 'works', 'leads', 'wishes', 'finishes', 'misses',
            /*
             * AND THE REST OF WHAT THE REPORTS ACTUALLY WRITE AFTER A LABEL (screens request 33, 29
             * September 2026: "you forecasts that only 3 of them are realistic"). Found the same
             * way as the four above: every "<label> <word>s" in the stored reports and rounds of
             * the local corpus, read, and the verbs kept. Left out on purpose, because after "you"
             * they are as likely to be a noun ("it gives you credits"): credits, questions, names,
             * leaves, records, quotes, signs, lists, hands, sources, accounts, moves, worries.
             */
            'forecasts', 'estimates', 'predicts',
            'defines', 'views', 'attributes', 'adds', 'acknowledges', 'measures', 'identifies',
            'requires', 'manages', 'continues', 'finds', 'calls', 'counts', 'maintains', 'lacks',
            'attends', 'handles', 'earns', 'uses', 'perceives', 'means', 'gets', 'shows', 'includes',
            'tracks', 'receives', 'follows', 'focuses', 'claims', 'sells', 'suspects', 'retains',
            'prepares', 'oversees', 'experiences', 'completes', 'clears', 'spends', 'runs', 'relies',
            'provides', 'performs', 'arranges', 'anticipates', 'aims', 'specifies', 'remembers',
            'produces', 'keeps', 'joins', 'highlights', 'depends', 'declares', 'buys', 'approves',
            'warns', 'tells', 'submits', 'shares', 'secures', 'schedules', 'responds', 'regards',
            'recognizes', 'recognises', 'operates', 'meets', 'hears', 'envisions', 'dismisses',
            'directs', 'decides', 'contrasts', 'clarifies', 'cites', 'chooses', 'cares', 'begins',
            'answers', 'acts',
            /* Read on the 1 October review: "You reviews the individual targets", "you stays blocked". */
            'reviews', 'stays', 'plays',
          ].join('|') +
          ')\\b',
        'gi',
      ),
      (_m, you: string, adv: string | undefined, verb: string) => `${you}${adv ?? ''}${theVerbForYou(String(verb))}`,
    );

  text = everyVerbThatFollowsYouAgrees(text);

  /**
   * AND A SENTENCE STILL STARTS WITH A CAPITAL.
   *
   * "The sales lead described..." becomes "you described..." because the label was lowercase
   * mid-phrase and the replacement inherits nothing about position. Found by a test asserting
   * the whole sentence rather than just that the name was gone - checking only for the absence
   * of "Hafsah" would have passed on a sentence beginning with a lowercase letter.
   */
  text = text.replace(/(^|[.!?]\s+|\n\s*)(you|your)\b/g, (_m, lead, word) => `${lead}${word[0].toUpperCase()}${word.slice(1)}`);
  return text;
}

/**
 * AND EVERY VERB THAT FOLLOWS "YOU" AGREES WITH IT, NOT ONLY THE ONES ON THE LIST (the 1 October review).
 *
 * The closed list above is right where "you" might be the object of something before it. Two places
 * it is not, and the list kept missing verbs there:
 *
 *   "You reviews the individual targets."                  "you" opens the sentence
 *   "the churn model remains unused and you stays blocked."  "you" opens a clause after "and"
 *
 * There "you" can only be the subject, so a word ending in -s straight after it is its verb. Words
 * that end in -s and are not verbs ("always", "perhaps", "status") are left alone.
 *
 * And the verbs that share "you" with the first one: "You confirm the date and shares it", "You are
 * blocked, has been waiting since the 8th, and is unsure". Only in a sentence that opens with "You",
 * only straight after a comma or "and", and only for "is", "has", "was", "does" and the verbs on the
 * list, so "You lead sales, operations and logistics" keeps its "logistics".
 */
const ENDS_IN_S_AND_IS_NOT_A_VERB = new Set([
  'always', 'sometimes', 'perhaps', 'thus', 'nevertheless', 'nonetheless', 'afterwards', 'besides',
  'towards', 'as', 'yes', 'unless', 'plus', 'less', 'us', 'this', 'its', 'his', 'hers', 'theirs',
  'ours', 'yours', 'across', 'whereas', 'regardless', 'overseas', 'backwards', 'forwards', 'sideways',
  'nowadays', 'downstairs', 'upstairs', 'indoors', 'outdoors', 'thanks', 'is', 'was', 'has', 'does',
]);
const aWordThatIsAVerbAfterYou = (word: string): boolean => {
  const w = word.toLowerCase();
  if (w.length < 4 || ENDS_IN_S_AND_IS_NOT_A_VERB.has(w)) return false;
  if (/(?:ss|us|is|ous|'s|’s)$/.test(w)) return false;
  return /s$/.test(w);
};
const A_CLAUSE_OPENS = '(?:and|but|while|until|unless|because|so|if|when|whereas|since|though|although|once)';
const SHARED_VERBS = 'is|has|was|does|reviews|stays|shares|confirms|sends|expects|wants|needs|believes|says|thinks|feels|plans|knows|works|leads|waits|asks|agrees|keeps|takes|makes|owns|holds|sees|remains|continues|hopes|intends|accepts|tracks|manages|uses|gets|shows|follows|attends|handles|decides|chooses|answers|aims|relies|depends|builds';
const SHARES_ITS_YOU = new RegExp(
  `(,\\s+(?:and\\s+|but\\s+)?|\\s+(?:and|but)\\s+)${ADVERBS}(${SHARED_VERBS})\\b`,
  'g',
);
/* "You have no visibility of these facts, and so has understood..." - but never "and so is the
   invoice", where "so" turns the sentence round and the verb belongs to what follows it. */
const AND_SO_SHARES_ITS_YOU = /(,?\s+and\s+so\s+)(is|has|was|does)\b(?!\s+(?:the|a|an|this|that|it|he|she|they|we|you|I|[A-Z]\w*)\b)/g;
function everyVerbThatFollowsYouAgrees(input: string): string {
  let text = input.replace(
    new RegExp(`(^|[.!?]["”’)]?\\s+|\\n\\s*|\\b${A_CLAUSE_OPENS}\\s+)(you\\s+)${ADVERBS}([A-Za-z]+)\\b`, 'gi'),
    (m: string, lead: string, you: string, adv: string | undefined, word: string) =>
      aWordThatIsAVerbAfterYou(word) && word === word.toLowerCase() ? `${lead}${you}${adv ?? ''}${theVerbForYou(word)}` : m,
  );
  /*
   * AND IN A CLAUSE THAT OPENS ON "YOU" (request 123 item 7): "until you clarify the role and provides the necessary
   * authority". Where a clause opens with one of the clause words and then "you", a verb from the list straight after
   * the next "and", with no comma, full stop or other "you" between, is still the reader's. Only verbs from the list, so
   * "until you clarify the role and logistics" keeps its noun.
   */
  text = text.replace(
    new RegExp(`(\\b${A_CLAUSE_OPENS}\\s+you\\s+[a-z]+\\b[^,.;!?]*?\\s+and\\s+)${ADVERBS}(provides|gives|clarifies|sets|${SHARED_VERBS})\\b`, 'g'),
    /* Not where another person could own the verb: a second "you", or "who", "that", "which" or "whose" between
       ("until you hire someone who knows the market and provides training"). */
    (m: string, head: string, adv: string | undefined, verb: string) => (/\b(?:you|who|that|which|whose)\b/i.test(head.replace(/^\S+\s+you\s/i, '')) ? m : `${head}${adv ?? ''}${({ is: 'are', was: 'were', has: 'have', does: 'do' } as Record<string, string>)[verb.toLowerCase()] ?? theVerbForYou(verb)}`),
  );
  /* The verbs that share it, sentence by sentence. */
  const pieces = text.split(/(?<=[.!?])(\s+)/);
  text = pieces.map((piece) => {
    if (!/^\s*You\s/.test(piece)) return piece;
    return piece.replace(AND_SO_SHARES_ITS_YOU, (_m: string, join: string, verb: string) =>
      `${join}${({ is: 'are', has: 'have', was: 'were', does: 'do' } as Record<string, string>)[verb.toLowerCase()]}`,
    ).replace(SHARES_ITS_YOU, (_m: string, join: string, adv: string | undefined, verb: string) => {
      const lower = verb.toLowerCase();
      const said = lower === 'is' ? 'are' : lower === 'was' ? 'were' : lower === 'has' ? 'have' : lower === 'does' ? 'do' : theVerbForYou(verb);
      return `${join}${adv ?? ''}${said}`;
    });
  }).join('');
  return text;
}

/** The same, with somebody's own words in quotation marks left exactly as they are. */
export function theVerbAgreesWithYou(text: string): string {
  return text ? theQuotesKept(text, theVerbAgreesWithYouIn) : text;
}
