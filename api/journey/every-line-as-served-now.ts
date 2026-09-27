/**
 * A RUN'S STORED REPORTS, SERVED AGAIN THROUGH TODAY'S CODE, WRITTEN OUT FOR THE SCORER.
 *
 * Task 1.6 asks for every problem count in the run scorer at zero. A new run takes an hour and a
 * model budget; this answers the cheaper question first: with the reports the run already stored,
 * what does each person read now? For every scenario in a run folder it loads the ground's stored
 * report from the database and serves it the way `get()` does - the lead through `asItWasShared`,
 * the first other person through the same door and then their own filters, with the record over
 * time narrowed to them - and writes a run file in the shape the scorer reads, one session each.
 *
 * Conversation turns are the ones the run captured, passed through the two repairs a turn now gets
 * before it is saved (a-sentence-starts-with-a-capital, the-lead-has-a-name). The board's own
 * sentences (howItIsGoing, divergence, objectives) are built at read by the board service and are
 * copied from the run as they were; its judgement and its record over time come from the report.
 *
 * `--rebuild-over-time` also rebuilds the record over time from the database the way the next
 * synthesis will store it, because a stored row keeps the wording it was written with.
 * `--check` also runs the check before a report is kept (every-line-is-read-before-it-is-kept) with
 * no model: every line it would have sent for a rewrite is listed, with how long the check took and
 * how many model calls it would have made, and nothing is changed.
 *
 * Local only. It refuses any database that is not on this machine.
 *
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 npx ts-node -T journey/every-line-as-served-now.ts journey/all-24/run-10 <out-folder> [--rebuild-over-time] [--check]
 */
import { PrismaClient, PartyType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ReportsService } from '../src/modules/reports/reports.service';
import { whatAParticipantMayRead } from '../src/modules/reports/the-judgement-is-the-leads';
import { withoutOtherPeoplesReads } from '../src/modules/reports/own-reads-only';
import { overTimeForThisReader } from '../src/modules/reports/what-the-record-shows-over-time';
import { labelsForParties } from '../src/modules/reports/party-labels';
import { aSentenceStartsWithACapital } from '../src/modules/conversation/a-sentence-starts-with-a-capital';
import { theLeadByName } from '../src/modules/conversation/the-lead-has-a-name';
import { theFirstNameFrom } from '../src/modules/reports/a-title-is-not-a-first-name';
import { everyLineIsReadBeforeItIsKept, AReader } from '../src/modules/reports/every-line-is-read-before-it-is-kept';

