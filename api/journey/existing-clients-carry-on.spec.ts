/**
 * THE EXISTING CLIENTS' CHECK-INS CARRY ON, THROUGH RELEASE NIGHT (decisions 54, 74 item 7, 88).
 *
 * Hafsah's two existing clients must see no check-in reopened, restarted, stalled or emailed by
 * surprise, and every next session must open on the date it was already going to open on.
 *
 * What this does, on the LOCAL test database `gw_pw9_1786222102` only, and inside one transaction
 * that is always rolled back (nothing it writes survives, and nothing is ever sent):
 *
 *   1. Seeds check-ins in the shape the live main line leaves them in: every column the new
 *      migrations add is at the value the migration gives an old row (null, false or empty).
 *   2. Runs the data change of every migration since the live main line (the UPDATE and INSERT
 *      statements in the migration files, nothing else; the columns already exist here).
 *   3. Starts the new version the way release night does (the release moment is written), then runs
 *      every scheduled job that can email, message, stall, reopen or schedule a check-in, with the
 *      mail, the phone and the event bus replaced by recorders.
 *   4. Compares every scheduling column of the seeded check-ins before and after, and reads what
 *      the recorders were asked to send.
 *
 * It never connects to anything else. If the database is not there (CI), the tests say so and pass
 * without checking anything; they do not guess.
 *
 * `it.failing` marks a FINDING: the check-in does something on release night that decision 88 says
 * it must not. The test passes while the fault is there and turns red the moment it is fixed, so
 * that whoever fixes it turns it into a plain `it`. The findings are written up at the top of
 * docs/existing-users.md.
 */
import { PrismaClient, CheckInStatus, GroundStatus, PartyType, Cadence, GroundScenario, GroundMoment } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { GroundsCron } from '../src/modules/grounds/grounds.cron';
import { RemindService } from '../src/modules/conversation/remind.service';
import { RELEASE_MOMENT_KEY } from '../src/modules/grounds/the-release-moment';

jest.setTimeout(600_000);

/** The only database this file ever connects to. */
const THE_LOCAL_TEST_DATABASE = 'postgresql://hafsahjumare@localhost/gw_pw9_1786222102';
const LATEST_LIVE_MIGRATION = '20260923140000_what_we_have_so_far';
const DAY = 86_400_000;
const MARK = 'EXISTING-CLIENT';

class RolledBack extends Error {
  constructor(public result: any) { super('rolled back on purpose'); }
}

type Call = { method: string; text: string };

/** Anything called on it is written down and does nothing. `build...` methods give back an address. */
function aRecorder(into: Call[], kind: string, answers: Record<string, unknown> = {}): any {
  return new Proxy({}, {
    get: (_t, name: string) => {
      if (name === 'then') return undefined;
      if (name in answers) return answers[name];
      if (name.startsWith('build')) return (...a: unknown[]) => `https://example.test/${name}/${a.map(String).join('/')}`;
      return (...args: unknown[]) => {
        into.push({ method: `${kind}.${name}`, text: JSON.stringify(args) });
        return Promise.resolve({ sent: true, ok: true });
      };
    },
  });
}

/** The migrations since the live main line, in the order they run. */
function theNewMigrations(): string[] {
  const dir = path.join(__dirname, '..', 'prisma', 'migrations');
  return fs.readdirSync(dir)
    .filter((n) => /^\d{14}_/.test(n) && n > LATEST_LIVE_MIGRATION)
    .sort();
}

/** Only the statements that change rows: UPDATE, INSERT and DELETE. ALTER and CREATE are not run. */
export function theDataChangeOf(sql: string): string[] {
  const noComments = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  return noComments
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => /^(UPDATE|INSERT|DELETE)\b/i.test(s));
}

interface Seeded { id: string; label: string; participantIds: string[]; emails: string[]; checkInIds: string[] }

