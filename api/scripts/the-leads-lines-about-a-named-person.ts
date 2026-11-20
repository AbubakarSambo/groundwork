/**
 * ONE TIME, BY HAND: THE LINES ALREADY WRITTEN FROM WHAT A LEAD SAID ABOUT A NAMED PERSON (Hafsah, batch 2, item 1; docs/fix-plan.md,
 * batch 2 group 1).
 *
 * Until this fix, what a lead said about a named person's work in her own check-ins, or in her update in setup ("remy Rep has sold 5
 * units this month"), was written as a line everybody in the check-in reads, and Rita read it on the shared team report. New lines
 * carry whom they are about (`about_participant_id`), set from the assessment's reading. Lines written before have no such reading, so
 * this reads them once, without a model, by the one fixed rule privacy allows: a line on the lead's own check-in that names one other
 * person on the check-in is about that person; one that names two or more is kept for the lead alone (it is marked as about the lead
 * herself, which only she reads). The same is done to the items of her stored assessments, so the facts every page reads follow.
 *
 * Safe to run twice: a second run finds nothing to change. No model is called. Nothing is deleted.
 *
 * Nothing changes without --yes. Run first without it and read what it would do.
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-leads-lines-about-a-named-person.ts
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-leads-lines-about-a-named-person.ts --yes
 */
import { PrismaClient } from '@prisma/client';
import { THE_ITEM_SECTIONS, THE_COMPARED_SECTIONS, THE_LEAD_AND_WHOM_IT_IS_ABOUT } from '../src/modules/conversation/the-assessment';

export interface APerson { id: string; names: string[] }

/** Whom a line is about: one other person named in it, the lead herself when it names more than one, or null when it names nobody. */
export function whomTheLineNames(text: string, leadId: string, others: APerson[]): string | null {
  const words = ` ${String(text ?? '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ')} `;
  const named = others.filter((p) => p.names.some((n) => n.trim() && words.includes(` ${n.trim().toLowerCase()} `)));
  if (!named.length) return null;
  return named.length === 1 ? named[0].id : leadId;
}

/** The lead's stored assessment with each shared item that names somebody read as about them. Returns null when nothing changes. */
export function theAssessmentWithWhomEachItemNames(column: unknown, leadId: string, others: APerson[]): unknown | null {
  const a = column as any;
  if (!a || a.kind !== 'assessment' || !a.about?.isTheLead) return null;
  let changed = false;
  const read = (items: any[] | undefined) => (items ?? []).map((i) => {
    if (!i || i.whoMaySee !== 'the people in this check-in') return i;
    const about = whomTheLineNames(String(i.words ?? ''), leadId, others);
    if (!about) return i;
    changed = true;
    return about === leadId ? { ...i, whoMaySee: 'the lead only' } : { ...i, whoMaySee: THE_LEAD_AND_WHOM_IT_IS_ABOUT, aboutParticipantId: about };
  });
  const out: any = { ...a };
  for (const s of THE_ITEM_SECTIONS) out[s] = read(a[s]);
  out.comparedWithLastTime = { ...(a.comparedWithLastTime ?? {}) };
  for (const s of THE_COMPARED_SECTIONS) out.comparedWithLastTime[s] = read(a.comparedWithLastTime?.[s]);
  return changed ? out : null;
}

async function main() {
  const prisma = new PrismaClient();
  const yes = process.argv.includes('--yes');
  const leads = await prisma.groundParticipant.findMany({
    where: { partyType: 'INITIATOR' },
    select: { id: true, groundId: true },
  });
  console.log(yes ? 'Changing:' : 'Would change (add --yes to do it):');
  let lines = 0;
  let assessments = 0;
  for (const lead of leads) {
    const team = await prisma.groundParticipant.findMany({
      where: { groundId: lead.groundId, id: { not: lead.id } },
      select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    });
    const others: APerson[] = team.map((p) => {
      const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || String(p.nameGiven ?? '').trim();
      return { id: p.id, names: [full, full.split(/\s+/)[0]].filter((n, i, all) => n && all.indexOf(n) === i) };
    }).filter((p) => p.names.length);
    if (!others.length) continue;
    const rows = await prisma.recordEntry.findMany({ where: { participantId: lead.id, aboutParticipantId: null }, select: { id: true, text: true } });
    for (const r of rows) {
      const about = whomTheLineNames(r.text, lead.id, others);
      if (!about) continue;
      lines += 1;
      console.log(`  Line ${r.id}: ${about === lead.id ? 'kept for the lead alone' : `about ${others.find((o) => o.id === about)?.names[0]}`}. ${r.text.slice(0, 140)}`);
      if (yes) await prisma.recordEntry.update({ where: { id: r.id }, data: { aboutParticipantId: about } });
    }
    const checkIns = await prisma.checkIn.findMany({ where: { participantId: lead.id }, select: { id: true, sessionReport: true } });
    for (const c of checkIns) {
      const next = theAssessmentWithWhomEachItemNames(c.sessionReport, lead.id, others);
      if (!next) continue;
      assessments += 1;
      console.log(`  Assessment of check-in ${c.id}: items that name somebody are read as about them.`);
      if (yes) await prisma.checkIn.update({ where: { id: c.id }, data: { sessionReport: next as any } });
    }
  }
  console.log(`\n${lines} line(s), ${assessments} assessment(s). ${yes ? 'Done.' : 'Nothing was changed.'}`);
  await prisma.$disconnect();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
