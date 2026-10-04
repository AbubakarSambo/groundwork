import { BadRequestException } from '@nestjs/common';
import { ANCHOR_KINDS, type AnAnchorKind } from '../detectors/the-anchor-recommendations';

/**
 * A NEW CHECK-IN CAN START FROM WHAT GROUNDWORK RECOMMENDED (request 148, part 1).
 *
 * "Yes, set it up" hands the screen `setUp: { kind, about, aim, people }`. The set-up conversation
 * took only free text, so the people the offer named could not be carried in and the lead added them
 * again herself. This turns a `setUp` into the draft the set-up screen opens with.
 *
 * It creates nothing and invites nobody. The people are checked against the lead's organisation, so
 * this route cannot be used to put an address of a stranger into somebody's draft: a person it has no
 * record of in this organisation is left out and said so in plain words, and the lead may add them
 * herself on the next step.
 */

export type ASetUpToStartFrom = {
  kind: AnAnchorKind;
  about: string;
  aim: string | null;
  people: { name: string | null; email: string }[];
};

export type ADraftFromASetUp = {
  /** What the set-up conversation opens with, in place of the lead typing it. */
  initial: string;
  /** The aim, when the offer had one. */
  aim: string | null;
  /** The people carried in, in the shape commit takes (`contributors`), with the name to show. */
  contributors: { email: string; displayName: string | null }[];
  /** People left out, each with a plain sentence for the lead. */
  leftOut: { email: string; why: string }[];
};

export const THE_MOST_PEOPLE_A_SET_UP_CARRIES = 19;

export const whyAPersonIsLeftOut = (who: string) =>
  `Groundwork has no record of ${who} in your organisation, so ${who} is not added. You can add them yourself on the next step.`;

export async function draftFromASetUp(prisma: any, organizationId: string, leadUserId: string, setUp: ASetUpToStartFrom): Promise<ADraftFromASetUp> {
  if (!setUp || !(ANCHOR_KINDS as readonly string[]).includes(setUp.kind) || typeof setUp.about !== 'string' || !setUp.about.trim()) {
    throw new BadRequestException('This set-up is not one Groundwork recommended.');
  }
  const lead = await prisma.user.findUnique({ where: { id: leadUserId }, select: { email: true } });
  const leadAddress = lead?.email?.toLowerCase() ?? null;

  const seen = new Set<string>();
  const wanted: { name: string | null; email: string }[] = [];
  for (const p of (setUp.people ?? []).slice(0, THE_MOST_PEOPLE_A_SET_UP_CARRIES)) {
    const email = typeof p?.email === 'string' ? p.email.trim().toLowerCase() : '';
    if (!email || email === leadAddress || seen.has(email)) continue;
    seen.add(email);
    wanted.push({ name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : null, email });
  }

  const addresses = wanted.map((w) => w.email);
  const [users, guests] = addresses.length
    ? await Promise.all([
        prisma.user.findMany({ where: { organizationId, email: { in: addresses } }, select: { email: true } }),
        prisma.groundParticipant.findMany({ where: { email: { in: addresses }, ground: { organizationId } }, select: { email: true } }),
      ])
    : [[], []];
  const known = new Set<string>([...users, ...guests].map((r: any) => String(r.email).toLowerCase()));

  const contributors: ADraftFromASetUp['contributors'] = [];
  const leftOut: ADraftFromASetUp['leftOut'] = [];
  for (const w of wanted) {
    if (known.has(w.email)) contributors.push({ email: w.email, displayName: w.name });
    else leftOut.push({ email: w.email, why: whyAPersonIsLeftOut(w.name ?? w.email) });
  }
  return { initial: setUp.about.trim(), aim: setUp.aim ?? null, contributors, leftOut };
}
