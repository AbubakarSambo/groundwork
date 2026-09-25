import { PartyType } from '@prisma/client';

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
      labelById.set(p.id, 'the initiator');
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
  const last = p.user?.lastName?.trim();
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
  if (theEmailIsFair) {
    /* THE ROW'S ADDRESS TOO, NOT ONLY THE SIGN-IN'S. Hafsah, 22 Sep 2026, reading a session report as the
       lead: "it still calls people participant A and participant B". Those two had not joined yet, so
       there was no user to take an address from; the address the lead typed is on the row, and the lead
       is reading. */
    const email = p.user?.email?.trim() || p.email?.trim();
    if (email) return email;
  }
  return null;
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

export function withNames(
  text: string,
  visible: Map<string, string>,
  allLabels?: Iterable<string>,
  opts?: { viewerLabel?: string | null },
): string {
  if (!text) return text;

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
       */
      .replace(/\byou is\b/gi, (m) => (m[0] === 'Y' ? 'You are' : 'you are'))
      .replace(/\byou was\b/gi, (m) => (m[0] === 'Y' ? 'You were' : 'you were'))
      .replace(/\byou has\b/gi, (m) => (m[0] === 'Y' ? 'You have' : 'you have'))
      .replace(/\byou does\b/gi, (m) => (m[0] === 'Y' ? 'You do' : 'you do'))
      .replace(
        new RegExp(
          '\\byou (' +
            [
              'describes', 'says', 'states', 'gives', 'reports', 'frames', 'puts', 'holds', 'seems',
              'wants', 'needs', 'expects', 'feels', 'thinks', 'notes', 'believes', 'plans', 'sees',
              'knows', 'raises', 'flags', 'treats', 'reads', 'takes', 'makes', 'sets', 'owns',
              'appears', 'remains', 'intends', 'accepts', 'refers',
            ].join('|') +
            ')\\b',
          'gi',
        ),
        (_m, verb) => `you ${String(verb).replace(/s$/, '')}`,
      );

    /**
     * AND A SENTENCE STILL STARTS WITH A CAPITAL.
     *
     * "The sales lead described..." becomes "you described..." because the label was lowercase
     * mid-phrase and the replacement inherits nothing about position. Found by a test asserting
     * the whole sentence rather than just that the name was gone - checking only for the absence
     * of "Hafsah" would have passed on a sentence beginning with a lowercase letter.
     */
    text = text.replace(/(^|[.!?]\s+|\n\s*)(you|your)\b/g, (_m, lead, word) => `${lead}${word[0].toUpperCase()}${word.slice(1)}`);

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
  for (const label of known) {
    if (visible.has(label)) continue;
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
    out = out.replace(re, printed);
  }
  /* AND A NAME IS NOT A TITLE. "The Daniel Osei. has completed" was 55 lines across 19 scenarios,
     and neither the article nor the stop came from the name. See aNameIsNotATitle. */
  return aNameIsNotATitle(out, visible.values());
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