async function seed(tx: any) {
  const grouped = await tx.user.groupBy({ by: ['organizationId'], where: { isActive: true, deletedAt: null }, _count: { _all: true }, having: { organizationId: { _count: { gte: 3 } } } });
  if (!grouped.length) throw new Error('The local test database has no organisation with three active people to seed from.');
  const organizationId = grouped[0].organizationId as string;
  const people = await tx.user.findMany({ where: { organizationId, isActive: true, deletedAt: null }, take: 3, orderBy: { createdAt: 'asc' } });
  // Phones that exist only inside this transaction, so the phone paths are really exercised.
  for (let i = 0; i < people.length; i++) {
    await tx.user.update({ where: { id: people[i].id }, data: { phoneNumber: `+2349990000${i}${Date.now() % 100000}` } });
  }
  const lead = people[0];
  const now = Date.now();
  const ago = (days: number) => new Date(now - days * DAY);
  const ahead = (days: number) => new Date(now + days * DAY);

  async function ground(key: string, o: { status: GroundStatus; createdDaysAgo: number; timelineDays: number; cadence?: Cadence }): Promise<Seeded> {
    const label = `${MARK} ${key}`;
    const g = await tx.ground.create({
      data: {
        organizationId, initiatorId: lead.id, scenario: GroundScenario.NEW_HIRE, moment: GroundMoment.STARTING, label,
        timelineDays: o.timelineDays, status: o.status, cadence: o.cadence ?? Cadence.FORTNIGHTLY, createdAt: ago(o.createdDaysAgo),
      },
    });
    const participantIds: string[] = [];
    const emails: string[] = [];
    for (let i = 0; i < people.length; i++) {
      const p = await tx.groundParticipant.create({
        data: { groundId: g.id, email: people[i].email, userId: people[i].id, partyType: i === 0 ? PartyType.INITIATOR : PartyType.PARTICIPANT, invitedAt: ago(o.createdDaysAgo), notifiedAt: ago(o.createdDaysAgo) },
      });
      participantIds.push(p.id);
      emails.push(people[i].email);
    }
    return { id: g.id, label, participantIds, emails, checkInIds: [] };
  }
  async function session(s: Seeded, n: number, o: { status: CheckInStatus; availableFrom?: Date | null; completedAt?: Date | null; createdAt?: Date; stamped?: Date | null }) {
    for (const participantId of s.participantIds) {
      const made = await tx.checkIn.create({
        data: {
          groundId: s.id, participantId, sessionNumber: n, status: o.status, availableFrom: o.availableFrom ?? null,
          completedAt: o.completedAt ?? null, createdAt: o.createdAt ?? new Date(),
          sessionReadyNotifiedAt: o.stamped ?? null, openedAnnouncedAt: o.stamped ?? null,
        },
      });
      s.checkInIds.push(made.id);
    }
    if (o.status === CheckInStatus.COMPLETED) {
      // The live main line wrote these when the round closed; without them the report backstop would
      // think the round had never been recorded, which no real finished round looks like.
      await tx.roundCompletion.create({ data: { groundId: s.id, sessionNumber: n, participantCount: s.participantIds.length, completedAt: o.completedAt ?? new Date() } });
      await tx.reportRound.create({ data: { groundId: s.id, sessionNumber: n, sharedPicture: 'The picture at the end of the round.', agreements: [], divergences: [], centralQuestion: 'What now?', takenAt: o.completedAt ?? new Date() } });
    }
  }

  // A. Mid-schedule. Session 1 is done; session 2 opens in four days. Nobody is late.
  const A = await ground('A mid-schedule', { status: GroundStatus.ACTIVE, createdDaysAgo: 40, timelineDays: 180 });
  await session(A, 1, { status: CheckInStatus.COMPLETED, completedAt: ago(10), createdAt: ago(40), stamped: ago(40) });
  await session(A, 2, { status: CheckInStatus.NOT_STARTED, availableFrom: ahead(4), createdAt: ago(10) });

  // B. Session 2 opened two days ago, and the email and the opening notice for it went then.
  const B = await ground('B open and answered by nobody', { status: GroundStatus.ACTIVE, createdDaysAgo: 30, timelineDays: 180 });
  await session(B, 1, { status: CheckInStatus.COMPLETED, completedAt: ago(16), createdAt: ago(30), stamped: ago(30) });
  await session(B, 2, { status: CheckInStatus.NOT_STARTED, availableFrom: ago(2), createdAt: ago(2), stamped: ago(2) });

  // C. Late by a day, and the lead was reminded yesterday.
  const C = await ground('C a day late', { status: GroundStatus.ACTIVE, createdDaysAgo: 45, timelineDays: 180 });
  await session(C, 1, { status: CheckInStatus.COMPLETED, completedAt: ago(30), createdAt: ago(45), stamped: ago(45) });
  await session(C, 2, { status: CheckInStatus.NOT_STARTED, availableFrom: ago(15), createdAt: ago(15), stamped: ago(15) });
  await tx.groundParticipant.updateMany({ where: { groundId: C.id }, data: { lastNudgedAt: ago(1) } });
  await tx.checkIn.updateMany({ where: { groundId: C.id, sessionNumber: 2 }, data: { leadToldAt: ago(1) } });

  // D. Its last week begins four days from now, before release it was already inside it.
  const D = await ground('D inside its last week', { status: GroundStatus.ACTIVE, createdDaysAgo: 85, timelineDays: 90 });
  await session(D, 1, { status: CheckInStatus.COMPLETED, completedAt: ago(70), createdAt: ago(85), stamped: ago(85) });
  await session(D, 2, { status: CheckInStatus.NOT_STARTED, availableFrom: ahead(2), createdAt: ago(5) });

  // E. Past the time it was given, and still open. The live main line would stall it at 03:00.
  const E = await ground('E past its end and open', { status: GroundStatus.ACTIVE, createdDaysAgo: 100, timelineDays: 90 });
  await session(E, 1, { status: CheckInStatus.COMPLETED, completedAt: ago(60), createdAt: ago(100), stamped: ago(100) });
  await session(E, 2, { status: CheckInStatus.NOT_STARTED, availableFrom: ahead(1), createdAt: ago(10) });

  // F. Already stalled by the live main line (status only; the three new columns are empty).
  //    Session 2 came due after it stalled, so nobody was ever told it was open. Its report was shared.
  const F = await ground('F stalled by the live main line', { status: GroundStatus.STALLED, createdDaysAgo: 120, timelineDays: 90 });
  await session(F, 1, { status: CheckInStatus.COMPLETED, completedAt: ago(100), createdAt: ago(120), stamped: ago(120) });
  await session(F, 2, { status: CheckInStatus.NOT_STARTED, availableFrom: ago(20), createdAt: new Date() });
  await tx.report.create({
    data: {
      groundId: F.id, sharedPicture: 'A picture the lead shared.', agreements: [], divergences: [], centralQuestion: 'What now?',
      releasedAt: ago(95), builtFromAnswers: 3,
    },
  });

  return { A, B, C, D, E, F, organizationId };
}

