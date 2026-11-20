/**
 * THE TWO STANDING JOBS EVERY SENIOR PERSON HAS (spec 30.4 and 31).
 *
 *   "<year> annual report and presentation"
 *   "<year> outstanding matters and <next year> carry-forward register"
 *
 * One small generic row, `persistent_jobs`: its state, its next action, who may act on it, its deadline,
 * the last time something meaningful arrived, and what the record covers by month, workstream and person.
 * It is the assignment that is tracked, not a message.
 *
 * NOTHING IS REMEMBERED IN THE PROCESS. Every night the job is recomputed from the record, so a restart
 * between two nights loses nothing, running it twice in a night changes nothing, and two copies of the API
 * cannot disagree (the cron runs once across copies). Creating the jobs is idempotent, on a unique key.
 *
 * "Meaningful contact" moves only when a source newer than the last one arrives. Silence moves nothing,
 * and no job is ever finished or closed by time passing.
 *
 * This file writes the job's own row and sends nothing. Telling the principal that coverage grew or a draft
 * is ready is year-end/the-year-end-owner.ts, on the existing channels, with its own rule about when it is
 * worth a message.
 */
import { buildTheRegister } from './the-outstanding-register';
import { theFilesSheKept, whatHerMaterialCovers } from '../executive-onboarding/the-months-a-document-covers';

export const THE_TWO_JOBS = (year: number): { kind: 'annual_report' | 'outstanding_register'; title: string }[] => [
  { kind: 'annual_report', title: `${year} annual report and presentation` },
  { kind: 'outstanding_register', title: `${year} outstanding matters and ${year + 1} carry-forward register` },
];

/** The two jobs whose state is recomputed from the record every night. A standing instruction (kind `standing:<id>`) is a job too, but only the person's own words change it. */
export const THE_TWO_KINDS = ['annual_report', 'outstanding_register'];

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** Makes both jobs for a principal if they are not there. Safe to call every time. */
export async function ensureThePrincipalsJobs(prisma: any, a: { organizationId: string; principalUserId: string; now: Date }): Promise<void> {
  const year = a.now.getUTCFullYear();
  for (const job of THE_TWO_JOBS(year)) {
    const there = await prisma.persistentJob.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: job.kind } });
    if (there) continue;
    await prisma.persistentJob
      .create({
        data: {
          organizationId: a.organizationId, principalUserId: a.principalUserId, kind: job.kind, title: job.title, state: 'collecting',
          nextAction: 'Gather what the team has said and shown so far.',
          authorisedActorUserId: a.principalUserId,
          /* A default of the end of the year the job is for. The principal can move it by saying so. */
          deadline: new Date(Date.UTC(year, 11, 31)),
          coverage: {},
        },
      })
      /* Two copies starting at once: the unique key refuses the second, which is the answer wanted. */
      .catch(() => null);
  }
}

export interface TheCoverage {
  months: Record<string, number>;
  workstreams: Record<string, number>;
  people: Record<string, number>;
  evidence: Record<string, number>;
  gaps: string[];
}

/** What the record covers, by month, workstream, person and kind of evidence, and which months have nothing. */
export function coverageOf(sources: { at: Date; kind: string; workstream: string | null; owner: string }[], now: Date): TheCoverage {
  const c: TheCoverage = { months: {}, workstreams: {}, people: {}, evidence: {}, gaps: [] };
  for (const s of sources) {
    const m = monthKey(s.at);
    c.months[m] = (c.months[m] ?? 0) + 1;
    if (s.workstream) c.workstreams[s.workstream] = (c.workstreams[s.workstream] ?? 0) + 1;
    if (s.owner && s.owner !== 'unconfirmed') c.people[s.owner] = (c.people[s.owner] ?? 0) + 1;
    c.evidence[s.kind] = (c.evidence[s.kind] ?? 0) + 1;
  }
  const year = now.getUTCFullYear();
  for (let m = 0; m <= now.getUTCMonth(); m += 1) {
    const k = `${year}-${String(m + 1).padStart(2, '0')}`;
    if (!c.months[k]) c.gaps.push(k);
  }
  return c;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthWords = (keys: string[]) => {
  const names = keys.map((k) => MONTHS[Number(k.slice(5)) - 1]);
  return names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/** One job, recomputed from the record. Returns what was written, for the tests and the logs. */
/**
 * WHAT THE RECORD COVERS, FROM ONE PLACE (Fatima round 3). The two jobs, the first picture and the draft all read it here: the register's sources and what she
 * forwarded, each month read from what the document says it is about (the-months-a-document-covers.ts). The first picture used to read the register alone and told
 * her the record did not cover months whose notes she had just forwarded.
 */
export async function whatTheRecordCoversNow(prisma: any, a: { organizationId: string; principalUserId: string; now: Date; register?: Awaited<ReturnType<typeof buildTheRegister>> }) {
  const register = a.register ?? await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: true });
  const forwarded = await whatHerMaterialCovers(prisma, { principalUserId: a.principalUserId, year: a.now.getUTCFullYear() });
  const sources = [
    ...register.rows.flatMap((r) => r.sources.map((s) => ({ at: s.at, kind: s.kind, workstream: r.workstream, owner: r.owner }))),
    ...forwarded.map((f) => ({ at: f.at, kind: f.kind, workstream: f.workstream, owner: f.owner })),
  ];
  return { register, sources, coverage: coverageOf(sources, a.now) };
}

