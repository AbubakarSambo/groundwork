/**
 * WRITING THE ASSESSMENT, JUST AFTER THE CONVERSATION IS FINISHED (layer 1; the shape and the rules are in the-assessment.ts).
 *
 * Called on every path that ends a conversation: finishTheSession (the person, and the clock), setup's commit (the lead's
 * first check-in), decline, and a session nobody opened, closed as missed (no words, so no model call). Never awaited by the
 * close itself: the session is finished the moment Groundwork says so, and this runs after.
 *
 * One model call fills every part. The completeness check then matches every message the person sent to items; a second
 * call reads only what the first left unmatched, and anything still unmatched is kept whole. Then the assessment is stored,
 * marked ready. ASSESSMENT_READY is emitted by the caller once the readers that read from it have written
 * (theAssessmentIsReady), even when the read failed, so no listener waits for ever.
 *
 * MEASURED. Each assessment logs one line, "assessment-measure", with the model calls it made and the milliseconds from the
 * close to ready, and keeps both on the assessment, so the with-against-without test can read them.
 */
import { theSpeakerLine } from './the-person-speaking';
import { everybodyMayOpen } from './a-private-documents-numbers-stay-with-it';
import { GroundworkEvents, type AssessmentReadyEvent } from '../../common/events';
import {
  ASSESSMENT_PROMPT_KEY, THE_ASSESSMENT_PROMPT, THE_ASSESSMENT_SCHEMA, THE_ASSESSMENT_KIND, THE_ASSESSMENT_VERSION,
  theFilesPromptVersion, theMaterialAsText, theUnmatchedAsText, thePartsFrom, theUnmatched, withTheSecondRead, withWhatIsLeftKeptWhole,
  theItemsToCompareAgainst, thePreviousWithItsCorrections, theAssessmentIn, theColumnWith,
  type AMessage, type HowItEnded, type TheAssessment, type TheMaterial, type TheReadParts,
} from './the-assessment';
import { oneOfEach } from './what-happened-to-what-they-said';
import { theRecordAcrossTime, theLeadsViewOf, type AnAssessmentSeen } from '../patterns/patterns-across-the-assessments';
import { theInterventionsAfter, type AnIntervention } from '../patterns/the-next-step-for-each-pattern';

export interface AssessmentDeps {
  prisma: any;
  anthropic: { extract: <T>(system: string, history: { role: string; content: string }[], tool: any, options?: any) => Promise<T | null> };
  prompts?: { getActive?: (key: string) => Promise<{ id: string; content: string }> } | null;
  events?: { emit: (event: string, payload: unknown) => unknown } | null;
  logger?: { log: (m: string) => void; warn: (m: string) => void };
  /** The CONTEXT_ENABLED flag: off, every document is its uploader's alone (who-can-see-a-document.ts). On unless said. */
  contextEnabled?: boolean;
}

/** What setup gives beside the conversation: the lead's setup messages, and what she typed in the form (her notes on each person, the timing). */
export interface TheSetupGiven {
  words: string[];
  given: string[];
}

export interface HowToAssess {
  howItEnded: HowItEnded;
  /** When the conversation was closed, for the time from close to ready. */
  closedAt: Date;
  setup?: TheSetupGiven | null;
  /** Where the person's turns arrived, when the caller knows it. */
  channel?: TheAssessment['about']['channel'];
}

const isoOf = (d: unknown): string | null => (d ? new Date(d as any).toISOString() : null);
const fullName = (u: any, given?: string | null) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || (given ?? '').trim() || 'This person';

/** The assessment of one check-in, read from its column, or null. */
export async function theAssessmentOf(prisma: any, checkInId: string): Promise<TheAssessment | null> {
  const row = await prisma.checkIn.findUnique({ where: { id: checkInId }, select: { sessionReport: true } }).catch(() => null);
  return theAssessmentIn(row?.sessionReport);
}

/**
 * This person's assessments before this session, oldest first, the missed ones left out (assessment test, 2 November): a session
 * nobody answered holds nothing to compare against, so "last time" is the last conversation they had, and a missed Thursday between
 * two answered Mondays no longer breaks the run that patterns and next steps are counted across.
 */