/** Every column of the seeded rows. Anything that moved is a difference. */
async function snapshot(tx: any, ids: string[]) {
  const grounds = await tx.ground.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
  const participants = await tx.groundParticipant.findMany({ where: { groundId: { in: ids } }, orderBy: [{ groundId: 'asc' }, { id: 'asc' }] });
  const checkIns = await tx.checkIn.findMany({ where: { groundId: { in: ids } }, orderBy: [{ groundId: 'asc' }, { participantId: 'asc' }, { sessionNumber: 'asc' }] });
  return JSON.parse(JSON.stringify({ grounds, participants, checkIns }));
}

function thatMoved(before: any, after: any): string[] {
  const out: string[] = [];
  for (const table of ['grounds', 'participants', 'checkIns'] as const) {
    const a = new Map<string, any>(before[table].map((r: any) => [r.id, r]));
    const b = new Map<string, any>(after[table].map((r: any) => [r.id, r]));
    for (const [id, row] of a) {
      const next = b.get(id);
      if (!next) { out.push(`${table} ${id} is gone`); continue; }
      for (const k of Object.keys(row)) {
        if (JSON.stringify(row[k]) !== JSON.stringify(next[k])) out.push(`${table} ${id}: ${k} went from ${JSON.stringify(row[k])} to ${JSON.stringify(next[k])}`);
      }
    }
    for (const id of b.keys()) if (!a.has(id)) out.push(`${table} ${id} is new`);
  }
  return out;
}

interface Outcome {
  seeded: Record<string, Seeded>;
  before: any;
  after: any;
  calls: Call[];
  errors: string[];
  dataChangesRun: number;
}

let outcome: Outcome | null = null;
let whyNot = '';

