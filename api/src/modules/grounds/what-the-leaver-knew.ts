/**
 * THE HANDOVER BRIEF, AND THE ONE LINE IN THE SPEC THAT DECIDES ITS SHAPE.
 *
 * "Threads left mid-conversation, by subject, WITHOUT PREDECESSOR TESTIMONY ATTRIBUTED."
 *
 * That is the whole design problem. The brief exists because the context a leaver built up is
 * otherwise lost, and the richest part of that context is what they SAID - which is exactly the
 * part that cannot travel. Their check-ins are their own account of their own work, given on the
 * understanding that it stays theirs; handing it to their replacement because they left would make
 * every honest answer in this product a hostage to somebody resigning.
 *
 * So the brief carries WHAT IS OUTSTANDING, never what anybody said about it: open commitments (a
 * commitment is a promise made outward, not testimony), open handoffs, and subjects that were live
 * in conversation - by title and by how recently, never by content.
 *
 * A leaver reading this list should recognise every item and learn nothing about themselves from it.
 * A successor reading it should know what is on their desk and have to ask a person for the rest -
 * which is the conversation the brief exists to make possible rather than replace.
 */
import { CommitmentState, DependencyStatus } from '@prisma/client';

export type BriefInput = {
  roleName: string;
  /** Promises the predecessor made outward. Not testimony - somebody was told. */
  commitments: { text: string; state: CommitmentState; dueAt: Date | null; statedAt: Date }[];
  /** Handoffs they were waiting on, and handoffs waiting on them. Both sides are the successor's now. */
  waitingOnOthers: { what: string; status: DependencyStatus; waitingDays: number }[];
  owedToOthers: { what: string; status: DependencyStatus; waitingDays: number }[];
  /** Subjects that were live in their conversations. Title and recency only. */
  liveSubjects: { title: string; lastMentionedAt: Date }[];
};

export type HandoverBrief = {
  roleName: string;
  generatedAt: string;
  openCommitments: { text: string; due: string | null; state: string }[];
  waitingOnOthers: { what: string; days: number }[];
  owedToOthers: { what: string; days: number }[];
  liveSubjects: { title: string; lastMentioned: string }[];
  /** Said in the brief itself, because a list with no note reads as the whole picture. */
  whatIsNotHere: string;
};

/**
 * WHAT IS NOT HERE, SAID IN THE BRIEF RATHER THAN IN A DESIGN DOCUMENT.
 *
 * A successor handed four lists will read them as the handover. They are not - they are the part a
 * machine can honestly produce, and the missing part is the part that matters most. Saying so is
 * what turns the brief from a substitute for a conversation into a reason to have one.
 */
export const WHAT_IS_NOT_HERE =
  /* Read by the successor: in plain words, with no "handoffs", "predecessor" or "account", and no privacy note (release test, 22 November
     2026; Hafsah's standards). That nothing the leaver said reaches the brief is enforced by its shape, tested in what-the-leaver-knew.spec.ts. */
  'This is what is still open, not what the person before you knew. To learn why any of this is where it is, '
  + 'ask the people named beside each item.';

const day = (d: Date) => d.toISOString().slice(0, 10);

export function buildHandoverBrief(input: BriefInput, now: Date): HandoverBrief {
  const open = input.commitments
    .filter((c) => c.state === CommitmentState.OPEN || c.state === CommitmentState.SLIPPED)
    /* Oldest first: the ones that have been outstanding longest are the ones nobody has raised. */
    .sort((a, b) => a.statedAt.getTime() - b.statedAt.getTime());

  const live = (d: { status: DependencyStatus }) => d.status !== DependencyStatus.CLEARED;

  return {
    roleName: input.roleName,
    generatedAt: now.toISOString(),
    openCommitments: open.map((c) => ({
      text: c.text,
      due: c.dueAt ? day(c.dueAt) : null,
      state: c.state,
    })),
    waitingOnOthers: input.waitingOnOthers.filter(live)
      .sort((a, b) => b.waitingDays - a.waitingDays)
      .map((w) => ({ what: w.what, days: w.waitingDays })),
    owedToOthers: input.owedToOthers.filter(live)
      .sort((a, b) => b.waitingDays - a.waitingDays)
      .map((w) => ({ what: w.what, days: w.waitingDays })),
    /* Newest first: what was live when they left is what the successor walks into. */
    liveSubjects: [...input.liveSubjects]
      .sort((a, b) => b.lastMentionedAt.getTime() - a.lastMentionedAt.getTime())
      .map((s) => ({ title: s.title, lastMentioned: day(s.lastMentionedAt) })),
    whatIsNotHere: WHAT_IS_NOT_HERE,
  };
}

/**
 * The brief is empty when the role genuinely had nothing outstanding, and that is worth saying
 * differently from "we could not build one" - a successor told nothing will assume the second.
 */
export function isEmpty(b: HandoverBrief): boolean {
  return !b.openCommitments.length && !b.waitingOnOthers.length
    && !b.owedToOthers.length && !b.liveSubjects.length;
}
