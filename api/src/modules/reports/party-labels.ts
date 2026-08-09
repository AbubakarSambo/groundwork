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
export function withNames(text: string, visible: Map<string, string>): string {
  if (!text) return text;
  let out = text;
  const labels = [...visible.keys()].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    const name = visible.get(label)!;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'gi'), name);
  }
  return out;
}
