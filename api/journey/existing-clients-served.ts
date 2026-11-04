/**
 * WHAT EACH READER IS SERVED, WRITTEN OUT, FOR THE COMPARISON OF OLD AND NEW CODE (decision 90, item 2).
 *
 * This script only READS, and it runs in either tree: in this one (the new code) and in a copy of the live
 * main line (the old code). It serves a sample of the check-ins that already exist, as each reader, through
 * the services, and writes one line per read to a file. `existing-clients-compare.ts` runs it once in each
 * tree and compares the two files. It never reads DATABASE_URL, refuses --write, makes the connection read
 * only at the database, refuses every write the services try (and writes that down as a fault), and replaces
 * the model, the mailer and WhatsApp with stand-ins that refuse to be called.
 *
 *   npx ts-node -T journey/existing-clients-served.ts --database postgresql://localhost/gw_pw9_1786222102 --out served.jsonl
 *
 * Options: --per-scenario <n> (default 8), --organisations <n> (how many organisations to ask Ask Groundwork in, default 30),
 *          --hosted-database (for a copy of the live data on staging, after the host name is typed back).
 */
import * as fs from 'fs';
import * as readline from 'readline';
import { ATriedToWrite, installTheGuard, makeTheDatabaseReadOnly, outcomeOf, withOneConnection } from './the-read-only-guard';

export const THE_FIVE_QUESTIONS = ['What is due?', 'Who is waiting on me?', 'What did we agree?', 'Where am I needed?', 'What happened last week?'];

const flag = (args: readonly string[], name: string) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const onThisMachine = (url: string) => /^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);
const hostOf = (url: string) => { try { return new URL(url).hostname; } catch { return null; } };

