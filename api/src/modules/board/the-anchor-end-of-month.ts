import type { TheEndOfMonthRead, TheContinueOption } from '../entry/the-anchor-served-shapes';
import type { TheMonthRecord } from './the-anchor-month-record';
import { aNumber, capital, aWaitInAWords, NO_IDEA_YET, aContributionSaid, ideasSaid, howManyHeard } from './the-anchor-month-board';
import { theRevealSaid } from './the-anchor-reveal-said';

/**
 * THE END-OF-MONTH READ (docs/anchor-scenario.md, sections 28 and 29; decision 96 item 4; request 149).
 *
 * Built from the record with no model call, and read from the record's own clock, so opening it never
 * rebuilds it: the same record gives the same bytes. It begins with the lead's own words (`yourOwnWords`, her
 * words alone; the screen sets "You wanted your team to understand..." above them and quotes them).
 *
 * WHAT STAYS EMPTY. Nothing yet records how each person saw things at the start, so "What they now understand
 * differently" says so. Nothing records what changed in how the lead leads, so that says so too. Ideas (piece 19)
 * and hidden contributors (piece 22) are not built, so no idea is counted and no person is named.
 */
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const THE_CONTINUE_OPTIONS: TheContinueOption[] = [
  { key: 'keepThisGroundRunning', label: 'Keep this check-in running' },
  { key: 'startRecommendedGrounds', label: 'Start the recommended check-ins' },
  { key: 'turnOnRelevantSuites', label: 'Turn on the suites that fit' },
  { key: 'continueGroundworkForTheTeam', label: 'Continue Groundwork for the team' },
];

export const THE_MONTH_IS_28_DAYS = 28 * 86_400_000;

/** Whether the month has run its course: twenty-eight days of the record's own clock, or the check-in has ended. */
export function theMonthIsOver(startedOn: Date | null, clock: Date | null, ended: boolean): boolean {
  if (ended) return true;
  return !!startedOn && !!clock && clock.getTime() - startedOn.getTime() >= THE_MONTH_IS_28_DAYS;
}

/** Her first words, kept as she wrote them, cut at a sentence end if they run past 400 characters. */
export function herFirstWords(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  if (text.length <= 400) return text;
  const cut = text.slice(0, 400);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > 0 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '...';
}

