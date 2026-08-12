import { PartyType } from '@prisma/client';

export type LabelParty = {
  id: string;
  partyType: PartyType;
  roleAsDescribed?: string | null;
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
export function labelsForParties(parties: LabelParty[]): Map<string, string> {
  const labelById = new Map<string, string>();
  let participantIdx = 0;

  // Count how many non-initiators share each role, so we can disambiguate
  // same-role people (e.g. six "Field officer"s become "Field officer A/B/...").
  const roleCounts = new Map<string, number>();
  for (const p of parties) {
    if (p.partyType !== PartyType.INITIATOR) {
      const role = p.roleAsDescribed?.trim();
      if (role) roleCounts.set(role.toLowerCase(), (roleCounts.get(role.toLowerCase()) ?? 0) + 1);
    }
  }

  const roleSeen = new Map<string, number>();
  for (const p of parties) {
    if (p.partyType === PartyType.INITIATOR) {
      labelById.set(p.id, p.roleAsDescribed?.trim() || 'the initiator');
    } else {
      const role = p.roleAsDescribed?.trim();
      if (role) {
        if ((roleCounts.get(role.toLowerCase()) ?? 0) > 1) {
          const n = roleSeen.get(role.toLowerCase()) ?? 0;
          roleSeen.set(role.toLowerCase(), n + 1);
          labelById.set(p.id, `${role} ${String.fromCharCode(65 + n)}`);
        } else {
          labelById.set(p.id, role);
        }
      } else {
        const letter = String.fromCharCode(65 + participantIdx++);
        labelById.set(p.id, `participant ${letter}`);
      }
    }
  }

  return labelById;
}

/** The name to show for someone, falling back sensibly when a name is missing. */
export function displayName(p: LabelParty): string | null {
  const first = p.user?.firstName?.trim();
  const last = p.user?.lastName?.trim();
  if (first) return last ? `${first} ${last}` : first;
  // An invited participant who has not joined yet has no name of their own. The
  // email is theirs and already visible to the lead on the ground page, so it is
  // a fair fallback there - but it is never worth showing to a peer.
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

export function namesVisibleTo(
  viewerParticipantId: string | null | undefined,
  parties: LabelParty[],
): Map<string, string> {
  const labels = labelsForParties(parties);
  const visible = new Map<string, string>();

  const viewer = parties.find(p => p.id === viewerParticipantId);
  const viewerIsLead = viewer?.partyType === PartyType.INITIATOR;

  for (const p of parties) {
    const label = labels.get(p.id);
    const name = displayName(p);
    if (!label || !name) continue;

    const isSelf = p.id === viewerParticipantId;
    const isLead = p.partyType === PartyType.INITIATOR;

    if (viewerIsLead || isSelf || isLead) visible.set(label, name);
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
export function withNames(text: string, visible: Map<string, string>, allLabels?: Iterable<string>): string {
  if (!text) return text;
  let out = text;
  const labels = [...visible.keys()].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    const name = visible.get(label)!;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  return out;
}
