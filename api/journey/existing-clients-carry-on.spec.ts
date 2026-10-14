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
        ['09:00 the reminders', () => cron.sendReminders()],
        ['10:00 the feedback requests', () => cron.sendFeedbackRequests()],
        ['every 15 minutes: session ready', () => cron.sendSessionReadyNotifications()],
        ['every 15 minutes: opens soon on WhatsApp', () => cron.sendWhatsAppOpensSoon()],
        ['every 15 minutes: closing warnings', () => cron.fireSessionClosingWarnings()],
        ['every 30 minutes: stale check-ins', () => cron.autoCloseStaleCheckIns()],
        ['every night again, to see a second night changes nothing: the warning', () => cron.warnBeforeTimeRunsOut()],
        /* The engagement messages (decision 109), each as its own job runs. Existing check-ins may be told one thing, once ("here is what is new"); everything else
           is gated by the release moment, by the check-in's state or by something having happened this week, and says nothing about check-ins like A to F. */
        ['06:30 Lagos "here is what is new"', () => cron.sendHeresWhatIsNewInner()],
        ['10:30 Lagos invited and nobody started', () => cron.sendWhatGroundworkIsDoingInner()],
        ['Tuesday: a test check-in moves on', () => cron.sendTheTestCheckInMessagesInner()],
        ['11:00 Lagos the follow-up after a report', () => cron.sendTheReportFollowUpsInner()],
        ['Wednesday: who has gone quiet', () => cron.sendWhoHasGoneQuietInner()],
        ['Friday: the lead\'s weekly letter', () => cron.sendTheLeadsWeeklyLettersInner()],
        /* The lead's daily nudge (decision 120), at nine in Lagos, after the insights above and before the reminders; it replaced the WhatsApp daily summary at seven. */
        ['09:00 Lagos the lead\'s daily nudge', () => cron.sendTheLeadsDailyNudgesInner()],
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
       83 since 5 October: every free run is one month, a column default only (docs/deploy.md row 83).
       84 since 6 October: a WhatsApp send keeps the id Meta gave it, a nullable column and its index (docs/deploy.md row 84).
       85 since 6 October: the anchor's situation is an allowed value, so the check-in keeps it (docs/deploy.md row 85).
       86: "Use simpler words" adds one column, grounds.simpler_words, false for every check-in (row 86).
       87 since 6 October: the strategy keeps its versions, one new empty table, strategy_versions (row 87).
       88 since 6 October: an address can always stop the mail, one new empty table, email_address_preferences (row 88).
       89 since 7 October: Hafsah's address stays a platform admin, one flag set true on one row, never off (row 89).
       90 since 8 October: a decided review can be appealed, nine empty columns on performance_reviews and nothing else (docs/deploy.md row 90).
       91 since 9 October: an organisation can have its own time zone, one empty column, organizations.time_zone (docs/deploy.md row 91).
       92 since 10 October: a pattern records which version of the detector's prompt read it (decision 128), one empty column, pattern_detections.prompt_version_id (docs/deploy.md row 92).
       93 since 10 October: the role learned in a first check-in (decision 129), six empty columns on role_interview_answers and one index, no data change (docs/deploy.md row 93).
       94 since 11 October: the lead checks in when they choose (decision 133), check_ins.optional set true on every lead's check-in, and one new empty table, report_reads.
       95 since 11 October: why they missed their check-ins (decision 136), two empty columns on check_ins, no data change.
       96 since 13 October: when somebody accepted their invitation (Hafsah, 13 October), one column on ground_participants,
          filled for the people already on a check-in who came in, so everybody who has joined stays counted. */
    /* 97 since 14 October: WhatsApp's free month (Hafsah's decision D1, 13 October, evening), one column on organizations,
       filled with a month from today for every organisation already here.
       98 since 14 October: a free month for every organisation already here (Hafsah, 14 October), one marker column on
       organizations, and for every one that does not pay and has no free run going, one month on the plan that holds it. */
    /* 99 since 15 October: extra seats and WhatsApp per person (fix list item 6), four columns on pricing_plans with the $5 and
       $4 prices on the five plans, three on organizations, and the flat WhatsApp line marked as kept where one is paid now. */
    expect(names).toHaveLength(99);
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
    /* CHANGED 11 OCTOBER: 20261011100000_the_lead_checks_in_when_they_choose marks every lead's
       check-in optional (decision 133). That, on a lead's row, is the one change allowed; nothing else moves. */
    const after = pick(o.after);
    const theLeads = new Set(after.participants.filter((p: any) => p.partyType === 'INITIATOR').map((p: any) => p.id));
    const leadRows = new Set(after.checkIns.filter((c: any) => theLeads.has(c.participantId)).map((c: any) => c.id));
    const moved = thatMoved(pick(o.before), after);
    /* CHANGED 13 OCTOBER: 20261013090000_accepted_the_invitation records that the people already on a check-in who came
       in accepted their invitation, so they stay in every count (joined now means accepted). A participant's acceptedAt
       going from null to a date, on a row that has a sign-in, is allowed; no date, status or stamp of a check-in moves. */
    const signedIn = new Set(after.participants.filter((p: any) => p.partyType !== 'INITIATOR' && !!p.userId).map((p: any) => p.id));
    const allowed = moved.filter((m) => (/^checkIns (\S+): optional went from false to true$/.test(m) && leadRows.has(m.split(' ')[1].replace(/:$/, '')))
      || (/^participants (\S+): acceptedAt went from null to "/.test(m) && signedIn.has(m.split(' ')[1].replace(/:$/, ''))));
    expect(allowed.length).toBeGreaterThan(0);
    expect(moved.filter((m) => !allowed.includes(m))).toEqual([]);
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

  it('emails nobody, messages nobody and announces nothing for a check-in that is open, late, near its end or past its end (A to E), except the one "here is what is new" (decision 109 item 2)', needsTheDatabase((o) => {
    const said = ['A', 'B', 'C', 'D', 'E'].flatMap((k) => aboutIt(o, o.seeded[k]).map((c) => `${k}: ${c.method}`));
    // Phones: see the finding about WhatsApp. Everything else must be silent, but for the one email decision 109 gives an existing client's lead.
    expect(said.filter((s) => !s.includes('whatsapp.') && !s.endsWith('email.sendHeresWhatIsNew'))).toEqual([]);
  }));

  it('sends no engagement message about a check-in made before the release, beyond that one "what is new" email, and never about the stalled one (A to F)', needsTheDatabase((o) => {
    const engagement = ['sendTheLeadsDailyNudge', 'sendTheLeadsWeeklyLetter', 'sendWhoHasGoneQuiet', 'sendTheReportFollowUp', 'sendTestCheckInMovesOn', 'sendWaitingOnThePeople', 'sendLeadFirstCheckIn', 'sendYourWeek'];
    const said = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((k) => aboutIt(o, o.seeded[k]).filter((c) => engagement.some((m) => c.method === `email.${m}`)).map((c) => `${k}: ${c.method}`));
    expect(said).toEqual([]);
    /* And the one "what is new" does not mention the stalled check-in (F). It was sent, so the engagement jobs did run: this is not a silence from jobs that never started. */
    const news = o.calls.filter((c) => c.method === 'email.sendHeresWhatIsNew');
    expect(news.length).toBeGreaterThan(0);
    expect(news.filter((c) => c.text.includes(o.seeded.F.label))).toEqual([]);
  }));

  it('the lead\'s daily nudge (decision 120): each lead is told once, on one channel, in whole sentences, and never about the stalled check-in or by an address', needsTheDatabase((o) => {
    const byEmail = o.calls.filter((c) => c.method === 'email.sendTheLeadsDailyNudge').map((c) => JSON.parse(c.text) as [string, string, { needsYou: string[]; overdueOnYourTeam: string[]; risks: string[] }, string | null, string, string]);
    const onPhone = o.calls.filter((c) => c.method === 'whatsapp.sendFor').map((c) => JSON.parse(c.text) as [string, string, string, { kind: string; params: string[] }]).filter((a) => a[3]?.kind === 'lead-summary');
    /* It ran on release morning, so this is not a silence from a job that never started. */
    expect(byEmail.length + onPhone.length).toBeGreaterThan(0);
    expect(new Set(byEmail.map((a) => a[0].toLowerCase())).size).toBe(byEmail.length);
    expect(new Set(onPhone.map((a) => a[1])).size).toBe(onPhone.length);
    for (const [, subject, parts] of byEmail) {
      const all = [subject, ...parts.needsYou, ...parts.overdueOnYourTeam, ...parts.risks];
      expect(all.join(' ')).not.toMatch(/@\w|undefined|null|\[object|NaN/);
      expect(all.join(' ')).not.toContain(o.seeded.F.label);
      for (const line of [...parts.needsYou, ...parts.overdueOnYourTeam, ...parts.risks]) expect(line).toMatch(/[.]$/);
      for (const part of [parts.needsYou, parts.overdueOnYourTeam, parts.risks]) expect(part.length).toBeLessThanOrEqual(3);
    }
    for (const [, , , ctx] of onPhone) {
      expect(ctx.params[1]).not.toMatch(/[\r\n\t]|undefined|null|\[object|NaN/);
      expect(ctx.params[1]).not.toContain(o.seeded.F.label);
    }
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
  /*
   * CHANGED 14 OCTOBER, BY HAFSAH'S DECISION D1 (13 October, evening): "This is turned on automatically ... Existing
   * organisations: they get the trial too." WhatsApp is now on for every existing organisation for a free month, so on the
   * first morning the one check-in that is overdue (C) is reminded on WhatsApp, once per person, under the sender's own
   * rules; nothing goes about the check-ins that are on time, not open yet or past their end (A, B, D, E). Recorded for
   * Hafsah in the morning report, because it is the first WhatsApp message these people get.
   */
  it('FINDING 2: on the first morning, WhatsApp goes only about the check-in that is overdue (C), once per person', aFindingNeedsTheDatabase((o) => {
    /* A message is a send; asking whether a number said STOP is not one. */
    const sends = (k: string) => aboutIt(o, o.seeded[k]).filter((c) => /^whatsapp\.send/.test(c.method));
    /* Nothing about the seeded check-ins that are on time, not open yet, past their end or stalled. */
    expect(['A', 'B', 'D', 'E', 'F'].flatMap((k) => sends(k).map((c) => `${k}: ${c.method}`))).toEqual([]);
    const aboutC = sends('C');
    /* Each of C's three people, exactly once. */
    const to = aboutC.map((c) => String(JSON.parse(c.text)[1]));
    expect(to.length).toBe(o.seeded.C.participantIds.length);
    expect(new Set(to).size).toBe(o.seeded.C.participantIds.length);
  }));
});