type Line = Record<string, unknown>;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--write') || args.includes('--hosted-write')) throw new Error('This only reads. --write was refused and nothing was read.');
  const url = flag(args, '--database');
  const out = flag(args, '--out');
  if (!url || !out) throw new Error('Give --database <address> and --out <file>. Nothing was read.');
  const host = hostOf(url);
  if (!host) throw new Error('The address is not a Postgres address. Nothing was read.');
  if (!onThisMachine(url)) {
    if (!args.includes('--hosted-database')) throw new Error(`${host} is not on this machine. Add --hosted-database to read a hosted copy. Nothing was read.`);
    if (!process.stdin.isTTY) throw new Error('A hosted copy needs the host name typed back, and there is no keyboard. Nothing was read.');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const typed: string = await new Promise((r) => rl.question(`To read the database at ${host}, type its host name exactly: `, (a) => { rl.close(); r(a); }));
    if (typed.trim() !== host) throw new Error('The host name typed back did not match. Nothing was read.');
  }
  const perScenario = Number.parseInt(flag(args, '--per-scenario') ?? '8', 10);
  const organisationsToAsk = Number.parseInt(flag(args, '--organisations') ?? '30', 10);

  process.env.NODE_ENV = 'test';
  process.env.EMAIL_SENDS_FOR_REAL = 'false';
  process.env.DATABASE_URL = withOneConnection(url);
  const writes: string[] = [];
  const { Test } = await import('@nestjs/testing');
  const { AppModule } = await import('../src/app.module');
  const { PrismaService } = await import('../src/modules/prisma/prisma.service');
  const { AnthropicService } = await import('../src/modules/conversation/anthropic.service');
  const { EmailService } = await import('../src/modules/email/email.service');
  const { WhatsAppService } = await import('../src/modules/whatsapp/whatsapp.service');
  const { BoardService } = await import('../src/modules/board/board.service');
  const { ReportsService } = await import('../src/modules/reports/reports.service');
  const { GroundsService } = await import('../src/modules/grounds/grounds.service');
  const { AssistantService } = await import('../src/modules/assistant/assistant.service');
  const refuses = (what: string) => new Proxy({}, { get: (_t, name: string) => (name === 'then' ? undefined : () => { throw new ATriedToWrite(`${what}.${name} (this check calls neither the model, the mailer nor WhatsApp)`); }) });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AnthropicService).useValue(refuses('the model'))
    .overrideProvider(EmailService).useValue(refuses('email'))
    .overrideProvider(WhatsAppService).useValue(refuses('WhatsApp'))
    .compile();
  const prisma: any = moduleRef.get(PrismaService, { strict: false });
  const byDesign: string[] = [];
  installTheGuard(prisma, (what) => writes.push(what), (what) => byDesign.push(what));
  await makeTheDatabaseReadOnly(prisma);
  const board: any = moduleRef.get(BoardService, { strict: false });
  const reports: any = moduleRef.get(ReportsService, { strict: false });
  const grounds: any = moduleRef.get(GroundsService, { strict: false });
  const assistant: any = moduleRef.get(AssistantService, { strict: false });
  // These two exist only in the new code. In the old code they are simply absent.
  const optional = async (path: string, name: string) => {
    try { const m = await import(path); return moduleRef.get(m[name], { strict: false }) as any; } catch { return null; }
  };
  const company = await optional('../src/modules/grounds/company.service', 'CompanyService');
  const suites = await optional('../src/modules/suites/suites.service', 'SuitesService');

  const fd = fs.openSync(out, 'w');
  const put = (l: Line) => fs.writeSync(fd, JSON.stringify(l) + '\n');
  const serve = async (base: Line, run: () => Promise<unknown>) => {
    const before = writes.length;
    try {
      const served = await run();
      put({ ...base, outcome: 'served', served });
    } catch (err) {
      const { outcome, why } = outcomeOf(err);
      put({ ...base, outcome, why });
      return;
    }
    if (writes.length > before) put({ ...base, outcome: 'wrote', why: writes.slice(before).join(', ') });
  };

  /* The sample: for every scenario kind present, the first check-ins that have a report, then the rest, oldest first. */
  const kinds: { scenario: string }[] = await prisma.ground.groupBy({ by: ['scenario'] });
  const sample: any[] = [];
  for (const { scenario } of kinds.sort((a, b) => a.scenario.localeCompare(b.scenario))) {
    const pool: any[] = await prisma.ground.findMany({
      where: { scenario }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 60,
      select: {
        id: true, label: true, scenario: true, organizationId: true, initiatorId: true,
        report: { select: { id: true } },
        participants: { select: { userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true, deletedAt: true } } } },
      },
    });
    pool.sort((a, b) => Number(!!b.report) - Number(!!a.report) || a.id.localeCompare(b.id));
    sample.push(...pool.slice(0, perScenario));
  }
  put({ t: 'sample', checkIns: sample.length, scenarios: kinds.length });
  /* Which kind of work each check-in has (a column only the new code has). */
  try {
    const rows: any[] = await prisma.ground.groupBy({ by: ['kindOfWork'], _count: { _all: true } });
    put({ t: 'kinds', rows: rows.map((r) => ({ kind: r.kindOfWork, checkIns: r._count._all })) });
  } catch { /* the old code has no such column */ }

  for (const g of sample) {
    const names = [...new Set<string>(g.participants.flatMap((p: any) => [p.nameGiven, p.user?.firstName, p.user ? `${p.user.firstName} ${p.user.lastName}` : null]).filter(Boolean))];
    put({ t: 'ground', ground: g.id, scenario: g.scenario, label: g.label, organizationId: g.organizationId, hasReport: !!g.report, names });
    const readers: { role: string; userId: string }[] = [];
    const lead = await prisma.user.findUnique({ where: { id: g.initiatorId }, select: { id: true, deletedAt: true } });
    if (lead && !lead.deletedAt) readers.push({ role: 'lead', userId: lead.id });
    for (const p of g.participants.filter((p: any) => p.userId && p.userId !== g.initiatorId && !p.user?.deletedAt).slice(0, 2)) readers.push({ role: 'participant', userId: p.userId });
    const party = g.participants.map((p: any) => p.userId).filter(Boolean);
    const admin = await prisma.user.findFirst({ where: { organizationId: g.organizationId, role: 'ADMIN', isActive: true, deletedAt: null, id: { notIn: [...party, g.initiatorId] } }, select: { id: true } });
    if (admin) readers.push({ role: 'admin', userId: admin.id });
    for (const r of readers) {
      const base = { t: 'read', ground: g.id, scenario: g.scenario, role: r.role, userId: r.userId };
      await serve({ ...base, what: 'board' }, () => board.get(g.id, r.userId, 'text'));
      await serve({ ...base, what: 'report' }, () => reports.get(g.id, r.userId, g.organizationId));
      await serve({ ...base, what: 'page' }, () => grounds.get(g.id, g.organizationId, r.userId));
    }
  }

  /* Every organisation's Company page and suites page, for its admin, one lead and one participant (new code only). */
  if (company || suites) {
    const orgs: any[] = await prisma.organization.findMany({ orderBy: { id: 'asc' }, select: { id: true } });
    let asked = 0;
    for (const o of orgs) {
      const users: any[] = await prisma.user.findMany({ where: { organizationId: o.id, isActive: true, deletedAt: null }, orderBy: { id: 'asc' }, take: 40, select: { id: true, email: true, role: true } });
      if (!users.length) continue;
      const g: any = await prisma.ground.findFirst({ where: { organizationId: o.id }, select: { initiatorId: true, participants: { select: { userId: true } } } });
      const admin = users.find((u) => u.role === 'ADMIN');
      const lead = g ? users.find((u) => u.id === g.initiatorId) : null;
      const other = g ? users.find((u) => u.id !== g.initiatorId && g.participants.some((p: any) => p.userId === u.id)) : null;
      const chosen: [string, any][] = [['admin', admin], ['lead', lead], ['participant', other]].filter(([, u]) => u) as [string, any][];
      for (const [role, u] of chosen) {
        const reader = { userId: u.id, email: u.email, organizationId: o.id, role: u.role };
        if (company) await serve({ t: 'company', organizationId: o.id, role, userId: u.id }, () => company.forReader(reader));
        if (suites) await serve({ t: 'suites', organizationId: o.id, role, userId: u.id }, () => suites.forReader(reader));
      }
    }
  }

  /*
   * Ask Groundwork: the five most common questions, for leads and participants who already have a roster entry
   * (the first question from anybody else makes one, which a read only check cannot do). Up to
   * `organisationsToAsk` of each, a lead being somebody who set up a check-in and a participant somebody who did not.
   */
  const roster: any[] = await prisma.person.findMany({ where: { linkedUserId: { not: null }, active: true }, orderBy: { id: 'asc' }, select: { id: true, organizationId: true, linkedUserId: true } });
  const taken = { lead: 0, participant: 0 } as Record<string, number>;
  for (const person of roster) {
    const leads = await prisma.ground.count({ where: { initiatorId: person.linkedUserId, organizationId: person.organizationId } });
    const role = leads > 0 ? 'lead' : 'participant';
    if (taken[role] >= organisationsToAsk) continue;
    if (role === 'participant' && !(await prisma.groundParticipant.count({ where: { userId: person.linkedUserId } }))) continue;
    taken[role] += 1;
    for (const q of THE_FIVE_QUESTIONS) {
      await serve({ t: 'ask', organizationId: person.organizationId, role, personId: person.id, question: q }, () => assistant.respond(person.organizationId, person.id, q));
    }
  }

  put({ t: 'done', writesRefused: [...new Set(writes)], writesByDesign: byDesign.reduce((m: Record<string, number>, w) => ({ ...m, [w]: (m[w] ?? 0) + 1 }), {}) });
  fs.closeSync(fd);
  await moduleRef.close().catch(() => undefined);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => { console.error(err?.message ?? err); process.exit(1); });
}
