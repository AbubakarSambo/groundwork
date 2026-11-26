/**
 * THE WEEKLY REPORT, FROM THE FORWARD TO THE BRIEFING (Ebele, increment 6b; plan section 13). She, or the person who watches the Assembly for her,
 * forwards the weekly report. It is read (the model reads it, as untrusted words, and only what it can quote is kept), kept by week and institution, set
 * beside the earlier weeks, linked to the work already on the record, and ONE briefing goes to whoever sent it, with at most one question.
 *
 * WHY A STORE OF ITS OWN (`weekly_digests`) AND NOT THE ORGANISATION MEMORY. Organisation memory is what a lead said in a check-in's setup and confirmed, kept
 * as context for that check-in's questions. A week of the Assembly is an archive of what an institution reported, keyed by week, compared week to week, and
 * never confirmed by anybody as the organisation's own rule. Mixing them would let a report's words read as the lead's own.
 *
 * PRIVATE TO WHAT EACH READER MAY SEE. Somebody who watches the Assembly for her but does not act for her is sent the developments and how they compare
 * with earlier weeks, and nothing from the engagements and commitments on her record.
 */
import { dayWords } from '../year-end/the-year-end-content';
import { compareWithEarlier, contentHashOf, isoWeekKey, keepWhatTheReportSays, NO_DEVELOPMENTS_I_CAN_QUOTE, ALREADY_HAVE_THIS_WEEK, readAReportPlainly, theFullBriefing, theShortBriefing, touchesPlainly, type ARowItTouches } from './the-assembly-digest';
import { mightBeAWeeklyReport, type AnEngagement, type TheWorkReader } from './the-work-reader';
import { readDate } from './the-payments-tracker';
import type { ABatchForWork, AMaterialItem } from '../executive-onboarding/the-material-for-work';

export interface TheAssemblyPorts {
  toTheSender(a: { organizationId: string; batch: ABatchForWork; subject: string; text: string; short: string }): Promise<string>;
}

export interface TheEngagementRow { key: string; item: string; workstream: string | null; owner: string; status: string }

