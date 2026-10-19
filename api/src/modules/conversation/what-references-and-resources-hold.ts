import { theRelease1bTabsAreOn } from '../grounds/release-1b-tabs';

/**
 * THE CHECK-INS READ REFERENCES AND RESOURCES (Release 1B, pull request 2 of 3; Hafsah, 18 October 2026: "The check-ins read
 * References and resources (confirmed rules, what each stage needs, coaching, risks, and the lead's People note) to decide what
 * to ask. The conversation itself stays as it is."; references-and-my-work.md, "How the check-ins use it").
 *
 * KNOWLEDGE, NEVER A SCRIPT. This adds one block of what the lead keeps on References and resources to what a check-in is
 * given, the same way "what a sales check-in gathers" does: what to learn, so the model can choose its next question (for
 * example asking for the decision maker when the stage needs one). The tone, the flow and every rule of the conversation are
 * untouched, and no line here is ever read out or quoted.
 *
 * WHAT IT READS, AND ONLY WHILE THE ORGANISATION'S RELEASE 1B SWITCH IS ON (off for every organisation, so every check-in asks
 * exactly as today until Groundwork staff switch one on):
 *  - what each stage needs, coaching for the team, and risks to watch for: the lines the lead added, shared with the team;
 *  - the rules: already read into every check-in as "how this team works" (STRATEGY and WAY_OF_WORKING lines), so they are not
 *    said a second time here;
 *  - the lead's People note and what she wants to help this one person with: ONLY in that person's own check-in, never the
 *    lead's own, never anybody else's. Her older notes about a person (ABOUT_A_PERSON, and her notes from before) are never
 *    read: decision 32 stands for them. See docs/release-questions.md for the question this raises for Hafsah.
 *  - the proof this person added in this check-in, as it was read and filed (proof-filed-on-its-item.ts), so the check-in can
 *    say what it is and where it was filed.
 *
 * THE VERSION THAT RUNS. These words live in the code, not in a stored prompt: no `PromptVersion` row is added or changed, so
 * nothing a deploy seeds is different, and a turn's `promptVersionId` still names only the stored prompts it ran.
 */

/** The People section's kinds. Read here for the one person each is about, and dropped at every other read in a check-in. */
export const THE_PEOPLE_NOTES: ReadonlySet<string> = new Set(['PERSON_NOTE', 'HELP_WITH']);

/**
 * WAITS ON HAFSAH (decision 32 against her brief of 18 October). Her brief says the check-ins read "the lead's People note";
 * decision 32 says a lead's private notes never reach that person's own session. A privacy rule changes only on her word, so
 * until she says so the People notes stay on the References and resources page and no check-in is handed them. Built and
 * tested narrowly (only that one person's own check-in, never the lead's, never quoted) so that turning this on is one line.
 * See docs/release-questions.md.
 */
export const THE_PEOPLE_NOTES_REACH_THEIR_OWN_CHECK_IN = { on: false };

export const REFERENCES_HEADING = 'WHAT THIS TEAM’S REFERENCES AND RESOURCES SAY';

export interface WhatReferencesHold {
  stageNeeds: string[];
  coaching: string[];
  risks: string[];
  /** For this person only, never quoted. */
  theirNote: string[];
  proofAddedToday: { fileName: string; readAs: string; itemName: string | null; countsAsProof: boolean; shows: string | null }[];
  firstName: string | null;
}