async function theirEarlierAssessments(prisma: any, participantId: string, beforeSession: number): Promise<AnAssessmentSeen[]> {
  const rows = ((await prisma.checkIn.findMany({
    where: { participantId, sessionNumber: { lt: beforeSession } },
    orderBy: { sessionNumber: 'asc' },
    select: { id: true, sessionNumber: true, completedAt: true, sessionReport: true },
  }).catch(() => [])) ?? []) as any[];
  return rows.map((r) => ({ checkInId: r.id, sessionNumber: r.sessionNumber, on: isoOf(r.completedAt), assessment: theAssessmentIn(r.sessionReport) as TheAssessment }))
    .filter((s) => !!s.assessment && s.assessment.about?.howItEnded !== 'missed');
}

export async function assessTheConversation(deps: AssessmentDeps, checkInId: string, how: HowToAssess): Promise<TheAssessment | null> {
  const log = deps.logger ?? { log: () => undefined, warn: () => undefined };
  let modelCalls = 0;
  let modelFailed = false;
  let row: any = null;
  try {
    row = await deps.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        id: true, groundId: true, participantId: true, sessionNumber: true, startedAt: true, completedAt: true, whatWeHave: true, sessionReport: true,
        turns: { orderBy: { createdAt: 'asc' }, select: { id: true, role: true, content: true, createdAt: true, recordDraft: true } },
        participant: { select: { partyType: true, nameGiven: true, roleAsDescribed: true, user: { select: { firstName: true, lastName: true, jobTitle: true } } } },
        ground: { select: { label: true } },
      },
    });
    if (!row) return null;

    /* The messages, numbered: setup's words first, then each thing the person said in the check-in. */
    const messages: AMessage[] = [];
    const said = new Map<number, string>();
    const setupWords = (how.setup?.words ?? []).map((w) => String(w ?? '').trim()).filter(Boolean);
    const setup = how.setup ? { words: setupWords.map((content, i) => ({ n: i + 1, content })), given: how.setup.given.filter(Boolean) } : null;
    for (const w of setup?.words ?? []) { messages.push({ n: w.n, turnId: null, where: 'setup', at: null }); said.set(w.n, w.content); }
    const turns: TheMaterial['turns'] = [];
    for (const t of (row.turns ?? []) as any[]) {
      const content = String(t.content ?? '').trim();
      if (!content) continue;
      if (t.role === 'PERSON') {
        const n = messages.length + 1;
        messages.push({ n, turnId: t.id, where: 'check-in', at: isoOf(t.createdAt) });
        said.set(n, content);
        turns.push({ role: 'person', content, n });
      } else turns.push({ role: 'groundwork', content });
    }

    const isTheLead = row.participant?.partyType === 'INITIATOR';
    const who = fullName(row.participant?.user, row.participant?.nameGiven);
    /* The role they were given: their own title; the lead's own description of herself. Never the lead's words about somebody else (decision 30). */
    const givenRole = row.participant?.user?.jobTitle ?? (isTheLead ? row.participant?.roleAsDescribed ?? null : null);
    const earlier = await theirEarlierAssessments(deps.prisma, row.participantId, row.sessionNumber);
    const previous = earlier[earlier.length - 1] ?? null;
    const priorities = (((await deps.prisma.groundObjective?.findMany?.({ where: { groundId: row.groundId }, select: { name: true } })?.catch?.(() => [])) ?? []) as any[])
      .map((o) => String(o.name ?? '').trim()).filter(Boolean);
    const closing = ((row.turns ?? []) as any[]).filter((t) => Array.isArray(t.recordDraft)).pop();
    /* Their promises open on the record from before this conversation began: the read says what happened to each, and the settling reads that. */
    const openPromises = (((await deps.prisma.groundCommitment?.findMany?.({
      where: { groundId: row.groundId, participantId: row.participantId, status: 'UNKNOWN', createdAt: { lt: row.startedAt ?? how.closedAt } },
      select: { id: true, text: true, whenSaid: true, createdAt: true }, orderBy: { createdAt: 'asc' }, take: 20,
    })?.catch?.(() => [])) ?? []) as any[]).map((c) => ({ id: String(c.id), text: String(c.text ?? ''), whenSaid: c.whenSaid ?? null, saidOn: isoOf(c.createdAt)?.slice(0, 10) ?? null })).filter((c) => c.text);
    /*
     * WHAT THE LEAD ATTACHED, WHICH EVERYBODY ON THE CHECK-IN MAY OPEN. A lead who puts the team's numbers in a sheet has given
     * them as surely as if she had typed them (Hafsah, 22 September), and what her assessment reads reaches everybody: the team's
     * aims. So her documents everybody may open are read with her words, and one marked "Only you" or "Only the lead" is not
     * (a-private-documents-numbers-stay-with-it.ts). A document she attached in setup is not among setup's words, so this is
     * the only way its numbers reach the aims.
     */
    const documents = isTheLead
      ? ((((await deps.prisma.groundDocument?.findMany?.({
          where: { groundId: row.groundId, participantId: row.participantId },
          orderBy: { createdAt: 'asc' },
          select: { fileName: true, content: true, visibility: true },
        })?.catch?.(() => [])) ?? []) as any[])
          .filter((d) => everybodyMayOpen(d, deps.contextEnabled !== false) && String(d.content ?? '').trim())
          .map((d) => ({ name: String(d.fileName ?? 'A document'), content: String(d.content).trim().slice(0, 12_000) })))
      : [];
    /* The same promise written twice is put once; what is read about it settles both rows. */
    const openOnce = oneOfEach(openPromises);
    const material: TheMaterial = {
      who, speaking: theSpeakerLine(row.participant), isTheLead, checkIn: row.ground?.label ?? null,
      on: isoOf(row.startedAt ?? row.completedAt ?? how.closedAt)?.slice(0, 10) ?? null, givenRole, priorities, turns, setup, documents,
      draft: {
        claims: (((row.whatWeHave as any)?.claims ?? []) as any[]).map((c) => [c.said, c.number && `(${c.number}${c.measure ? ` ${c.measure}` : ''})`, c.date && `by ${c.date}`].filter(Boolean).join(' ')).filter(Boolean),
        lines: ((closing?.recordDraft ?? []) as any[]).map((l) => String(l?.text ?? '').trim()).filter(Boolean),
      },
      previous: previous ? { checkInId: previous.checkInId, on: previous.on, items: theItemsToCompareAgainst(previous.assessment) } : null,
      openPromises: openOnce,
    };

    /* Which instructions run: a stored version wins over the file, as with every prompt, and the one that ran is recorded. */
    const stored = deps.prompts?.getActive ? await deps.prompts.getActive(ASSESSMENT_PROMPT_KEY).catch(() => null) : null;
    const instructions = stored?.content ?? THE_ASSESSMENT_PROMPT;
    const opts = { hasSetup: !!setup, previous: previous ? { checkInId: previous.checkInId, on: previous.on } : null, givenRole, compares: openOnce.length > 0 };

    let parts: TheReadParts = thePartsFrom(null, said, { ...opts, read: 1 });
    let matchedFirst = 0;
    let addedSecond = 0;
    let keptWhole = 0;
    if (messages.length) {
      modelCalls += 1;
      const first = await deps.anthropic.extract<any>(instructions, [{ role: 'user', content: theMaterialAsText(material) }], THE_ASSESSMENT_SCHEMA as any, { patient: true })
        .catch((err: any) => { modelFailed = true; log.warn(`Assessment of ${checkInId}: the first read failed: ${err?.message ?? err}`); return null; });
      if (!first) modelFailed = true;
      parts = thePartsFrom(first, said, { ...opts, read: 1 });
      let unmatched = theUnmatched(parts, messages);
      matchedFirst = messages.length - unmatched.length;
      /* THE COMPLETENESS CHECK: a second read only for what the first left unmatched. */
      if (unmatched.length && first) {
        modelCalls += 1;
        const second = await deps.anthropic.extract<any>(instructions, [{ role: 'user', content: theUnmatchedAsText(material, unmatched) }], THE_ASSESSMENT_SCHEMA as any, { patient: true })
          .catch((err: any) => { log.warn(`Assessment of ${checkInId}: the second read failed: ${err?.message ?? err}`); return null; });
        if (second) {
          parts = withTheSecondRead(parts, thePartsFrom(second, said, { ...opts, read: 2 }));
          const still = theUnmatched(parts, messages);
          addedSecond = unmatched.length - still.length;
          unmatched = still;
        }
      }
      keptWhole = unmatched.length;
      parts = withWhatIsLeftKeptWhole(parts, unmatched, said);
    }

    const readyAt = new Date();
    const assessment: TheAssessment = {
      kind: THE_ASSESSMENT_KIND,
      version: THE_ASSESSMENT_VERSION,
      about: {
        checkInId, groundId: row.groundId, participantId: row.participantId, who, isTheLead, checkIn: row.ground?.label ?? null,
        sessionNumber: row.sessionNumber, startedAt: isoOf(row.startedAt), endedAt: isoOf(row.completedAt ?? how.closedAt),
        channel: how.channel ?? (how.howItEnded === 'setup saved' ? 'setup' : 'not known'), howItEnded: how.howItEnded,
      },
      ...parts,
      messages,
      completeness: { messages: messages.length, matchedByTheFirstRead: matchedFirst, addedByTheSecondRead: addedSecond, keptWhole, ready: true },
      promptVersionId: stored?.id ?? null,
      promptFromFile: stored ? null : theFilesPromptVersion(),
      measure: { modelCalls, msFromCloseToReady: readyAt.getTime() - how.closedAt.getTime(), readyAt: readyAt.toISOString(), modelFailed },
    };

    /* LAYERS 2 AND 3: what this person's record shows over time, and the next step for each pattern, carried from the last one. */
    const seen: AnAssessmentSeen[] = [...earlier, { checkInId, sessionNumber: row.sessionNumber, on: assessment.about.endedAt, assessment }];
    const leadsView = isTheLead ? null : await theLeadsSetupViewOf(deps.prisma, row.groundId, who);
    const acrossTime = theRecordAcrossTime(row.participantId, seen, leadsView);
    const patterns = acrossTime.patterns;
    assessment.acrossTime = acrossTime;
    assessment.interventions = theInterventionsAfter(((previous?.assessment.interventions ?? []) as AnIntervention[]), patterns, { checkInId, sessionNumber: row.sessionNumber });

    await deps.prisma.checkIn.update({ where: { id: checkInId }, data: { sessionReport: theColumnWith(assessment, row.sessionReport) as any } });
    /* A correction of an earlier item is kept on that item, as its history (once fixed, it stays fixed). */
    if (previous) {
      const corrected = thePreviousWithItsCorrections(previous.assessment, assessment.corrections, checkInId, readyAt);
      if (corrected) {
        const before = await deps.prisma.checkIn.findUnique({ where: { id: previous.checkInId }, select: { sessionReport: true } }).catch(() => null);
        await deps.prisma.checkIn.update({ where: { id: previous.checkInId }, data: { sessionReport: theColumnWith(corrected, before?.sessionReport) as any } }).catch(() => undefined);
      }
    }
    log.log(`assessment-measure checkIn=${checkInId} ended="${how.howItEnded}" calls=${modelCalls} msFromClose=${assessment.measure.msFromCloseToReady} messages=${messages.length} matchedFirst=${matchedFirst} addedSecond=${addedSecond} keptWhole=${keptWhole} patterns=${patterns.length} prompt=${assessment.promptVersionId ?? assessment.promptFromFile}`);
    return assessment;
  } catch (err: any) {
    log.warn(`Assessment of ${checkInId} could not be written: ${err?.message ?? err}`);
    return null;
  }
}