/** One batch. Returns the briefings that were sent, in the order of the files. Never throws on one report: the next is still read. */
export async function readTheAssemblyReports(prisma: any, ports: TheAssemblyPorts, a: { batch: ABatchForWork; candidates: AMaterialItem[]; reader: TheWorkReader; engagementRows: TheEngagementRow[] | null; now: Date }): Promise<string[]> {
  const told: string[] = [];
  const rows = a.engagementRows ?? [];
  const engagements: AnEngagement[] = rows.map((r) => ({ key: r.key, item: r.item, workstream: r.workstream }));
  for (const item of a.candidates) {
    try {
      const text = item.text ?? '';
      if (!mightBeAWeeklyReport(text)) continue;
      const receivedOn = item.receivedAt.toISOString().slice(0, 10);
      const read = (await a.reader.readAReport({ text, fileName: item.fileName, receivedOn, engagements })) ?? readAReportPlainly(text, item.fileName, receivedOn);
      if (!read || !read.isWeeklyReport) continue;
      const kept = keepWhatTheReportSays(read, text, engagements.map((e) => e.key));
      /* A note, a log or a letter that only mentions the Assembly is not its weekly report: when nothing in it reads as a development, there is nothing to say about a report (round 2, C1). */
      if (!kept.developments.length && !read.developments.length) continue;
      if (!kept.developments.length) { await ports.toTheSender({ organizationId: a.batch.organizationId, batch: a.batch, subject: 'The weekly report', text: NO_DEVELOPMENTS_I_CAN_QUOTE(item.fileName), short: NO_DEVELOPMENTS_I_CAN_QUOTE(item.fileName) }); continue; }
      const institution = kept.institution ?? 'National Assembly';
      const reportDate = (kept.reportDate ? readDate(kept.reportDate) : null) ?? item.receivedAt;
      const weekKey = isoWeekKey(reportDate);
      const hash = contentHashOf(kept);
      const earlierRows: any[] = (await prisma.weeklyDigest.findMany({ where: { principalUserId: a.batch.principalUserId, institution } })) ?? [];
      const same = earlierRows.find((r) => r.weekKey === weekKey);
      if (same && same.contentHash === hash) { await ports.toTheSender({ organizationId: a.batch.organizationId, batch: a.batch, subject: 'The weekly report', text: ALREADY_HAVE_THIS_WEEK(institution, weekKey), short: ALREADY_HAVE_THIS_WEEK(institution, weekKey) }); continue; }

      /* Links to what the office already has: the model's, checked against real keys; else the plain overlap. Only for somebody who may read them. */
      const touches = a.engagementRows ? new Map<number, ARowItTouches[]>() : null;
      kept.developments.forEach((d, i) => {
        if (!touches) return;
        const keys = d.relatedKeys.length ? d.relatedKeys : touchesPlainly(d, engagements);
        touches.set(i, keys.map((k) => rows.find((r) => r.key === k)).filter(Boolean).map((r) => ({ key: r!.key, item: r!.item, status: r!.status, owner: r!.owner })));
      });
      const followUps = (a.engagementRows
        ? [...kept.followUps.map((f) => ({ text: f.text, about: f.about })), ...(kept.followUps.length ? [] : [...touches!.entries()].flatMap(([i, rs]) => rs.filter((r) => !['completed', 'cancelled'].includes(r.status)).slice(0, 1).map((r) => ({ text: `Check where "${r.item}" stands, because the report says "${kept.developments[i].title.replace(/[.!?]+$/, '')}"`, about: i }))))]
        : []
      ).slice(0, 5).map((f) => ({ ...f, state: 'proposed' as const }));

      const earlier = earlierRows.filter((r) => r.weekKey < weekKey).map((r) => ({ weekKey: r.weekKey as string, developments: r.developments as any }));
      const comparison = compareWithEarlier(kept.developments, earlier);
      const data = { institution, weekKey, reportDate: new Date(Date.UTC(reportDate.getUTCFullYear(), reportDate.getUTCMonth(), reportDate.getUTCDate())), contentHash: hash, fromFile: item.fileName, sentByUserId: a.batch.sender.kind === 'contact' ? null : a.batch.fromUserId, developments: kept.developments as any, followUps: followUps as any };
      if (same) await prisma.weeklyDigest.update({ where: { id: same.id }, data: { ...data, revision: (same.revision ?? 1) + 1 } });
      else await prisma.weeklyDigest.create({ data: { organizationId: a.batch.organizationId, principalUserId: a.batch.principalUserId, ...data, revision: 1 } });

      const input = { institution, weekKey, forwardedOn: item.receivedAt, fileName: item.fileName, developments: kept.developments, comparison, touches, followUps, reportDate, alreadyHad: false };
      const full = theFullBriefing(input);
      const short = theShortBriefing(input);
      await ports.toTheSender({ organizationId: a.batch.organizationId, batch: a.batch, subject: `The ${institution} briefing for ${dayWords(reportDate)}`, text: full, short });
      told.push(full);
    } catch {
      /* The batch is read again at the next look only if it was not claimed; a report that cannot be read here is still kept as material. */
    }
  }
  return told;
}

/** The latest week kept for an institution, for a person who asks what the Assembly said. Null when nothing has been kept. */
export async function theLatestWeek(prisma: any, principalUserId: string, institution?: string): Promise<{ institution: string; weekKey: string; developments: any[] } | null> {
  const rows: any[] = (await prisma.weeklyDigest?.findMany?.({ where: { principalUserId, ...(institution ? { institution } : {}) } }).catch(() => [])) ?? [];
  const last = rows.sort((x, y) => String(y.weekKey).localeCompare(String(x.weekKey)))[0];
  return last ? { institution: last.institution, weekKey: last.weekKey, developments: last.developments } : null;
}