async function main() {
  const [from, to] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const rebuild = process.argv.includes('--rebuild-over-time');
  const dryCheck = process.argv.includes('--check');
  const url = process.env.DATABASE_URL ?? '';
  if (!from || !to) throw new Error('Give the run folder and an output folder.');
  if (!/^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url)) {
    throw new Error('DATABASE_URL must be a database on this machine. This never reads anything else.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const svc: any = Object.create(ReportsService.prototype);
  svc.prisma = prisma;
  svc.logger = { log: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined };
  fs.mkdirSync(to, { recursive: true });
  let flagged = 0;
  let calls = 0;
  let lines = 0;
  let totalMs = 0;

  try {
    for (const file of fs.readdirSync(from).filter((f) => f.endsWith('.json')).sort()) {
      const run = JSON.parse(fs.readFileSync(path.join(from, file), 'utf8'));
      if (!run?.groundId || !Array.isArray(run.sessions)) continue;
      const ground: any = await prisma.ground.findUnique({
        where: { id: run.groundId },
        select: {
          scenario: true, peersVisibleToEachOther: true, report: true,
          initiator: { select: { firstName: true, lastName: true } },
          participants: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, userId: true, email: true, partyType: true, createdAt: true, roleAsDescribed: true, managingOnly: true, nameGiven: true, organisationGiven: true, remitAsGiven: true, user: { select: { firstName: true, lastName: true } } },
          },
        },
      });
      if (!ground?.report) { console.warn(`${file}: no stored report for ${run.groundId}, skipped.`); continue; }
      const report: any = { ...ground.report };
      if (rebuild) {
        const labelById = labelsForParties(ground.participants);
        const rebuilt = await svc.readTheRecordOverTime(run.groundId, ground.participants, labelById).catch((e: any) => { console.warn(`${file}: over time not rebuilt (${e?.message})`); return null; });
        if (rebuilt) report.overTime = rebuilt;
      }
      const lead = ground.participants.find((p: any) => p.partyType === PartyType.INITIATOR);
      const other = ground.participants.find((p: any) => p.partyType !== PartyType.INITIATOR);
      const labels = labelsForParties(ground.participants);
      const asGround = (r: any) => ({ scenario: ground.scenario, peersVisibleToEachOther: ground.peersVisibleToEachOther, participants: ground.participants, report: r });
      const named = (r: any, reader: AReader) => svc.theReportAsItWasShared(asGround(r), reader.participantId, reader.isLead);
      const served = (r: any, reader: AReader) => {
        if (reader.isLead) return named(r, reader);
        const viewer = { isLead: false, participantId: reader.participantId };
        return {
          ...whatAParticipantMayRead(withoutOtherPeoplesReads(named(r, reader), { viewerLabel: labels.get(reader.participantId!) ?? null, viewerParticipantId: reader.participantId, viewerIsLead: false }), viewer),
          overTime: named({ overTime: overTimeForThisReader(r.overTime, viewer) }, reader).overTime,
        };
      };
      const asLead: AReader = { participantId: lead?.id ?? null, isLead: true };
      const asOther: AReader | null = other ? { participantId: other.id, isLead: false } : null;

      if (dryCheck) {
        const started = Date.now();
        const callsBefore = calls;
        const fields = ['sharedPicture', 'theOpening', 'agreements', 'divergences', 'centralQuestion', 'findings', 'theJudgement', 'overTime', 'inferences'];
        const { done } = await everyLineIsReadBeforeItIsKept({
          report: Object.fromEntries(fields.map((f) => [f, report[f]])),
          readers: [asLead, ...ground.participants.filter((p: any) => p.partyType !== PartyType.INITIATOR).map((p: any) => ({ participantId: p.id, isLead: false }))],
          named, served, fields,
          /* No model: every line is handed back as it was, so the re-reading runs in full and is timed. */
          rewriteAll: async (asks) => { calls += 1; lines += asks.length; return Object.fromEntries(asks.map((a) => [a.id, a.sentence])); },
        });
        const took = Date.now() - started;
        totalMs += took;
        console.log(`  ${file}: the check took ${took} ms without the model, ${done.length} line(s), ${calls - callsBefore} model call(s).`);
        flagged += done.length;
        for (const d of done) console.log(`  ${file} ${d.path}: ${d.problems.join('; ')} -> would be ${d.outcome === 'dropped' ? 'rewritten, else dropped' : 'rewritten, else left'}: "${d.was.slice(0, 160)}"`);
      }

      const leadReport = served(report, asLead);
      const participantReport = asOther ? served(report, asOther) : null;
      const last = run.sessions[run.sessions.length - 1] ?? {};
      const leadFirst = theFirstNameFrom(ground.initiator?.firstName, ground.initiator?.lastName);
      const out = {
        ...run,
        sessions: [{
          people: run.sessions.flatMap((s: any) => s.people ?? []).map((p: any) => ({
            ...p,
            turns: (p.turns ?? []).map((t: any) => (t.from === 'GROUNDWORK'
              ? { ...t, text: (p.isLead ? { text: aSentenceStartsWithACapital(t.text ?? '').text } : theLeadByName(aSentenceStartsWithACapital(t.text ?? '').text, leadFirst)).text }
              : t)),
          })),
          leadReport,
          participantReport,
          board: { ...(last.board ?? {}), theJudgement: leadReport.theJudgement ?? null, theTable: null, overTime: leadReport.overTime ?? null },
          participantBoard: last.participantBoard ? { ...last.participantBoard, theJudgement: null, theTable: null, overTime: participantReport?.overTime ?? null } : null,
          patterns: last.patterns, commitments: last.commitments,
        }],
      };
      fs.writeFileSync(path.join(to, file), JSON.stringify(out, null, 1));
    }
  } finally {
    await prisma.$disconnect();
  }
  if (dryCheck) console.log(`${flagged} line(s) the check would have acted on, sent in ${calls} model call(s) (${lines} line(s)); the check itself took ${totalMs} ms in all.`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(2);
});
