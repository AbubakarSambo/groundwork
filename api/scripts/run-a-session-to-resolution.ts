/**
 * RUN ONE GROUND ALL THE WAY: the open session, the closing session, the resolution. Through the
 * real engine. Counts the writer tables before and after so the ones that never fire show up.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/run-a-session-to-resolution.ts --ground <id> --lead <email> --participant <email>
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { GroundsService } from '../src/modules/grounds/grounds.service';
import { ConversationService } from '../src/modules/conversation/conversation.service';
import { ResolutionService } from '../src/modules/resolution/resolution.service';
import { ReviewsComingUpCron } from '../src/modules/reports/reviews-coming-up.cron';
import { ReportsService } from '../src/modules/reports/reports.service';
import { IntelligenceService } from '../src/modules/intelligence/intelligence.service';
import { BoardService } from '../src/modules/board/board.service';

const arg = (n: string, d?: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const GROUND = arg('ground')!; const LEAD = arg('lead')!.toLowerCase(); const PART = arg('participant')!.toLowerCase();
const log = (m: string) => console.log(`[run ${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TABLES = ['record_entries','pattern_detections','coaching_states','work_mentions','ground_dependencies','deliveries','proposed_changes','interactions','person_objectives','ground_documents','participant_notes','person_style_profiles','reports','report_rounds','org_intelligence','knowledge_cards','knowledge_retrievals','ground_baselines','resolutions','outcomes','outcome_feedback','evaluations_due','assertions','reported_figures','obligations','agreements','documents_elsewhere','product_metrics','ground_polls','session_reports','worded_lines','commitments','todos'];

const SESSION_3 = {
  lead: [
    'Six weeks in. Habiba has logged seven member conversations in the tracker, one short of the eight, and Sahel Seeds has a proposal drafted. The template question is solved: we used the Bayer proposal as the base.',
    'The tracker has been current every Friday for four weeks running. I checked it this morning. That commitment is met.',
    'What is not moving is the second proposal. Kano Agro went quiet after the second call and nobody has chased them for ten days. I want a decision from her on whether to chase or replace them with Dala Farms.',
    'Success at ninety days stands: eight conversations, two proposals, tracker current. We are one conversation and one proposal short with five weeks to go. I think it is on track.',
    'Nothing else. Next two weeks: eighth conversation logged, and a decision on Kano Agro.',
  ],
  participant: [
    'I have had seven member conversations, all logged in the tracker within a day. The Sahel Seeds proposal is drafted from the Bayer template and Qadira has reviewed it once.',
    'The tracker is updated every Friday, I have not missed one since the second week.',
    'Kano Agro stopped replying after the second call. I emailed once and did not want to push. I would rather move to Dala Farms, who asked for a proposal on our first call, and come back to Kano Agro in November.',
    'By the next check-in I will have the eighth conversation logged and the Dala Farms proposal drafted. That would make two proposals.',
    'One thing: I would like to run the next Bayer follow-up call myself with Qadira listening rather than the other way round.',
  ],
};
const CLOSING = {
  lead: [
    'Ninety days. Eight member conversations logged, two proposals sent, Sahel Seeds and Dala Farms, and the tracker current every Friday for eleven of thirteen weeks. She ran the last two Bayer follow-ups herself.',
    'Where we differed early was outreach: she waited for introductions, I expected her to go direct. That was as much my briefing as her instinct, and it was resolved by week six.',
    'My decision is to confirm her in the role. The next ninety days should add ownership of the Bayer relationship end to end.',
  ],
  participant: [
    'At ninety days I have eight conversations logged, two proposals out, and I have run the Bayer follow-ups myself for the last month. The tracker slipped twice, both weeks I was travelling.',
    'What I would change is how the first month was set up: I did not know I was expected to reach out directly. Once that was said, it was fine.',
    'I want to keep the role and take on the Bayer relationship fully.',
  ],
};

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService); const grounds = app.get(GroundsService); const conversation = app.get(ConversationService);
  const resolution = app.get(ResolutionService); const reviews = app.get(ReviewsComingUpCron); const reports = app.get(ReportsService);
  const intelligence = app.get(IntelligenceService); const board = app.get(BoardService);

  const counts = async () => { const out: Record<string, number> = {}; for (const t of TABLES) { try { const r: any[] = await prisma.$queryRawUnsafe(`select count(*)::int as n from "${t}"`); out[t] = r[0].n; } catch { out[t] = -1; } } return out; };
  const before = await counts();

  const ground = await prisma.ground.findUnique({ where: { id: GROUND }, include: { participants: true } });
  if (!ground) throw new Error('no ground');
  const lead = await prisma.user.findFirst({ where: { email: LEAD } }); const part = await prisma.user.findFirst({ where: { email: PART } });
  if (!lead || !part) throw new Error('lead or participant account missing');
  log(`Ground "${ground.label}" is ${ground.status}.`);

  const runSession = async (userId: string, n: number, lines: string[], who: string) => {
    const pr = await prisma.groundParticipant.findFirst({ where: { groundId: GROUND, userId } });
    if (!pr) throw new Error(`${who} has no participant row`);
    let ci = await prisma.checkIn.findFirst({ where: { participantId: pr.id, sessionNumber: n } });
    if (!ci) ci = await prisma.checkIn.create({ data: { groundId: GROUND, participantId: pr.id, sessionNumber: n, status: 'NOT_STARTED' } });
    if (ci.availableFrom && ci.availableFrom > new Date()) await prisma.checkIn.update({ where: { id: ci.id }, data: { availableFrom: new Date(Date.now() - 86_400_000) } });
    if (ci.status === 'COMPLETED') { log(`  session ${n}, ${who}: already complete`); return ci.id; }
    if (ci.status === 'NOT_STARTED') await conversation.open(ci.id, userId);
    for (const line of lines) { const r = await conversation.sendMessage(ci.id, userId, line); log(`    ${who} > ${line.slice(0, 50)}…  < ${r.reply.replace(/\s+/g, ' ').slice(0, 70)}…`); }
    try { await conversation.complete(ci.id, userId); } catch (e: any) { log(`    complete refused (${e?.message}); one more answer`); await conversation.sendMessage(ci.id, userId, 'That is everything for this session.'); await conversation.complete(ci.id, userId); }
    log(`  session ${n}, ${who}: complete.`);
    return ci.id;
  };
  const waitForRelease = async () => { for (let i = 0; i < 18; i++) { const rep = await prisma.report.findUnique({ where: { groundId: GROUND }, select: { releasedAt: true } }); if (rep?.releasedAt) return true; await sleep(5000); } return false; };

  /* 1. the open session */
  await runSession(lead.id, 3, SESSION_3.lead, 'lead');
  await runSession(part.id, 3, SESSION_3.participant, 'participant');
  log(`session 3 report ${await waitForRelease() ? 'released' : 'not released yet'}.`);

  /* a meeting poll on the board, the one editable thing there */
  try { await board.upsertPoll(GROUND, lead.id, { question: 'When do we meet to go over the ninety days?', options: ['Monday 10:00', 'Tuesday 14:00'] } as any); log('poll set'); } catch (e: any) { log(`poll: ${e?.message}`); }

  /* 2. the closing session */
  const closing = await grounds.beginClosingSession(GROUND, ground.organizationId, lead.id);
  log(`closing session begun for ${closing.participantsFlagged}.`);
  const leadFinal = await prisma.checkIn.findFirst({ where: { groundId: GROUND, participant: { userId: lead.id }, isFinal: true }, orderBy: { sessionNumber: 'desc' } });
  const partFinal = await prisma.checkIn.findFirst({ where: { groundId: GROUND, participant: { userId: part.id }, isFinal: true }, orderBy: { sessionNumber: 'desc' } });
  await runSession(lead.id, leadFinal!.sessionNumber, CLOSING.lead, 'lead');
  await runSession(part.id, partFinal!.sessionNumber, CLOSING.participant, 'participant');
  await sleep(20000);
  try { await reports.finishClosingSynthesesThatFailed(); } catch (e: any) { log(`closing synthesis sweep: ${e?.message}`); }

  /* 3. the resolution */
  const state = await resolution.get(GROUND, lead.id);
  log(`resolution before: ${JSON.stringify(state).slice(0, 200)}`);
  await resolution.propose(GROUND, lead.id, 'KEEP');
  try { await resolution.propose(GROUND, part.id, 'KEEP'); } catch (e: any) { log(`participant confirm: ${e?.message}`); }
  const after = await prisma.ground.findUnique({ where: { id: GROUND }, select: { status: true } });
  log(`ground is now ${after?.status}.`);

  /* 4. the sweeps that would run on their own clocks */
  try { await reviews.tellManagersWhatIsComingUp(); log('reviews-coming-up sweep ran'); } catch (e: any) { log(`reviews sweep: ${e?.message}`); }
  try { await reports.weeklyOutcomeLearningReport(); log('weekly outcome report ran'); } catch (e: any) { log(`outcome report: ${e?.message}`); }
  try { await intelligence.weeklyLongitudinalSynthesis(); log('longitudinal synthesis ran'); } catch (e: any) { log(`longitudinal: ${e?.message}`); }
  await sleep(15000);

  const now = await counts();
  console.log('\nTABLE | BEFORE | AFTER');
  for (const t of TABLES) console.log(`${t} | ${before[t]} | ${now[t]}${now[t] === 0 ? '  <-- still zero' : now[t] > before[t] ? '  +' + (now[t] - before[t]) : ''}`);
  const checkIns = await prisma.checkIn.findMany({ where: { groundId: GROUND }, select: { id: true, sessionNumber: true, status: true, isFinal: true, participant: { select: { email: true } } }, orderBy: { sessionNumber: 'asc' } });
  console.log('\nCHECK-INS', JSON.stringify(checkIns));
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