/** The block, from what was read. Empty when there is nothing to say. */
export function theReferencesBlock(h: WhatReferencesHold): string {
  const parts: string[] = [];
  const list = (title: string, xs: string[]) => (xs.length ? `${title}\n${xs.map((x) => `- ${x}`).join('\n')}` : '');
  const shared = [
    list('What each stage needs:', h.stageNeeds),
    list('Coaching the lead wants for the whole team:', h.coaching),
    list('Risks to watch for (things to look out for, never a status; raise one only when what they say touches it):', h.risks),
  ].filter(Boolean);
  if (shared.length) {
    parts.push(`${REFERENCES_HEADING}\nThe lead keeps these for the whole team. Use them to decide what to ask about and what to help with, in your own words, one thing at a time. Never read them out as a list.\n${shared.join('\n')}`);
  }
  if (h.theirNote.length) {
    parts.push(`WHAT THE LEAD WANTS YOU TO HELP ${h.firstName ? h.firstName.toUpperCase() : 'THIS PERSON'} WITH\nOnly the lead reads this. Let it shape which question you ask next and what you help with. Never say it, never quote it, and never say or hint that anything was written about them.\n${h.theirNote.map((x) => `- ${x}`).join('\n')}`);
  }
  if (h.proofAddedToday.length) {
    const said = h.proofAddedToday.map((p) => {
      const where = p.itemName ? `filed as evidence on ${p.itemName}` : 'kept as evidence, not yet filed on any one item because it names none';
      const proof = p.countsAsProof ? 'It counts as proof.' : 'It does not count as proof.';
      return `- ${p.fileName} was read as ${p.readAs.toLowerCase()}, ${where}. ${proof}${p.shows ? ` What it shows: ${p.shows}` : ''}`;
    });
    parts.push(`PROOF ADDED IN THIS CHECK-IN\nEach was read when it came in. Say once, in plain words, what it is and where it was filed. Where a date or an amount in it differs from what they said, use the document's and say what they said. Where it is not proof, say so kindly, and what would be. Where it could not be read, ask for a clearer photo.\n${said.join('\n')}`);
  }
  return parts.join('\n\n');
}

export async function whatReferencesAndResourcesHold(
  prisma: any,
  checkIn: { id: string; groundId: string; participantId: string; createdAt?: Date | string | null; participant?: { partyType?: string; user?: { firstName?: string | null } | null } | null },
): Promise<{ block: string; on: boolean }> {
  const ground = await prisma?.ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { organizationId: true, initiatorId: true } }).catch(() => null);
  if (!ground || !(await theRelease1bTabsAreOn(prisma, ground.organizationId))) return { block: '', on: false };
  const isTheLead = checkIn.participant?.partyType === 'INITIATOR';
  const lines: any[] = (await prisma.groundContextItem?.findMany?.({
    where: {
      groundId: checkIn.groundId,
      closedAt: null,
      OR: [
        { kind: { in: ['STAGE_NEEDS', 'COACHING', 'RISK'] }, audience: 'EVERYONE' },
        /* The lead's note on one person, asked for by that person's own id, and never in the lead's own check-in. */
        ...(isTheLead || !THE_PEOPLE_NOTES_REACH_THEIR_OWN_CHECK_IN.on ? [] : [{ kind: { in: ['PERSON_NOTE', 'HELP_WITH'] }, aboutParticipantId: checkIn.participantId }]),
      ],
    },
    select: { kind: true, text: true, aboutParticipantId: true },
    orderBy: { createdAt: 'asc' },
  }).catch(() => [])) ?? [];
  const of = (kind: string) => lines.filter((l) => l.kind === kind && String(l.text ?? '').trim()).map((l) => String(l.text).trim());
  /* Belt and braces: a People line reaches only the person it is about, whatever the query returned. */
  const theirNote = isTheLead ? [] : lines
    .filter((l) => THE_PEOPLE_NOTES.has(String(l.kind)) && l.aboutParticipantId === checkIn.participantId && String(l.text ?? '').trim())
    .map((l) => String(l.text).trim());
  const since = checkIn.createdAt ? new Date(checkIn.createdAt) : new Date(Date.now() - 86400000);
  const filed: any[] = (await prisma.itemEvidence?.findMany?.({
    where: { groundId: checkIn.groundId, participantId: checkIn.participantId, createdAt: { gte: since } },
    select: { readAs: true, itemName: true, countsAsProof: true, shows: true, document: { select: { fileName: true } } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  }).catch(() => [])) ?? [];
  const block = theReferencesBlock({
    stageNeeds: of('STAGE_NEEDS'),
    coaching: of('COACHING'),
    risks: of('RISK'),
    theirNote,
    proofAddedToday: filed.map((f) => ({ fileName: f.document?.fileName ?? 'A file', readAs: f.readAs, itemName: f.itemName ?? null, countsAsProof: f.countsAsProof === true, shows: f.shows ?? null })),
    firstName: (checkIn.participant?.user?.firstName ?? '').trim() || null,
  });
  return { block, on: true };
}