async function releaseNight(): Promise<Outcome> {
  const prisma = new PrismaClient({ datasources: { db: { url: THE_LOCAL_TEST_DATABASE } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$transaction(async (tx: any) => {
      // A database that has never run this version: no release moment, no job has claimed a time.
      await tx.platformSetting.deleteMany({ where: { OR: [{ key: RELEASE_MOMENT_KEY }, { key: { startsWith: 'job.' } }] } });

      const s = await seed(tx);
      const { organizationId, ...seeded } = s as any;
      const ids = Object.values(seeded).map((x: any) => x.id) as string[];
      const before = await snapshot(tx, ids);

      // 2. Every migration's data change.
      let dataChangesRun = 0;
      for (const name of theNewMigrations()) {
        const sql = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', name, 'migration.sql'), 'utf8');
        for (const stmt of theDataChangeOf(sql)) {
          await tx.$executeRawUnsafe(stmt);
          dataChangesRun += 1;
        }
      }
      const afterMigrations = await snapshot(tx, ids);

      // 3. Release night.
      const withLock = new Proxy(tx, {
        get: (t, p: string) => (p === 'withAdvisoryLock' ? async (_key: number, fn: () => Promise<void>) => { await fn(); return true; } : typeof t[p] === 'function' ? t[p].bind(t) : t[p]),
      });
      const calls: Call[] = [];
      const errors: string[] = [];
      const email = aRecorder(calls, 'email');
      const whatsapp = aRecorder(calls, 'whatsapp', { isEnabled: async () => true });
      const events = aRecorder(calls, 'event', {});
      const config = { get: () => '' } as any;
      const patterns = aRecorder(calls, 'patterns');
      const conversation = aRecorder(calls, 'conversation');
      const workspace = aRecorder(calls, 'workspace');
      const cron: any = new GroundsCron(withLock as any, email, config, { emit: (...a: unknown[]) => { calls.push({ method: 'event.emit', text: JSON.stringify(a) }); return true; } } as any, patterns, whatsapp, conversation);
      const remind: any = new RemindService(withLock as any, email, workspace);
      void events;

      await cron.onApplicationBootstrap();
      const jobs: [string, () => Promise<unknown>][] = [
        ['06:00 the deferred invites', () => cron.inviteJoinersWhoStartToday()],
        ['02:00 the warning before time runs out', () => cron.warnBeforeTimeRunsOut()],
        ['03:00 the stall sweep', () => cron.stallOverdueGrounds()],
        ['04:00 the report backstop', () => cron.synthesisBackstop()],
        ['07:00 invites about to lapse', () => cron.tellThemBeforeAnInviteLapses()],
        ['08:00 the scheduled nudges', () => remind.sendScheduledNudges()],
        ['08:30 the WhatsApp reminders', () => cron.sendWhatsAppReminders()],
        ['07:00 Lagos the lead summaries', () => cron.sendTheLeadsDailySummaries()],
        ['09:00 the reminders', () => cron.sendReminders()],
        ['10:00 the feedback requests', () => cron.sendFeedbackRequests()],
        ['every 15 minutes: session ready', () => cron.sendSessionReadyNotifications()],
        ['every 15 minutes: opens soon on WhatsApp', () => cron.sendWhatsAppOpensSoon()],
        ['every 15 minutes: closing warnings', () => cron.fireSessionClosingWarnings()],
        ['every 30 minutes: stale check-ins', () => cron.autoCloseStaleCheckIns()],
        ['every night again, to see a second night changes nothing: the warning', () => cron.warnBeforeTimeRunsOut()],
      ];
      for (const [name, run] of jobs) {
        try { await run(); } catch (e: any) { errors.push(`${name}: ${e?.message ?? e}`); }
      }
      const after = await snapshot(tx, ids);
      throw new RolledBack({ seeded, before, afterMigrations, after, calls, errors, dataChangesRun });
    }, { timeout: 540_000, maxWait: 30_000 });
    throw new Error('The transaction was not rolled back.');
  } catch (e: any) {
    if (e instanceof RolledBack) return e.result as Outcome;
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

/** What a recorder was asked about one seeded check-in, by its label or any of its people's addresses. */
const aboutIt = (o: Outcome, s: Seeded) => o.calls.filter((c) => [s.id, s.label, ...s.participantIds, ...s.checkInIds].some((x) => c.text.includes(x)));

beforeAll(async () => {
  try {
    outcome = await releaseNight();
  } catch (e: any) {
    whyNot = `The local test database could not be used (${e?.message ?? e}).`;
    // eslint-disable-next-line no-console
    console.warn(`existing-clients-carry-on: ${whyNot} Nothing was checked.`);
  }
});

/** A finding with no database to show it passes as a failure: there is nothing to turn into a plain test. */
const aFindingNeedsTheDatabase = (fn: (o: Outcome) => void) => () => {
  if (!outcome) throw new Error(whyNot);
  fn(outcome);
};

const needsTheDatabase = (fn: (o: Outcome) => void) => () => {
  if (!outcome) { expect(whyNot).not.toBe(''); return; }
  fn(outcome);
};

describe('release night, for a check-in that already exists', () => {
  it('runs every migration since the live main line, and the data changes are the ones in docs/deploy.md', needsTheDatabase((o) => {
    const names = theNewMigrations();
    /* 82 since 4 October: the anchor scenario's empty started_from column (docs/deploy.md row 82).
       83 since 5 October: every free run is one month, a column default only (docs/deploy.md row 83). */
    expect(names).toHaveLength(83);
    // The six statements deploy.md lists, plus the WhatsApp prices (five updates and one insert).
    expect(o.dataChangesRun).toBeGreaterThanOrEqual(8);
  }));

  it('moves no date, person, status or stamp of a check-in that is open, late, near its end or past its end (A to E)', needsTheDatabase((o) => {
    const ids = ['A', 'B', 'C', 'D', 'E'].map((k) => o.seeded[k].id);
    const pick = (snap: any) => ({
      grounds: snap.grounds.filter((r: any) => ids.includes(r.id)),
      participants: snap.participants.filter((r: any) => ids.includes(r.groundId)),
      checkIns: snap.checkIns.filter((r: any) => ids.includes(r.groundId)),
    });
    expect(thatMoved(pick(o.before), pick(o.after))).toEqual([]);
  }));

  it('does not reopen, restart or stall any of them: the same statuses, no stall dates, no warning stamp (A to E)', needsTheDatabase((o) => {
    for (const k of ['A', 'B', 'C', 'D', 'E']) {
      const g = o.after.grounds.find((r: any) => r.id === o.seeded[k].id);
      expect(g.status).toBe('ACTIVE');
      expect(g.stalledAt).toBeNull();
      expect(g.stalledFromStatus).toBeNull();
      expect(g.stallWarningSentAt).toBeNull();
    }
  }));

  it('keeps every next session on the date it already had, and makes no new session (A to E)', needsTheDatabase((o) => {
    for (const k of ['A', 'B', 'C', 'D', 'E']) {
      const mine = (snap: any) => snap.checkIns.filter((r: any) => r.groundId === o.seeded[k].id).map((r: any) => `${r.participantId}|${r.sessionNumber}|${r.status}|${r.availableFrom}`).sort();
      expect(mine(o.after)).toEqual(mine(o.before));
    }
  }));

  it('emails nobody, messages nobody and announces nothing for a check-in that is open, late, near its end or past its end (A to E)', needsTheDatabase((o) => {
    const said = ['A', 'B', 'C', 'D', 'E'].flatMap((k) => aboutIt(o, o.seeded[k]).map((c) => `${k}: ${c.method}`));
    // Phones: see the finding about WhatsApp. Everything else must be silent.
    expect(said.filter((s) => !s.includes('whatsapp.'))).toEqual([]);
  }));

  it('does not email the lead that time is running out, for a check-in already in its last week or past its end (D and E)', needsTheDatabase((o) => {
    const warned = o.calls.filter((c) => c.method === 'email.sendTimeRunningOut');
    expect(warned.filter((c) => c.text.includes(o.seeded.D.label) || c.text.includes(o.seeded.E.label))).toEqual([]);
  }));

  it('leaves a check-in the live main line already stalled stalled, with its dates (F)', needsTheDatabase((o) => {
    const g = o.after.grounds.find((r: any) => r.id === o.seeded.F.id);
    expect(g.status).toBe('STALLED');
    expect(g.stalledAt).toBeNull();
    expect(g.stalledFromStatus).toBeNull();
  }));

  it('runs no job that throws', needsTheDatabase((o) => {
    expect(o.errors).toEqual([]);
  }));

  /*
   * FINDING 1. A check-in the live main line already stalled is treated as a live one by the new
   * sweeps in grounds.cron.ts, because STALLED was taken out of A_GROUND_IS_OVER (the list the
   * sweeps skip) and put into its own list that only the stall and warning sweeps read. So on
   * release night a stalled check-in's people are emailed that session 2 is open, told by an
   * "opened" event, sent a reminder that their shared report is waiting, and its round is sent to
   * be written again. Decision 88 says nothing is emailed by surprise.
   */
  it('FINDING 1: sends nothing, and announces nothing, about a check-in the live main line already stalled (F)', aFindingNeedsTheDatabase((o) => {
    const said = aboutIt(o, o.seeded.F).filter((c) => !c.method.startsWith('whatsapp.'));
    expect(said.map((c) => c.method)).toEqual([]);
  }));

  /*
   * FINDING 2. Two WhatsApp jobs are new in this version and need no opt-in: a morning reminder at
   * 08:30 UTC and the lead's daily summary at 07:00 in Lagos. On release morning every existing
   * client whose platform has WhatsApp on, and whose people have a phone number, is tried. (The
   * sender then holds a message that is outside the 24-hour window until Meta approves the
   * templates, so most are recorded as not sent. Anything inside the window goes.)
   */
  it('FINDING 2: tries no WhatsApp message about a check-in that exists, on the first morning (A to E)', aFindingNeedsTheDatabase((o) => {
    const said = ['A', 'B', 'C', 'D', 'E'].flatMap((k) => aboutIt(o, o.seeded[k]).filter((c) => c.method.startsWith('whatsapp.')).map((c) => `${k}: ${c.method}`));
    expect(said).toEqual([]);
  }));
});
