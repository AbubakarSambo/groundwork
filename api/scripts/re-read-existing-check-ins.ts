/**
 * RE-READ EACH EXISTING CHECK-IN ONCE: ITS KIND OF WORK AND ITS SET-UP TARGETS, FROM THE LEAD'S OWN WORDS (existing customers,
 * 22 November 2026; docs/existing-customers-22-nov.md, plan step 1).
 *
 * A check-in set up in the chat, as Drop Access's and RHEA Soil's were, was saved with an empty brief and an empty end state. The lead's
 * own words are in lead_setup_words. So the kind of work was read from "A check-in at Drop Access" and came back as none, and the
 * targets she gave at set-up ("each agent sells 8 freezers and activates 4 points a week") were never stored. Their boards had no
 * numbers, no targets and no deals.
 *
 * What the lead said at set-up has one owner (grounds/what-the-lead-said-at-set-up.ts): her own words where they were kept, otherwise the
 * set-up read-back she saved, as on Drop Access's freezer team, saved on main with neither.
 *
 * This reads each existing check-in again with the release's own writers, never a second reading:
 *  - the kind of work: GroundsService.readTheKindOfWork, the one reading (readTheSituationAndTheKind), which now reads what the lead
 *    said at set-up too. It never changes a kind the lead set, and a sales kind already held stays. Where it gives a kind there was none, it
 *    emits KIND_OF_WORK_READ, and the board listener reads the finished check-ins into their records (deals, counts), as for a new one.
 *  - the targets: ConversationService.extractExpectations, the set-up target writer, given what the lead said at set-up as her set-up
 *    conversation. A target already on record, the same thing counted for the same person, is never written again.
 * It changes nothing else: no words, sessions, schedules, reports, statuses or emails, and it reopens nothing. The situation is kept as
 * saved, because nothing on record says whether the lead picked it.
 *
 * A dry run by default. On a database on this machine:
 *
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -P tsconfig.json --transpile-only scripts/re-read-existing-check-ins.ts
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -P tsconfig.json --transpile-only scripts/re-read-existing-check-ins.ts --write
 *
 * --check-in <id> reads one check-in only. On a hosted database, --hosted-database alone is a dry run, and --hosted-database --write asks
 * for the database's host name to be typed back and writes only when it matches. Without --hosted-database it refuses any database that
 * is not on this machine. The model is Gemini, so the shell needs the same model settings as the API (GOOGLE_SERVICE_ACCOUNT_JSON and the
 * GEMINI_ settings).
 */
import * as readline from 'readline';
import { hostOf, isOnThisMachine, theTypedHostMatches } from '../journey/stamp-said-word-for-word';

export type WhatMayHappen =
  | { refused: true; why: string }
  | { refused: false; host: string; hosted: boolean; writes: boolean; mustTypeTheHostBack: boolean };

/** From the address and the flags alone, before anything is opened. A dry run unless --write is given. */
export function whatThisRunMayDo(url: string, args: readonly string[]): WhatMayHappen {
  const host = hostOf(url);
  if (!host) return { refused: true, why: 'DATABASE_URL is not a Postgres address, so nothing was read or written.' };
  const writes = args.includes('--write');
  if (isOnThisMachine(url)) return { refused: false, host, hosted: false, writes, mustTypeTheHostBack: false };
  if (!args.includes('--hosted-database')) {
    return { refused: true, why: `DATABASE_URL points to ${host}, which is not on this machine. Add --hosted-database to run it there. Nothing was read or written.` };
  }
  return { refused: false, host, hosted: true, writes, mustTypeTheHostBack: writes };
}