export async function advanceOneJob(prisma: any, job: any, now: Date): Promise<{ state: string; nextAction: string }> {
  const { register, sources, coverage } = await whatTheRecordCoversNow(prisma, { organizationId: job.organizationId, principalUserId: job.principalUserId, now });
  const kept = await theFilesSheKept(prisma, { principalUserId: job.principalUserId });
  const newest = sources.length ? new Date(Math.max(...sources.map((s) => s.at.getTime()))) : null;
  const unproven = register.rows.find((r) => r.questionForTheOwner);
  const unowned = register.rows.find((r) => r.owner === 'unconfirmed' && r.status !== 'completed' && r.status !== 'cancelled');
  const match = register.toAsk[0];

  /*
   * DRAFT READINESS FOLLOWS THE PLAN (30.4): source coverage, contradictions and missing periods named, uncertainty labelled, owners reviewed; impossible
   * completeness is not required. So a draft can go as soon as there is something on the record. A claim nobody has shown, two lines that may be one, a
   * line without an owner and a month with nothing do not hold it back: the draft says each of them plainly, as unverified or as a gap, and they are
   * asked for meanwhile (year-end/the-year-end-owner.ts).
   */
  const ready = sources.length > 0 || kept.length > 0;
  const stillOpen: string[] = [];
  if (match) stillOpen.push(`ask which of two lines is meant (${match.question})`);
  if (unproven) stillOpen.push(`ask ${unproven.owner} (${unproven.questionForTheOwner})`);
  if (unowned) stillOpen.push(`find out who owns "${unowned.item}"`);
  if (job.kind === 'annual_report' && coverage.gaps.length) stillOpen.push(`ask the team for anything from ${monthWords(coverage.gaps)}, which the record does not cover yet`);
  let nextAction = !ready ? 'Wait for the first check-in or document, and ask nobody until then.'
    : `The draft can be sent, with what is verified and what is still unconfirmed said plainly.${stillOpen.length ? ` Still to do: ${stillOpen.join('; ')}.` : ''}`;
  /* Once a draft exists, the job is waiting on her, not on the record. The draft row is the one owner of that fact. */
  const draft = ready ? await prisma.yearEndDraft?.findFirst?.({ where: { organizationId: job.organizationId, principalUserId: job.principalUserId, year: now.getUTCFullYear() }, orderBy: { version: 'desc' } }).catch(() => null) : null;
  if (draft) nextAction = draft.status === 'approved' || draft.status === 'final' ? `Version ${draft.version} is approved. Newer records go only into a new version that is approved.` : `Wait for changes to version ${draft.version}, or its approval.`;
  const state = ready ? 'draft_ready' : 'collecting';
  const lastContact = newest && (!job.lastMeaningfulContactAt || newest.getTime() > new Date(job.lastMeaningfulContactAt).getTime()) ? newest : job.lastMeaningfulContactAt ?? null;
  await prisma.persistentJob.update({ where: { id: job.id }, data: { state, nextAction, coverage: coverage as any, lastMeaningfulContactAt: lastContact, lastCheckedAt: now } });
  return { state, nextAction };
}

/** The nightly pass. One job failing never stops the others. */
export async function advanceThePersistentJobs(prisma: any, now: Date = new Date()): Promise<number> {
  const jobs: any[] = (await prisma.persistentJob.findMany({ where: { kind: { in: THE_TWO_KINDS } } })) ?? [];
  let done = 0;
  for (const job of jobs) {
    try {
      await advanceOneJob(prisma, job, now);
      done += 1;
    } catch {
      /* The next night reads the same record and tries again. */
    }
  }
  return done;
}