export function theEndOfMonthRead(input: { herWords: string; record: TheMonthRecord; differences: string[]; patterns: string[] }): TheEndOfMonthRead {
  const r = input.record;
  const found = [r.checkedIn === 0 ? 'Groundwork did not hear from anyone over the month.' : `Groundwork heard from ${howManyHeard(r.checkedIn, r.ofHowMany)} over the month.`];
  if (input.differences.length) found.push(`${capital(aNumber(input.differences.length))} ${plural(input.differences.length, 'thing is', 'things are')} seen differently by different people.`);
  const doing: string[] = [];
  if (r.saidWhatTheyWillDo > 0) doing.push(`${capital(aNumber(r.saidWhatTheyWillDo))} ${plural(r.saidWhatTheyWillDo, 'person', 'people')} said what they would do themselves.`);
  if (r.commitmentsDone > 0) doing.push(`${capital(aNumber(r.commitmentsDone))} of the things people said they would do ${plural(r.commitmentsDone, 'was', 'were')} done.`);
  if (r.handoffsCleared > 0) doing.push(`${capital(aNumber(r.handoffsCleared))} ${plural(r.handoffsCleared, 'handoff that was', 'handoffs that were')} waiting on someone ${plural(r.handoffsCleared, 'was', 'were')} cleared.`);
  const stuck = [...r.waiting.map(aWaitInAWords), ...input.patterns];
  const reveal = {
    projectsThatCouldHaveTheirOwnGround: r.offers.project,
    sharedObjectivesWorthTracking: r.offers.aim,
    workingRelationshipsNeedingAlignment: r.offers.pair,
    activeCommitments: r.commitmentsOpen,
    /* The ideas the team put forward and said yes to capturing (piece 19), counted from the same record as the month board. */
    teamGeneratedIdeas: (r.ideas ?? []).length,
    suitesRelevantToWorkAlreadyBeingDone: 0,
  };
  const next: string[] = [];
  const offers = r.offers.pair + r.offers.project + r.offers.aim;
  if (offers > 0) next.push(`Groundwork found ${aNumber(offers)} ${plural(offers, 'piece of work', 'pieces of work')} that could have ${plural(offers, 'a check-in', 'check-ins')} of ${plural(offers, 'its', 'their')} own.`);
  if (r.commitmentsOpen > 0) next.push(`${capital(aNumber(r.commitmentsOpen))} of the things people said they would do ${plural(r.commitmentsOpen, 'is', 'are')} still open.`);
  if (!next.length) next.push('Keep checking in each week, so the record carries on from here.');
  return {
    yourOwnWords: input.herWords,
    whatWeFound: found,
    whatTheyNowUnderstandDifferently: [],
    whatTheyAreDoingDifferently: doing.length ? doing : ['Nothing has been recorded yet that people are doing differently.'],
    whatYourTeamContributed: [ideasSaid(r)],
    /* From the same record and the same sentence as the month board's people (piece 22), so the two never disagree. */
    peopleWhoHelpedMoveTheThinking: (r.doneByPerson ?? []).map((d) => ({ name: d.name, sentence: aContributionSaid(d.name, d.clause, d.settledBy) })),
    whatYouChangedAsALead: [],
    whatIsStillStuck: stuck.length ? stuck : ['Nobody has said that anything is still in their way.'],
    whatShouldHappenNext: next,
    reveal,
    revealSaid: theRevealSaid(reveal),
    /* "Turn on the suites that fit" is offered only when some were found; the count is not made yet, so for now it is not. */
    continueOptions: THE_CONTINUE_OPTIONS.filter((o) => o.key !== 'turnOnRelevantSuites' || reveal.suitesRelevantToWorkAlreadyBeingDone > 0).map((o) => ({ ...o })),
  };
}

/**
 * The lead's own first words to Groundwork: the first thing she typed in her own check-in, else the first line of her own
 * on the record (when what she said first reached the record and not a turn, for example by WhatsApp or a document), else
 * the brief she gave. A line she disputed is not hers. Read only.
 */
export async function herOwnWords(prisma: any, groundId: string, leadUserId: string | null): Promise<string | null> {
  if (leadUserId) {
    const turns: { content: string }[] = await prisma.conversationTurn.findMany({
      where: { role: 'PERSON', checkIn: { groundId, participant: { userId: leadUserId } } },
      orderBy: { createdAt: 'asc' },
      take: 1,
      select: { content: true },
    });
    const first = herFirstWords(turns?.[0]?.content);
    if (first) return first;
    const entries: { text: string }[] = (await prisma.recordEntry?.findMany?.({
      where: { disputedAt: null, participant: { groundId, userId: leadUserId } },
      orderBy: { createdAt: 'asc' },
      take: 1,
      select: { text: true },
    })) ?? [];
    const onTheRecord = herFirstWords(entries?.[0]?.text);
    if (onTheRecord) return onTheRecord;
    /*
     * A LEAD WHO SET THE CHECK-IN UP IN THE ORDINARY ENTRY CHAT (decision 114) has no turn in her own check-in: what she typed there is kept
     * as her set-up words, hers alone. Her first message is her first words.
     */
    const setUp: { text: string; authorUserId?: string } | null = (await prisma.leadSetupWords?.findUnique?.({ where: { groundId } })?.catch?.(() => null)) ?? null;
    const firstTyped = herFirstWords((setUp && (!setUp.authorUserId || setUp.authorUserId === leadUserId) ? setUp.text : '').split(/\n\s*\n/)[0]);
    if (firstTyped) return firstTyped;
  }
  const ground = await prisma.ground.findUnique({ where: { id: groundId }, select: { brief: true } });
  return herFirstWords(ground?.brief);
}