/**
 * THE ASSESSMENT AND WHAT WAS READ FROM IT ARE READY: said once, after the readers that read from it (the waits and the promises)
 * have written, so whatever listens (the board's records, the patterns, the report) never reads before them. Said on every path,
 * whether or not the assessment could be written, so no listener waits for ever.
 */
export function theAssessmentIsReady(deps: Pick<AssessmentDeps, 'events'>, e: AssessmentReadyEvent): void {
  deps.events?.emit(GroundworkEvents.ASSESSMENT_READY, e satisfies AssessmentReadyEvent);
}

/**
 * THE LEAD'S VIEW OF THIS PERSON, for the bias check (Hafsah, 2 November 2026: "the lead's own words about people in setup as her
 * view"): her setup assessment's words about them. Read only for a participant's assessment, and kept on it for the lead alone.
 */
async function theLeadsSetupViewOf(prisma: any, groundId: string, who: string) {
  const lead = await prisma.groundParticipant?.findFirst?.({
    where: { groundId, partyType: 'INITIATOR' },
    select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
  })?.catch?.(() => null);
  if (!lead) return null;
  const rows = ((await prisma.checkIn.findMany({
    where: { participantId: lead.id },
    orderBy: { sessionNumber: 'asc' },
    select: { id: true, sessionNumber: true, completedAt: true, sessionReport: true },
  }).catch(() => [])) ?? []) as any[];
  const setup = rows.map((r) => ({ checkInId: r.id, sessionNumber: r.sessionNumber, on: isoOf(r.completedAt), assessment: theAssessmentIn(r.sessionReport) as TheAssessment }))
    .find((s) => !!s.assessment?.setup) ?? null;
  return theLeadsViewOf(who, setup, fullName(lead.user, lead.nameGiven));
}