function askOnTheKeyboard(question: string): Promise<string | null> {
  if (!process.stdin.isTTY) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  const args = process.argv.slice(2);
  const url = process.env.DATABASE_URL ?? '';
  const may = whatThisRunMayDo(url, args);
  if (may.refused) { console.log(may.why); process.exit(1); }
  if (may.mustTypeTheHostBack) {
    const typed = await askOnTheKeyboard(`To write to the database at ${may.host}, type its host name exactly: `);
    if (!theTypedHostMatches(typed, may.host)) { console.log('The host name typed back did not match the database, so nothing was written.'); process.exit(1); }
  }
  const at = args.indexOf('--check-in');
  const only = at >= 0 ? (args[at + 1] ?? null) : null;

  /* Loaded only after the checks above, so a refused run never opens the database. */
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  const { PrismaService } = await import('../src/modules/prisma/prisma.service');
  const { GroundsService } = await import('../src/modules/grounds/grounds.service');
  const { ConversationService } = await import('../src/modules/conversation/conversation.service');
  const { AnthropicService } = await import('../src/modules/conversation/anthropic.service');
  const { readTheSituationAndTheKind, THE_SCENARIOS_IN_WORDS } = await import('../src/modules/entry/which-situation-this-is');
  const { theSetupWords, oneOfTheKinds } = await import('../src/modules/board/the-kind-of-work');
  const { whatTheLeadSaidAtSetUp } = await import('../src/modules/grounds/what-the-lead-said-at-set-up');
  const { GroundworkEvents } = await import('../src/common/events');
  const { EventEmitter2 } = await import('@nestjs/event-emitter');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService) as any;
    const grounds = app.get(GroundsService);
    const conversation = app.get(ConversationService);
    const model = app.get(AnthropicService);
    const events = app.get(EventEmitter2);
    const all = await prisma.ground.findMany({
      where: only ? { id: only } : {},
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, label: true, scenario: true, brief: true, endState: true, resolutionState: true, kindOfWork: true, kindOfWorkSetBy: true,
        initiatorId: true,
        objectives: { select: { name: true, target: true, ownerParticipantId: true } },
        participants: { select: { id: true, userId: true, partyType: true } },
      },
    });
    console.log(`${all.length} ${all.length === 1 ? 'check-in' : 'check-ins'} to read${may.writes ? '' : ' (a dry run: nothing will be written)'}.`);
    let kinds = 0; let targets = 0;
    for (const g of all) {
      const name = `${(g.label ?? '').trim() || 'A check-in'} (${g.id})`;
      /* What the lead said at set-up, from its one owner: her own words, or the set-up read-back she saved where they were not kept. */
      const own = (await whatTheLeadSaidAtSetUp(prisma, g.id)).trim();
      const lead = (g.participants as any[]).find((p) => p.partyType === 'INITIATOR' || (!!g.initiatorId && p.userId === g.initiatorId));
      const leadsFirst = lead ? await prisma.checkIn.findFirst({ where: { participantId: lead.id }, orderBy: { sessionNumber: 'asc' }, select: { id: true } }) : null;
      const before = (g.objectives as any[]).length;
      /* The kind, as the one reading would give it. A kind the lead set is never read again. */
      let kindSays: string;
      if (g.kindOfWorkSetBy === 'lead') kindSays = `keeps the kind the lead set, ${g.kindOfWork}`;
      else {
        const words = theSetupWords(g, THE_SCENARIOS_IN_WORDS[g.scenario as keyof typeof THE_SCENARIOS_IN_WORDS] ?? null, own || null);
        const read = words.trim() ? oneOfTheKinds((await readTheSituationAndTheKind(model as any, words).catch(() => null))?.kind ?? null) : null;
        kindSays = read === g.kindOfWork ? `keeps ${g.kindOfWork ?? 'no kind'}` : read ? `${g.kindOfWork ?? 'no kind'} would be read as ${read}` : `${g.kindOfWork ?? 'no kind'}, and the reading gives none`;
      }
      const targetSays = own && lead && leadsFirst
        ? `has ${before} ${before === 1 ? 'target' : 'targets'}; what the lead said at set-up (${own.length} characters) would be read for her targets`
        : `has ${before} ${before === 1 ? 'target' : 'targets'}; ${own ? 'no lead check-in to read her targets into' : 'nothing the lead said at set-up is kept'}`;
      console.log(`- ${name}: ${kindSays}. It ${targetSays}.`);
      if (!may.writes) continue;
      const kindBefore = g.kindOfWork;
      await grounds.readTheKindOfWork(g.id);
      if (own && lead && leadsFirst) {
        const landed = await conversation.extractExpectations(leadsFirst.id, lead.id, g.id, [{ role: 'user', content: own }]).catch(() => false);
        /* As at set-up: the board is warmed again once her targets have landed. */
        if (landed) events.emit(GroundworkEvents.SETUP_READ, { groundId: g.id });
      }
      const now = await prisma.ground.findUnique({ where: { id: g.id }, select: { kindOfWork: true, objectives: { select: { id: true } } } });
      /* On a sales check-in with Release 1 on, the lead's targets wait for her yes, as one card (the release's own rule, 18 October). */
      const forHerYes = await prisma.planProposal.count({ where: { groundId: g.id, kind: 'GOAL', status: 'PENDING' } }).catch(() => 0);
      if (now?.kindOfWork !== kindBefore) kinds++;
      targets += (now?.objectives?.length ?? before) - before;
      console.log(`  Written: the kind of work is ${now?.kindOfWork ?? 'none'}. It has ${now?.objectives?.length ?? before} targets (${(now?.objectives?.length ?? before) - before} new), and ${forHerYes} ${forHerYes === 1 ? 'target waits' : 'targets wait'} for the lead's yes.`);
    }
    if (!may.writes) { console.log('This was a dry run. Nothing was written. Add --write to write it.'); return; }
    console.log(`${kinds} ${kinds === 1 ? 'kind of work was' : 'kinds of work were'} written, and ${targets} ${targets === 1 ? 'target' : 'targets'}.`);
    /* A kind read where there was none sends the finished check-ins to be read for their records (BoardListener.onKindOfWorkRead). That
       runs on its own after each read, so the run waits for it before it closes. */
    if (kinds) {
      const ms = Number(process.env.WAIT_FOR_THE_RECORDS_MS ?? 180_000);
      console.log(`Waiting ${Math.round(ms / 1000)} seconds while the finished check-ins are read into their deals and counts.`);
      await new Promise((r) => setTimeout(r, ms));
    }
  } finally {
    await app.close();
  }
}

if (require.main === module) main().then(() => process.exit(0)).catch((err) => { console.error(err?.message ?? err); process.exit(2); });
