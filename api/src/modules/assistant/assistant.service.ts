import { Injectable, Logger } from '@nestjs/common';
import { NOTHING_FLAGGED } from '../detectors/who-needs-you-this-week';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyStatus } from '@prisma/client';
import { route, whatICanDoWith } from './the-router-is-deterministic';
import { Reply, rules, text, picker } from './a-reply-is-a-payload-not-a-string';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { AnthropicService } from '../conversation/anthropic.service';
import { STYLE, STYLE_VERSION, safeToUse, composePrompt, roleNameIn } from './the-model-words-it-and-nothing-more';
import { hasSlipped, theOneToRaise } from './what-somebody-said-they-would-do';
import { catchCommitment, resolveConfirmation, proposalSummary } from './something-said-in-passing';
import { BoardService } from '../board/board.service';
import { OnboardingService } from '../grounds/onboarding.service';
import { ContributionKind } from '@prisma/client';
import {
  Load, Waiting, theOneMove, theMirror, goingCold, bankedWins, sayTheMoves,
} from '../coaching/the-four-converting-moves';
import { KnowledgeService, STOPWORDS } from '../knowledge/knowledge.service';
import { howLongAgo, splitBySession } from './what-you-told-me-before';
import { ScenariosService } from '../detectors/scenarios.service';
import { DraftsService } from '../drafts/drafts.service';
import { whatToAskForNext } from '../drafts/a-number-nobody-argued-for';
import { readToDo, toDoProposal, whichToDo, listToDos } from './a-to-do-is-yours';
import { whatItTakesToStart } from './what-it-takes-to-start';
import {
  whichSituation,
  askWhichSituation,
  whoWouldBeAsked,
  askBeforeOpeningIt,
  saidAsAList,
} from './what-a-new-check-in-would-be';
import { WhatIsTrueService } from './what-is-true.service';
import { WHAT_THE_ASSISTANT_CAN_DO } from './what-the-assistant-can-do';
import { EmailService } from '../email/email.service';
import { GroundsService } from '../grounds/grounds.service';
import {
  whereItLives,
  whatToCallIt,
  whatWeCanAndCannotDo,
} from '../documents/where-a-document-lives';
import { ReadItIfWeCanService } from '../documents/read-it-if-we-can.service';
import {
  whyThereIsNowhereToPutIt,
  askWhoItIsFor,
  whoTheyMeant,
  askAgain,
  whatWasDone,
} from './a-document-is-private-until-you-say-otherwise';
import {
  whyThisCannotBeSent,
  askBeforeSending,
  theMail,
} from './anything-it-can-say-it-can-send';
import { whatIStillCannotDo } from './what-is-not-offered-in-chat';
import { whatTheyWantToCallIt } from './what-they-want-to-call-it';
import { asALine, whatIsMissingAcrossThem } from './what-a-target-was-for';
import { recall, saidOf, NOTHING_FINISHED, NOTHING_AT_ALL } from './what-the-last-round-produced';
import { COOLING_DAYS } from '../detectors/a-conversation-the-record-suggests';
import {
  Suggestible, fromRow, suggestionLine, askAbout, acceptedLine, acceptedNextStep, declinedLine, NOTHING_PENDING,
} from './a-suggestion-you-can-answer';
import { Prisma } from '@prisma/client';

/**
 * THE LANES, AND EVERY ONE OF THEM WORKS WITH THE MODEL OFF.
 *
 * That is the floor the spec asks for and it is built first rather than last, because a
 * deterministic reply written after a model-composed one is written to match it - and what you get
 * is a fallback nobody would ship on its own.
 *
 * There is no model call in this file at all yet. Every lane here answers from records the customer
 * actually pushed, so what it says is either true or absent. Composition can be layered over these
 * later; the answers will not change, only the wording.
 *
 * The lanes that do not exist yet are not stubbed. A stub is a lane that answers, badly, and gets
 * believed - `unplaced` says plainly what it can do instead.
 */
/**
 * How many finished check-ins a recall carries. A person in eight of them asked what was agreed
 * does not want eight reports pasted at them - they want the recent ones and a pointer to the rest.
 */
const ROUNDS_RECALLED = 3;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    /*
     * Named for a provider it no longer uses - it speaks to Gemini - and left alone, because a
     * rename here would touch the check-in engine, which is not what this change is about.
     */
    private readonly engine: AnthropicService,
    private readonly knowledge: KnowledgeService,
    private readonly board: BoardService,
    private readonly onboarding: OnboardingService,
    /*
     * The detectors already produced these and already knew how to take an answer. Injecting the
     * service rather than reading `scenarioCandidate` here is what keeps the "only the person it
     * was put to may answer it" check in one place - `decide` owns that, and a query written here
     * would be a second, weaker copy of it.
     */
    private readonly scenarios: ScenariosService,
    /*
     * The drafting flow already existed — it opens a draft, pulls people in,
     * refuses to seed while anybody still disagrees, and writes the objective.
     * It was reachable by nothing. Injecting it rather than writing a second
     * objective-setting path here is what keeps that refusal in one place.
     */
    private readonly drafts: DraftsService,
    /*
     * WHAT IS TRUE FOR THIS PERSON, ASSEMBLED ONCE. Lanes ask it rather than
     * querying, so what the assistant knows stops depending on which question
     * was asked. See `what-is-true-for-this-person.ts`.
     */
    private readonly truth: WhatIsTrueService,
    private readonly reader: ReadItIfWeCanService,
    private readonly email: EmailService,
    private readonly grounds: GroundsService,
  ) {}

  async respond(organizationId: string, personId: string, message: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    const who = me?.externalId ?? null;

    const reply = await this.answer(organizationId, personId, who, message);

    /* Remembered after the answer, so a failure to record cannot cost somebody their reply. */
    if (who) {
      await this.remember(organizationId, who, message, reply).catch(() => undefined);
    }
    return reply;
  }

  /**
   * THE SIX STAGES, IN THE ORDER THE CONFIRMATION HAS TO HAPPEN.
   *
   * A parked proposal is resolved BEFORE anything else is considered, because the person is
   * answering a question we asked. Routing their "yes" as if it were a fresh question would lose it
   * and leave the proposal parked, which is the state that must never persist.
   */
  private async answer(
    organizationId: string,
    personId: string,
    who: string | null,
    message: string,
    /*
     * RE-ENTRY IS BOUNDED BY A FLAG, NOT BY A DATABASE WRITE HAVING SUCCEEDED.
     *
     * The drop path answers the person's actual message by calling this again, and the only thing
     * stopping that from looping was the proposal no longer being PARKED - true only if the update
     * landed. A failed write would have meant an infinite loop inside a request. Found by a test
     * whose fake returned the same parked row every time, which is what a database under a failed
     * write would do.
     */
    afterDrop = false,
  ): Promise<Reply> {
    if (who && !afterDrop) {
      const parked = await this.prisma.assistantProposal.findFirst({
        where: { organizationId, personExternalId: who, state: 'PARKED' },
        orderBy: { createdAt: 'desc' },
      });
      if (parked) return this.resolveParked(organizationId, personId, who, parked, message);
    }

    const routed = route(message);

    /*
     * AN OPEN DRAFT TAKES PLAIN ANSWERS.
     *
     * The objective lane asked "what is being measured?" and then nothing read the reply: a person
     * who answered "revenue from the Lagos hub" was told what the assistant can do instead. A message
     * no lane claims, from somebody with a draft that is still asking, is the answer to what it asked.
     */
    if (who && routed.lane === 'unplaced') {
      const continued = await this.continueTheDraft(organizationId, who, message);
      if (continued) return continued;
    }

    switch (routed.lane) {
      case 'add_a_to_do':
        return this.addAToDo(organizationId, who, routed.subject ?? '', message);
      case 'my_to_dos':
        return this.compose(await this.myToDos(organizationId, who));
      case 'tick_off_a_to_do':
        return this.tickOffAToDo(organizationId, who, routed.subject ?? message);
      case 'what_you_can_see':
        return this.compose(await this.whatICanSee(organizationId));
      case 'what_am_i_on':
        return this.compose(await this.whatAmIOn(organizationId, personId));
      case 'who_is':
        return this.compose(await this.whoIs(organizationId, routed.subject ?? ''));
      case 'what_did_i_commit_to':
        return this.compose(await this.myCommitments(organizationId, personId));
      case 'where_am_i_up_to':
        /*
         * The role name has to survive. Losing it is what turned "what is my role" into a checklist
         * with no answer in it, and the lane is the only thing that knows which word matters.
         */
        return this.whereAmIUpTo(organizationId, who).then((r) => this.compose(r, roleNameIn(r)));
      case 'what_should_we_talk_about':
        return this.whatShouldWeTalkAbout(organizationId, who);
      case 'what_came_of_it':
        return this.whatCameOfIt(organizationId, personId);
      case 'set_an_objective':
        return this.setAnObjective(organizationId, who, message);
      case 'start_a_check_in':
        return this.startACheckIn(organizationId, personId, who, message);
      case 'send_me_that':
        return this.sendMeThat(organizationId, personId, who);
      case 'add_a_document':
        return this.addADocument(organizationId, personId, who ?? '', message);
      case 'where_am_i_needed':
        return this.compose(await this.whereAmINeeded(organizationId, who));
      case 'what_is_stuck':
        return this.compose(await this.whatIsStuck(organizationId, who, message));
      case 'how_am_i_doing':
        return this.compose(await this.howAmIDoing(organizationId, who));
      case 'what_did_i_say':
        return this.compose(await this.whatDidISay(organizationId, who, routed.subject ?? message));
      case 'how_we_work':
        /*
         * NOT COMPOSED, AND THIS WAS A REAL MISTAKE FOR ONE LIVE REPLY.
         *
         * The comment on `howWeWork` says a policy quoted is not a policy paraphrased, and then the
         * answer went through the composer, which paraphrased it: "Anything under 100 pounds you
         * can just claim" came back as "Claim anything under £100". Perfectly good English and
         * nobody's actual policy. What is written down goes out as written.
         */
        return this.howWeWork(organizationId, who, routed.subject ?? message);
      default: {
        /*
         * NOTHING TO ANSWER, BUT MAYBE SOMETHING TO NOTICE.
         *
         * A commitment said in passing lands here, because "I'll send it Wednesday" is not a
         * question and no lane owns it. Offering to write it down is a better answer than a list of
         * things it cannot do.
         */
        if (who) {
          const proposal = await this.maybePropose(organizationId, who, message);
          if (proposal) return proposal;
        }
        /*
         * NOT COMPOSED, DELIBERATELY. There is nothing here to say better: it is a fixed sentence
         * and a list of buttons, and a model rewording it would only make the one reply a person
         * sees most often vary for no reason.
         */
        const { line, options } = whatICanDoWith(message);
        return rules('unplaced', text(line), picker(options));
      }
    }
  }

  /**
   * THE ANSWER IS ALREADY CORRECT BEFORE THIS RUNS. This only changes how it sounds.
   *
   * One model call, and a failure of any kind - off, unreachable, slow, or a reply that fails the
   * checks - ships the draft. The person gets the true answer either way; only the wording and the
   * `composedBy` stamp differ, and the stamp is why that is honest rather than hidden.
   */
  private async compose(reply: Reply, mustKeep: string[] = []): Promise<Reply> {
    const first = reply.blocks[0];
    if (!first || first.type !== 'text') return reply;
    const draft = first.body;

    try {
      const composed = await this.engine.respond(STYLE, [{ role: 'user', content: composePrompt(draft) }]);
      if (!safeToUse(draft, composed, mustKeep)) {
        this.logger.warn(`Composition refused for lane ${reply.lane}; shipping the draft.`);
        return reply;
      }
      return {
        ...reply,
        blocks: [text(composed.trim()), ...reply.blocks.slice(1)],
        composedBy: 'model',
        styleVersion: STYLE_VERSION,
      };
    } catch (err: any) {
      /* An outage must not cost somebody their answer. */
      this.logger.warn(`Composition unavailable for lane ${reply.lane}: ${err?.message}`);
      return reply;
    }
  }

  /**
   * WHAT THIS ROLE IS, AND WHAT IS STILL OUTSTANDING.
   *
   * §11.1 asks for exactly this and says why: the chat answers from live status. Somebody in their
   * first fortnight asking "what am I meant to be doing" is the person least able to go and find an
   * admin console, and most likely to conclude the answer is nowhere.
   *
   * It says what is LEFT rather than how far through they are. A proportion is a progress bar about
   * a person, and there is no version of "you are 40% onboarded" that helps somebody who wants to
   * know which thing to do next.
   */
  private async whereAmIUpTo(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('where_am_i_up_to', text('I cannot look that up without knowing who you are.'));

    const status = await this.onboarding.statusFor(organizationId, who);
    if (!status.roleName) {
      return rules('where_am_i_up_to', text(
        'No role is recorded for you here, so there is nothing set up for you to work through.',
      ));
    }
    if (!status.gates.length) {
      return rules('where_am_i_up_to', text(
        `You are down as ${status.roleName}. Nothing has been set up as a starting checklist for that role, `
        + 'so there is nothing outstanding.',
      ));
    }
    /*
     * THE ROLE IS NAMED AS ITS OWN SENTENCE, NOT ONLY IN A LIST HEADER.
     *
     * §11.1 asks the chat to answer what this role IS as well as what is left, and driving it showed
     * why that is two things. `sayWhatIsLeft` carried the role only in "Still to do for Engineer:",
     * and the composer rewrote that header to "Your next steps:" - correct English, and it deleted
     * the answer to the question actually asked. `safeToUse` refuses a proper noun the model ADDS;
     * it says nothing about one it drops.
     *
     * A standalone sentence is harder to lose than a header, and if it is lost the check-in is one
     * sentence poorer rather than unanswered.
     */
    return rules('where_am_i_up_to', text(
      `You are down as ${status.roleName}.\n\n${status.says ?? ''}`,
    ));
  }

  /**
   * WHAT IS WAITING, ACROSS EVERY GROUND, WITH HOW LONG.
   *
   * The handoff record has existed for a long time and the board reads it well - but only ever one
   * ground at a time, which is the boundary the question does not respect. Somebody waiting three
   * weeks on the same person appears as a mild note on three separate boards and as nothing anywhere.
   *
   * Two answers come out of the same read, and which one somebody gets depends on the question they
   * asked. "What am I waiting on" is theirs to chase. "Who is waiting on me" is the one that usually
   * lands as news, because the person holding things up is normally the last to know.
   */
  /**
   * WHERE A MANAGER IS NEEDED, ASKED IN THE PLACE THEY ALREADY ASK THINGS.
   *
   * This is the lane rather than a screen because a screen would be a fifth place to look for
   * somebody who already has too many, and because what it produces is four short lists that mean
   * nothing without the sentences around them - which is what a conversation is good at and a panel
   * is not.
   *
   * IT SAYS WHAT IT IS NOT, EVERY TIME. A manager reading a few names under a heading supplies their
   * own meaning within about a second, and the meaning they supply is "my problem people". That is
   * the opposite of what most of this list is: the largest bucket is usually the company owing
   * somebody something.
   */
  private async whereAmINeeded(organizationId: string, who: string | null): Promise<Reply> {
    const person = who
      ? await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { email: true } })
      : null;
    const key = person?.email?.toLowerCase() ?? null;
    if (!key) {
      return rules('where_am_i_needed', text('I cannot match you to a check-in, so I cannot tell you where you are needed.'));
    }

    const week = await this.board.whoNeedsYouThisWeek(organizationId, key);
    if (!week.buckets.length) return rules('where_am_i_needed', text(NOTHING_FLAGGED));

    const parts = week.buckets.map((b) => [
      b.asks,
      ...b.needs.map((n) => `- ${n.who}: ${n.says}, ${n.waitingDays} days.`),
    ].join('\n'));

    /* Never trimmed away when the list is long. A long list is when it matters most. */
    parts.push(week.whatThisIsNot.join(' '));
    return rules('where_am_i_needed', text(parts.join('\n\n')));
  }

  private async whatIsStuck(organizationId: string, who: string | null, question = ''): Promise<Reply> {
    const { waiting, waitedOn } = await this.board.waitingAcrossTheOrg(organizationId);

    const person = who
      ? await this.prisma.person.findFirst({
          where: { organizationId, externalId: who },
          select: { email: true },
        })
      : null;
    const key = person?.email?.toLowerCase() ?? null;

    const mine = key ? waiting.filter((w) => w.fromPersonKey === key) : [];
    const onMe = key ? (waitedOn.find((p) => p.personKey === key)?.waiting ?? []) : [];

    if (!mine.length && !onMe.length) {
      return rules('what_is_stuck', text(
        key
          ? 'Nothing is recorded as waiting on you, and you have not named anything you are waiting on.'
          : 'I cannot match you to a check-in, so I cannot tell you what is waiting on you.',
      ));
    }

    /*
     * The days are stated rather than turned into a word. "Long overdue" is a judgement the record
     * cannot support - it does not know what a reasonable wait is for any of these - and eleven days
     * is a fact the reader can weigh for themselves.
     */
    /*
     * THE DRAFT NAMES THE STATUS, BECAUSE A GAP IS WHAT THE MODEL FILLS.
     *
     * The first version left severity out and the composer supplied it - a WAITING handoff came back
     * as "has been blocked for 2 days". That distinction is load-bearing here: the quick read counts
     * only BLOCKING, and the decisions list promotes only BLOCKING, labelled as something nobody can
     * move past. Instructing the composer not to embellish would not have helped, and cutting it off
     * from the model would have traded a better sentence for a bug left in place. Stating the status
     * leaves nothing to invent.
     */
    const line = (w: (typeof waiting)[number]) =>
      `- ${w.what} (${w.groundLabel}) - ${w.status === DependencyStatus.BLOCKING ? 'hard blocker' : 'waiting'}, `
      + `${w.waitingDays} ${w.waitingDays === 1 ? 'day' : 'days'}`;

    /*
     * ANSWER THE QUESTION THEY ASKED FIRST, EVEN WHEN THE ANSWER IS NOTHING.
     *
     * Driving this found it: asked "what am I waiting on", somebody with nothing of their own but
     * one handoff sitting with them got back a list headed "Waiting on you". Both facts are true and
     * the second is the more useful one, but leading with it silently answers a different question,
     * and the reader has to work out that the swap happened. Saying so costs one line.
     */
    const askedAboutTheirOwn = /waiting on\b/i.test(question) && !/on me\b/i.test(question);

    const parts: string[] = [];
    if (askedAboutTheirOwn && !mine.length && onMe.length) {
      parts.push('You have not named anything you are waiting on. What I do have is the other direction.');
    }
    if (onMe.length) {
      parts.push(
        `Waiting on you:\n${onMe.map(line).join('\n')}\n\n`
        + 'That is from what other people said about their own work, not from anyone assigning it to you.',
      );
    }
    if (mine.length) {
      parts.push(`You said you are waiting on:\n${mine.map(line).join('\n')}`);
    }
    return rules('what_is_stuck', text(parts.join('\n\n')));
  }

  /**
   * THE COACH THAT ALREADY EXISTS, ASKED FROM A DIFFERENT PLACE.
   *
   * There is no second coach here and there must not be. `CoachingState` has been written on every
   * completed check-in for a long time, by a state machine with rules earned the hard way - one step
   * at a time, never a list; a step that goes unmanaged twice changes rather than repeating; and
   * nothing ever accumulates into a judgement. This lane READS that. Building a parallel coach for
   * the panel would give somebody two answers about themselves from one product.
   *
   * The state is per PARTICIPANT, which is per ground. A person is usually in more than one, so the
   * most recent step is the one that is live - an older ground's step is not wrong, it is finished.
   *
   * WHAT THIS DOES NOT DO is answer "how am I doing" with an assessment. The question gets a step,
   * because a step is the only honest answer a machine can give to it, and the alternative is the
   * verdict that coaching-can-never-justify-a-firing.spec.ts exists to prevent.
   */
  private async howAmIDoing(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('how_am_i_doing', text('I cannot look that up without knowing who you are.'));

    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who },
      select: { email: true },
    });
    if (!person?.email) {
      return rules('how_am_i_doing', text('I cannot match you to a check-in, so I have nothing to go on yet.'));
    }

    const state = await this.prisma.coachingState.findFirst({
      where: { participant: { email: person.email, ground: { organizationId } } },
      orderBy: { updatedAt: 'desc' },
      select: { currentStep: true, staircase: true },
    });

    const moves = await this.theConvertingMoves(organizationId, who);

    if (!state?.currentStep) {
      /*
       * No step is a real answer and a common one. The engine only offers one when the record has
       * earned it, and saying "you are doing fine" instead would be inventing an assessment out of
       * an absence - the exact thing this lane must not do.
       */
      return rules('how_am_i_doing', text(
        'There is no step waiting for you. That is not a verdict either way - the coaching in your check-in only offers one when there is something specific worth doing, and right now there is not.'
        + moves,
      ));
    }

    return rules('how_am_i_doing', text(
      `One thing, from your last check-in: ${state.currentStep}\n\n`
      + 'That is the whole of it. It is meant to be small enough to actually happen this week, and if it is not, saying so in your next check-in changes it rather than repeating it.'
      + moves,
    ));
  }

  /**
   * THE FOUR CONVERTING MOVES, UNDERNEATH THE STEP RATHER THAN INSTEAD OF IT.
   *
   * The check-in coach decides the step; nothing here overrides it. What these add is the context a
   * step cannot carry on its own - what they finished since, how much of the load is actually theirs
   * to move, and what has quietly stopped coming up.
   *
   * They live in the chat because that is where coaching lives in this product. A board of these
   * numbers is a scoreboard about a person however carefully it is worded, and the numbers here are
   * counts precisely so they cannot be ranked between people.
   */
  private async theConvertingMoves(organizationId: string, personExternalId: string): Promise<string> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const commitments = await this.prisma.commitment.findMany({
      where: { organizationId, personExternalId },
      select: { id: true, text: true, state: true, statedAt: true, dueAt: true, lastFollowedUpAt: true },
    });
    if (!commitments.length) return '';

    const load: Load[] = commitments.map((c) => ({
      id: c.id, text: c.text, state: c.state, statedAt: c.statedAt, dueAt: c.dueAt,
      /*
       * `lastFollowedUpAt` is the closest record of "last time this came up", and it is not the same
       * thing - it is when the assistant raised it, not when they mentioned it. Using it means a
       * commitment the assistant has nagged about looks warm. Named here rather than papered over;
       * the honest fix is a mention timestamp, which does not exist yet.
       */
      lastMentionedAt: c.lastFollowedUpAt,
    }));

    const { waiting } = await this.board.waitingAcrossTheOrg(organizationId);
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId }, select: { email: true },
    });
    const key = person?.email?.toLowerCase() ?? null;
    const theirs: Waiting[] = key
      ? waiting.filter((w) => w.fromPersonKey === key)
        .map((w) => ({ what: w.what, status: w.status, onPersonKey: w.onPersonKey, waitingDays: w.waitingDays }))
      : [];

    const unblocked = await this.prisma.contribution.aggregate({
      where: { organizationId, personExternalId, kind: ContributionKind.UNBLOCKING },
      _sum: { weight: true },
    });

    const said = sayTheMoves({
      move: theOneMove(load, theirs),
      mirror: theMirror(load, theirs),
      cold: goingCold(load, new Date()),
      wins: bankedWins(load, unblocked._sum.weight ?? 0, since),
    });
    return said ? `\n\n${said}` : '';
  }

  /**
   * WHAT THEY TOLD ME BEFORE - AND ONLY EVER WHAT THEY TOLD ME.
   *
   * THE SCOPE IS THE FEATURE. A recall that could reach another participant's turns would be the
   * product quoting one colleague to another, which is the thing it exists to prevent - so the
   * person is in the where clause, not in a filter applied afterwards, and there is a guard whose
   * only job is to check that.
   *
   * Their own words come back verbatim with a plain "you said". Summarising somebody's own sentence
   * back at them is both worse and riskier than quoting it.
   */
  private async whatDidISay(organizationId: string, who: string | null, topic: string): Promise<Reply> {
    if (!who) return rules('what_did_i_say', text('I cannot look back without knowing who you are.'));
    const q = topic.trim().replace(/[?.!]+$/, '');
    if (q.length < 3) return rules('what_did_i_say', text('About what?'));

    /*
     * STOPWORDS REMOVED, AND FORGETTING THEM MADE THIS ABSURD.
     *
     * The first version filtered on length alone, so "the" was a search word - and since "the" is
     * in almost every sentence anybody types, "did I mention the pricing model" came back with
     * every turn the person had ever written. It looked like a memory and was a table scan with a
     * confident sentence on top.
     */
    const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    /* Nothing meaningful left to search on is a real answer, not a reason to match everything. */
    if (!words.length) return rules('what_did_i_say', text('About what, specifically?'));
    const needles = words;

    const hits = await this.prisma.$queryRaw<{ content: string; createdAt: Date; role: string }[]>(
      Prisma.sql`
        SELECT content, created_at AS "createdAt", role
        FROM assistant_turns
        WHERE organization_id = ${organizationId}
          AND person_external_id = ${who}
          AND role = 'person'
          AND (
            content % ${q}
            OR EXISTS (
              SELECT 1 FROM unnest(${needles}::text[]) AS w
              WHERE regexp_replace(lower(content), '[^a-z0-9]', '', 'g') LIKE '%' || w || '%'
            )
          )
        ORDER BY created_at DESC
        LIMIT 4
      `,
    );

    /*
     * THEIR OWN QUESTIONS ARE NOT THINGS THEY TOLD ME.
     *
     * Every message a person types is stored, including "did I mention the vendor comparison" - so
     * asking twice recalled the first asking, which is noise dressed as memory. A turn that is
     * itself a question to the assistant is dropped, and the check is the router: if it routes to a
     * lane, it was a question rather than an account of somebody's work.
     */
    const said = hits.filter((h) => route(h.content).lane === 'unplaced');

    if (!said.length) {
      return rules('what_did_i_say', text(`You have not mentioned ${q} to me before. That may just mean it was said somewhere I cannot see.`));
    }

    const now = new Date();
    const { current, earlier } = splitBySession(said, now);
    const lines: string[] = [];
    for (const h of current) lines.push(`- Earlier just now: "${h.content}"`);
    for (const h of earlier) lines.push(`- ${howLongAgo(h.createdAt, now)}: "${h.content}"`);
    return rules('what_did_i_say', text(`You have mentioned ${q}:\n${lines.join('\n')}`));
  }

  /**
   * "HOW WE WORK HERE", ANSWERED FROM WHAT THE ORGANISATION HAS ACTUALLY DECIDED.
   *
   * Not a hand-written FAQ that drifts, and not the model's general knowledge about how companies
   * usually do expenses. Their own cards or nothing - and nothing is a real answer here, because
   * the alternative is an assistant confidently describing a policy this company does not have.
   *
   * The card body is quoted rather than summarised. A policy paraphrased is a policy changed, and
   * somebody acting on the paraphrase has been told something nobody wrote.
   */
  private async howWeWork(organizationId: string, who: string | null, topic: string): Promise<Reply> {
    if (!who) return rules('how_we_work', text('I cannot look that up without knowing who you are.'));

    /* The topic, not the sentence: "how do I swap" scores against nothing and drags the rest down. */
    const { cards, truncated } = await this.knowledge.retrieve(organizationId, who, topic);
    if (!cards.length) {
      return rules('how_we_work', text('Your organisation has not written anything down about that here. If it should have, whoever set Groundwork up can add it.'));
    }

    const parts = cards.map((c) => `${c.title}\n${c.body}`);
    if (truncated) {
      /* Said rather than hidden: somebody acting on a partial policy should know it was partial. */
      parts.push('There is more written down about this than I have shown here.');
    }
    return rules('how_we_work', text(parts.join('\n\n')));
  }

  /**
   * PROPOSE. Never on the first turn, and never while another proposal is parked.
   *
   * The first-turn rule is not politeness. Offering to write something down within a second of a
   * stranger opening a panel, before it has answered a single question, is the behaviour that makes
   * somebody decide this thing is going to be a problem.
   */
  private async maybePropose(organizationId: string, who: string, message: string): Promise<Reply | null> {
    const caught = catchCommitment(message);
    if (!caught) return null;

    const turns = await this.prisma.assistantTurn.count({
      where: { organizationId, personExternalId: who, role: 'person' },
    });
    if (turns < 1) return null;

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'commitment',
        summary: proposalSummary(caught),
        payload: caught as any,
      },
    });
    return {
      lane: 'propose_commitment',
      composedBy: 'rules',
      blocks: [
        text(proposal.summary),
        { type: 'proposal', proposalId: proposal.id, summary: proposal.summary },
      ],
    };
  }

  /**
   * STARTING A CHECK-IN BY SAYING SO.
   *
   * The last thing about a check-in that was a button and not a sentence.
   *
   * IT DOES NOT START ANYTHING ITSELF. It works out which of four situations somebody is in and
   * offers the one act that moves them, as a `next_step` the panel performs — same reason the accept
   * line stopped carrying a path: this code cannot know which application it is being read inside,
   * and a customer whose own system has a place for this should be able to use it.
   *
   * Matched by the ADDRESS the invitation went to as well as by the account, because a participant
   * is linked to an account only when somebody accepts. Without that, a person with a session
   * sitting in front of them is told there is nothing.
   */
  /**
   * PUTTING A DOCUMENT IN.
   *
   * A chat cannot carry a file, which is why this was on the not-offered list. What it can do is
   * start it and own the question that matters — who the document is for — and the panel it lives in
   * has the file picker.
   *
   * IT OFFERS, IT DOES NOT UPLOAD. Same shape as everything else that acts: this returns a
   * `next_step` the panel performs, so a customer whose own application has a place for files can
   * point at that instead. And the file arrives PRIVATE whatever happens next: the question of who
   * it is for is asked afterwards, when somebody is actually looking at it, and a conversation
   * abandoned halfway leaves it seen by nobody but its owner.
   */
  private async addADocument(organizationId: string, personId: string, who: string, message: string): Promise<Reply> {
    const truth = await this.truth.forPerson(organizationId, personId);
    if (!truth) {
      return rules('add_a_document', text('I cannot see you in your organisation records, so I do not know where to put it.'));
    }

    const open = truth.sessions.value.filter((s) => s.standing === 'open to you');
    const nowhere = whyThereIsNowhereToPutIt(open.length);
    if (nowhere) return rules('add_a_document', text(nowhere));

    const [first, ...rest] = open;

    /*
     * THEY PASTED A LINK, so there is nothing to pick and nothing to upload.
     *
     * Almost nothing a company works from lives in here — the job description is
     * in Drive, the contract is in Dropbox — and asking somebody to download and
     * re-upload is asking them to keep two copies in step. They do it once.
     *
     * It is recorded, never read: see `where-a-document-lives.ts` for why these
     * are a different table rather than a document with no text in it.
     */
    const where = whereItLives(message);
    if (where) {
      const me = await this.prisma.person.findFirst({
        where: { id: personId, organizationId },
        select: { linkedUserId: true },
      });
      const participant = await this.prisma.groundParticipant.findFirst({
        where: { groundId: first.groundId, userId: me?.linkedUserId ?? undefined },
        select: { id: true },
      });
      const title = whatToCallIt(where, message);

      /*
       * SOMETIMES WE CAN JUST READ IT.
       *
       * A published page, a Doc set to "anyone with the link" — refusing to read
       * those is not caution. What must never happen is the middle: a document we
       * half-read, or a claim to have read one we did not. So it is one thing or
       * the other, and the person is told which.
       *
       * READ means a real document with text in it, in the documents table.
       * NOT READ means a link in its own table, which nothing that assembles
       * document text can reach.
       */
      const attempt = await this.reader.read(where.url);
      if (attempt.read) {
        const held = await this.prisma.groundDocument.create({
          data: {
            groundId: first.groundId,
            participantId: participant?.id ?? null,
            fileName: title,
            mimeType: 'text/plain',
            content: attempt.text,
            uploaderNote: `Read from ${attempt.from}: ${where.url}`,
          },
        });

        await this.prisma.assistantProposal.create({
          data: {
            organizationId,
            personExternalId: who,
            kind: 'document',
            state: 'PARKED',
            summary: `Who "${title}" is for`,
            payload: { documentId: held.id, elsewhere: false, groundId: first.groundId, fileName: title },
          },
        });

        return rules(
          'add_a_document',
          text(
            `"${title}" was readable, so I have read it and kept the text — ${attempt.text.length.toLocaleString()} characters from ${attempt.from}. `
            + `I will use it the way I use anything else on this check-in.\n\n${askWhoItIsFor(title)}`,
          ),
        );
      }

      const recorded = await this.prisma.documentElsewhere.create({
        data: {
          groundId: first.groundId,
          participantId: participant?.id ?? null,
          url: where.url,
          livesIn: where.livesIn,
          title,
          note: null,
        },
      });

      await this.prisma.assistantProposal.create({
        data: {
          organizationId,
          personExternalId: who,
          kind: 'document',
          state: 'PARKED',
          summary: `Who "${title}" is for`,
          payload: { documentId: recorded.id, elsewhere: true, groundId: first.groundId, fileName: title },
        },
      });

      /* WHY it could not be read, said out loud. "I cannot read it" invites the
         person to try again the same way; "not readable without signing in" tells
         them what would change it. */
      return rules(
        'add_a_document',
        text(`${whatWeCanAndCannotDo(where, title)} (I tried: ${attempt.because}.)\n\n${askWhoItIsFor(title)}`),
      );
    }

    const also = rest.length
      ? ` You have ${rest.length === 1 ? 'one other check-in' : `${rest.length} other check-ins`} open — say which if it belongs somewhere else.`
      : '';

    return rules(
      'add_a_document',
      text(
        `It will go on "${first.label}", and only you will be able to see it until you say otherwise.${also}`,
      ),
      {
        type: 'next_step',
        label: 'Choose a file',
        href: '/grounds',
        kind: 'upload_a_document',
        id: first.checkInId as string,
        context: { groundId: first.groundId, label: first.label },
      },
    );
  }

  /**
   * EMAIL ME THAT.
   *
   * The first capability that could not have been a lane in the old sense: it does not answer a
   * question about the records, it acts on what was already said. Which is also why it is the proof
   * the registry was worth building — it declares that it writes and how that is agreed, and the
   * guard holds it to that without anybody remembering to.
   *
   * IT PROPOSES. Mail leaves the building and cannot be recalled, so it is never sent on a sentence
   * that merely sounded like a request — "can you send me that" is a question in some rooms.
   */
  private async sendMeThat(organizationId: string, personId: string, who: string | null): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true, displayName: true, email: true },
    });
    if (!me || !who) {
      return rules('send_me_that', text('I cannot see you in your organisation records, so I do not know where to send it.'));
    }

    /*
     * WHAT WAS ACTUALLY SAID, from their own turns and nobody else's. The last thing the assistant
     * said, and the question it answered — sending a summary would mean the mail and the
     * conversation disagree, and only one of them is in front of them.
     */
    const recent = await this.prisma.assistantTurn.findMany({
      where: { organizationId, personExternalId: who },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { role: true, content: true, lane: true },
    });
    const lastReply = recent.find((t) => t.role === 'assistant' && t.lane !== 'send_me_that');
    const theQuestion = recent.find((t) => t.role === 'person');

    const latest = lastReply
      ? { body: lastReply.content, about: theQuestion?.content ?? 'your work', lane: lastReply.lane ?? 'unplaced' }
      : null;

    const cannot = whyThisCannotBeSent(latest, me);
    if (cannot) return rules('send_me_that', text(cannot));

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'delivery',
        summary: askBeforeSending(latest!, me),
        payload: latest as never,
      },
    });

    return {
      lane: 'send_me_that',
      composedBy: 'rules',
      blocks: [
        text(proposal.summary),
        { type: 'proposal', proposalId: proposal.id, summary: proposal.summary },
      ],
    };
  }

  private async startACheckIn(organizationId: string, personId: string, _who: string | null, message: string): Promise<Reply> {
    /* THE ONE READ. This lane used to query the grounds and the check-ins
       itself, which is how the same logic came to exist three times and drift.
       See `what-is-true.service.ts`. */
    const truth = await this.truth.forPerson(organizationId, personId);
    if (!truth) {
      return rules('start_a_check_in', text('I cannot see you in your organisation records, so I cannot tell what is waiting for you.'));
    }

    const sessions = truth.sessions.value;
    const said = whatItTakesToStart({
      toStart: sessions
        .filter((x) => x.standing === 'waiting on you to start')
        .map((x) => ({ groundId: x.groundId, label: x.label })),
      open: sessions
        .filter((x) => x.standing === 'open to you')
        .map((x) => ({ checkInId: x.checkInId as string, label: x.label })),
      notAccepted: sessions
        .filter((x) => x.standing === 'invitation not accepted')
        .map((x) => ({ label: x.label })),
    });

    if (said.act) {
      return rules(
        'start_a_check_in',
        text(said.line),
        { type: 'next_step', label: said.act.label, href: '/grounds', kind: said.act.kind, id: said.act.id },
      );
    }

    /*
     * NOTHING WAITING, SO OFFER TO OPEN ONE.
     *
     * The same lane rather than a second one, and the registry is why: "set up a check-in" belongs
     * to this capability, and a lane that also claimed it would be the fifth collision of the week.
     * It is better for the person too — nobody should have to know whether the thing they want
     * already exists.
     */
    if (truth.sessions.value.length === 0) {
      return this.offerToOpenOne(organizationId, personId, truth.person.externalId, message);
    }

    return rules('start_a_check_in', text(said.line));
  }

  /**
   * OPENING ONE THAT DOES NOT EXIST YET.
   *
   * The first capability that emails people, which changes what care means. Everything else here is
   * recoverable in the next sentence; an invitation is in somebody's inbox, and what it invites them
   * to is accounting for themselves.
   *
   * So it proposes, and the proposal NAMES EVERYBODY. Never a count.
   */
  private async offerToOpenOne(
    organizationId: string,
    personId: string,
    who: string,
    message: string,
  ): Promise<Reply> {
    const read = whichSituation(message);

    if (read === null) return rules('start_a_check_in', text(askWhichSituation()));
    if ('ambiguous' in read) return rules('start_a_check_in', text(askWhichSituation(read.ambiguous)));

    const roster = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, displayName: true, managerExternalId: true, active: true },
    });
    const people = whoWouldBeAsked(roster, who);
    const label = whatTheyWantToCallIt(message) ?? read.says;

    const asks = askBeforeOpeningIt({ says: read.says, label, people });

    /*
     * NOTHING IS PARKED WHEN THERE IS NOBODY TO ASK, and the first version got this wrong in a way
     * only running it showed. It parked a proposal with an empty list, so a "yes" resolved it and
     * answered "none of those people can be reached now" — about people who had never been named.
     * A parked action nobody can sensibly say yes to should not exist.
     */
    if (people.length === 0) return rules('start_a_check_in', text(asks));

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'open_a_check_in',
        summary: asks,
        payload: {
          scenario: read.scenario,
          label,
          people: people.map((p) => p.externalId),
        } as never,
      },
    });

    return {
          lane: 'start_a_check_in',
          composedBy: 'rules',
          blocks: [
            text(proposal.summary),
            { type: 'proposal', proposalId: proposal.id, summary: proposal.summary },
          ],
        };
  }

  /**
   * SETTING AN OBJECTIVE, WHICH IS THE ONE LANE THAT STARTS SOMETHING.
   *
   * Every other lane answers a question about records that already exist. This one opens a draft
   * and then asks for the four things a draft needs, one at a time, refusing an answer that is a
   * way of getting past the question rather than answering it.
   *
   * IT DOES NOT WRITE THE OBJECTIVE. The draft has to be agreed by the people on it, and seeding is
   * a separate act with its own refusals — one of which is that nobody has said why the number is
   * the one that matters. An assistant that could turn a two-minute conversation into an official
   * target would be the fastest way to fill this system with objectives nobody agreed.
   *
   * THE QUESTIONS ARE THE DRAFT'S, NOT THIS LANE'S. `askNext` comes back from the drafting service,
   * so the screen and the conversation ask the same thing in the same words — and adding a fifth
   * question later does not mean remembering to add it here too.
   */
  private async setAnObjective(organizationId: string, who: string | null, message: string): Promise<Reply> {
    if (!who) {
      return rules(
        'set_an_objective',
        text('I cannot see you in your organisation records, so I cannot open a draft in your name.'),
      );
    }

    /*
     * AN OPEN DRAFT IS CONTINUED, NEVER DUPLICATED. Somebody saying "let's set an objective" twice
     * in one conversation means they are still on the first one — and a second draft would split
     * the answers across two records, each looking half-finished.
     */
    const open = await this.prisma.objectiveDraft.findFirst({
      where: { organizationId, initiatorExternalId: who, state: { in: ['DRAFTING', 'CONTESTED'] } },
      orderBy: { updatedAt: 'desc' },
    });

    if (open) {
      const next = whatToAskForNext(open);
      if (!next) return this.offerToSeed(organizationId, who, open);
      return rules('set_an_objective', text(`Still on "${open.workingTitle}". ${next.asks}`));
    }

    /*
     * The working title is the person's own words, minus the asking. Not the model's paraphrase:
     * this becomes the objective's title if the draft survives, and a title nobody typed is one
     * nobody recognises in the list a fortnight later.
     */
    const workingTitle = whatTheyWantToCallIt(message);
    if (!workingTitle) {
      return rules(
        'set_an_objective',
        text('What is it about? A few words is enough to start — the title can change.'),
      );
    }

    const draft = await this.drafts.start(organizationId, who, { workingTitle });
    const next = whatToAskForNext(draft);

    return rules(
      'set_an_objective',
      text(`Started a draft: "${draft.workingTitle}". ${next ? next.asks : ''}`.trim()),
    );
  }

  /**
   * CONFIRM, RE-VERIFY, DELEGATE, AUDIT, READ BACK.
   *
   * The re-verification matters more than it looks: between the offer and the yes, the person may
   * have been deprovisioned, or their organisation disconnected. A parked action carries the
   * authorisation it had when it was offered, and that is exactly what must not be trusted.
   */
  private async resolveParked(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    /*
     * A DOCUMENT IS ANSWERED BEFORE THE YES/NO READING, because its question is not a yes/no one.
     * "Everyone" is not a confirmation and "just me" is not a refusal, and running them through
     * that reading first would take "no one" as a decline and drop the whole thing — leaving a file
     * uploaded, private, and nobody told what happened to it.
     */
    if (parked.kind === 'document') {
      return this.resolveParkedDocument(organizationId, who, parked, message);
    }

    const decision = resolveConfirmation(message);

    if (decision === 'drop') {
      /*
       * THE DROP. Anything that is not a clear yes or no ends it, so a "yes" later in the
       * conversation - meant for something else - can never fire this.
       */
      await this.prisma.assistantProposal.update({
        where: { id: parked.id },
        data: { state: 'DROPPED', resolvedAt: new Date() },
      });
      /*
       * And their message is still answered, because they were talking about something. The real
       * personId is carried through: the lanes look somebody up by it, and an empty one would have
       * every lane answer "I cannot find you" immediately after a dropped proposal - which reads as
       * the product breaking at the exact moment somebody changed the subject.
       */
      return this.answer(organizationId, personId, who, message, true);
    }

    /*
     * WHICH QUESTION IS BEING ANSWERED, decided before anything is written. Below this line the
     * code assumes the payload is a commitment - it reads `payload.text` and creates one - so a
     * scenario answered here without the branch would have written a commitment whose text was
     * undefined. Both kinds share the reading of yes/no/drop above and nothing after it.
     */
    if (parked.kind === 'scenario') {
      return this.resolveParkedScenario(organizationId, who, parked, decision);
    }

    if (parked.kind === 'delivery') {
      return this.resolveParkedDelivery(organizationId, who, parked, decision);
    }

    if (parked.kind === 'open_a_check_in') {
      return this.resolveParkedOpening(organizationId, personId, who, parked, decision);
    }
    if (parked.kind === 'todo') {
      return this.resolveParkedToDo(organizationId, who, parked, decision);
    }
    if (parked.kind === 'seed_objective') {
      return this.resolveParkedSeed(organizationId, who, parked, decision);
    }

    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({
        where: { id: parked.id },
        data: { state: 'DECLINED', resolvedAt: new Date() },
      });
      return rules('confirm_commitment', text('Left it, then.'));
    }

    /* RE-VERIFY at execution: still a person here, still active. */
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who, active: true },
      select: { id: true },
    });
    if (!person) {
      await this.prisma.assistantProposal.update({
        where: { id: parked.id },
        data: { state: 'DROPPED', resolvedAt: new Date() },
      });
      return rules('confirm_commitment', text('I could not write that down, because I can no longer see you in your organisation records.'));
    }

    const payload = parked.payload as { text: string; dueSaid: string | null };
    const created = await this.prisma.commitment.create({
      data: {
        organizationId,
        personExternalId: who,
        text: payload.text,
        dueSaid: payload.dueSaid,
        /* Never inferred. They said words, not a date. */
        dueAt: null,
        source: 'assistant',
      },
    });

    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: 'ACCEPTED', resolvedAt: new Date(), createdCommitmentId: created.id },
    });

    /* READ BACK. Success is reported on what the database confirms, never on intent. */
    const confirmed = await this.prisma.commitment.findUnique({ where: { id: created.id } });
    if (!confirmed) return rules('confirm_commitment', text('I tried to note that and cannot see it on the record, so treat it as not written down.'));

    return rules('confirm_commitment', text(`Noted: ${confirmed.text}. It will come back to you in your next check-in.`));
  }

  /**
   * WHAT THE RECORD IS ASKING YOU TO DECIDE.
   *
   * NOT COMPOSED, and that is the same call as `how_we_work`. `says` is the detector's sentence
   * about a named colleague, carrying the evidence that produced it - a model asked to make it read
   * better would reword the one part that has to survive intact. The wording rules exist to smooth
   * the product's own voice, not to restate a finding about a person.
   *
   * ONE AT A TIME. `pendingFor` returns them ranked, and the list is shown so nothing is hidden,
   * but only the top one is put as a question. Parking two would mean a "yes" that could not be
   * matched to what it answered - and the parked-proposal machinery is deliberately built around
   * exactly one open question, because that is the only way a bare "yes" is unambiguous.
   */
  private async whatShouldWeTalkAbout(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('what_should_we_talk_about', text('I cannot find you in what your organisation has sent us.'));

    /* Mapped, not cast. `says` lives inside the evidence blob - see `fromRow`. */
    const pending = (await this.scenarios.pendingFor(organizationId, who)).map(fromRow);
    if (!pending.length) return rules('what_should_we_talk_about', text(NOTHING_PENDING));

    const now = new Date();
    const top = pending[0];

    /*
     * The rest are listed, not asked about. Somebody with four pending suggestions being asked
     * about one of them and told nothing of the others would reasonably think there was one.
     */
    const others = pending.slice(1).map((s) => `- ${suggestionLine(s, now)}`);
    const body = [
      suggestionLine(top, now),
      askAbout(top),
      ...(others.length ? ['', `${others.length} more waiting on you:`, ...others] : []),
    ].join('\n');

    /*
     * PARKED BEFORE THE REPLY GOES OUT, so a "yes" typed immediately has something to land on. The
     * candidate id is all the payload carries: re-reading the candidate at the moment of the answer
     * is what makes an expired or already-decided one fail honestly rather than firing on a stale
     * copy of itself.
     */
    await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'scenario',
        summary: suggestionLine(top, now),
        payload: { candidateId: top.id, scenario: top.scenario },
      },
    });

    return rules('what_should_we_talk_about', text(body));
  }

  /**
   * THE ANSWER TO A SUGGESTION, which is a different thing from the answer to a noted commitment.
   *
   * Both arrive through the same parked question and the same yes/no/drop reading of the reply -
   * that part should never be duplicated, since it is the piece that decides whether an ambiguous
   * message fires a write. What differs is only what a yes means, so this branches on `kind` and
   * nowhere else.
   */
  /**
   * OPENING THE CHECK-IN, OR NOT.
   *
   * RE-READ AT EXECUTION, and here it matters more than anywhere else in this file. Between the
   * offer and the yes somebody may have left, been deactivated, or had their address removed — and
   * this is the one act that puts a message in another person's inbox. A parked action carries the
   * roster it was offered under, which is exactly what must not be trusted.
   *
   * Anybody who has gone is DROPPED AND NAMED rather than silently skipped: a check-in that quietly
   * opened without one of the people somebody agreed to is a check-in they will read the report of
   * and not understand.
   */
  private async resolveParkedOpening(
    organizationId: string,
    personId: string,
    who: string,
    parked: any,
    decision: 'accept' | 'decline',
  ): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });

    if (decision === 'decline') return rules('start_a_check_in', text('Left it. Nothing was sent.'));

    const payload = parked.payload as { scenario: string; label: string; people: string[] };

    const still = await this.prisma.person.findMany({
      where: { organizationId, externalId: { in: payload.people }, active: true },
      select: { externalId: true, displayName: true, email: true },
    });
    const gone = payload.people.filter((id) => !still.some((p) => p.externalId === id));
    const reachable = still.filter((p) => p.email);
    const noAddress = still.filter((p) => !p.email).map((p) => p.displayName ?? p.externalId);

    if (reachable.length === 0) {
      return rules(
        'start_a_check_in',
        text('I did not open it: none of those people can be reached now. Nothing was sent.'),
      );
    }

    const me = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who, active: true },
      select: { linkedUserId: true },
    });
    if (!me?.linkedUserId) {
      return rules(
        'start_a_check_in',
        text('I could not open it in your name — your account is not linked yet, and a check-in has to belong to somebody. Nothing was sent.'),
      );
    }

    const ground = await this.grounds.create(organizationId, me.linkedUserId, {
      label: payload.label,
      scenario: payload.scenario as never,
      moment: 'STARTING' as never,
    });

    for (const p of reachable) {
      await this.grounds.addParticipant(ground.id, organizationId, me.linkedUserId, {
        email: p.email as string,
      });
    }

    const said = [`Opened "${payload.label}". ${saidAsAList(reachable.map((p) => p.displayName ?? p.externalId))} ${reachable.length === 1 ? 'has' : 'have'} been invited.`];
    /* Named, not counted, in both directions — the same rule the offer runs on. */
    if (gone.length) said.push(`${saidAsAList(gone)} ${gone.length === 1 ? 'is' : 'are'} no longer on the roster, so ${gone.length === 1 ? 'they were' : 'they were'} left out.`);
    if (noAddress.length) said.push(`${saidAsAList(noAddress)} ${noAddress.length === 1 ? 'has' : 'have'} no email address on the roster and could not be invited.`);

    return rules('start_a_check_in', text(said.join(' ')));
  }

  /**
   * WHO THE DOCUMENT IS FOR.
   *
   * The file is already in and already private. This only ever OPENS it, and only on an answer clear
   * enough to act on — anything ambiguous asks again rather than guessing, because guessing in the
   * permissive direction publishes somebody's document to their team and there is no undo for that.
   *
   * The proposal stays parked while the answer is unclear, so somebody can say it properly rather
   * than starting again.
   */
  private async resolveParkedDocument(organizationId: string, who: string, parked: any, message: string): Promise<Reply> {
    const payload = parked.payload as { documentId: string; groundId: string; fileName: string; elsewhere?: boolean };
    const meant = whoTheyMeant(message);

    if (meant === null) return rules('add_a_document', text(askAgain()));

    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: 'ACCEPTED', resolvedAt: new Date() },
    });

    /* OWN is where it already is. Saying so is not a write — and a write that changes nothing is
       still a write somebody has to be able to account for. */
    if (meant !== 'OWN') {
      /* Two tables, one question. A document that lives elsewhere is recorded in
         its own table precisely so nothing that assembles document TEXT can reach
         it — which means this has to know which of the two it is holding. */
      if (payload.elsewhere) {
        await this.prisma.documentElsewhere.update({
          where: { id: payload.documentId },
          data: { visibility: meant },
        });
      } else {
        await this.prisma.groundDocument.update({
          where: { id: payload.documentId },
          data: { visibility: meant },
        });
      }
    }

    return rules('add_a_document', text(whatWasDone(payload.fileName, meant)));
  }

  /**
   * SENDING IT, OR NOT.
   *
   * RE-READ AT EXECUTION, like every other confirmed act here: between the offer and the yes their
   * address may have changed or been removed, and a parked action carries the address it was offered
   * under. Mail to a stale address is the one mistake that cannot be taken back.
   */
  private async resolveParkedDelivery(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });

    if (decision === 'decline') return rules('send_me_that', text('Left it in here, then.'));

    const me = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who, active: true },
      select: { displayName: true, email: true },
    });
    if (!me?.email) {
      return rules('send_me_that', text('I could not send it: there is no longer an email address for you in your organisation records.'));
    }

    const latest = parked.payload as { body: string; about: string; lane: string };
    const mail = theMail(latest, me);

    try {
      await this.email.sendRoundDigest(me.email, mail.subject, mail.text);
    } catch (error) {
      /* Said plainly rather than swallowed. Somebody who asked for an email and got a cheerful
         "sent" that never arrived stops trusting everything else this says. */
      this.logger.warn(`Could not send to ${who}: ${(error as Error).message}`);
      return rules('send_me_that', text('I could not send it just now, so treat it as not sent. It is still here.'));
    }

    return rules('send_me_that', text(`Sent to ${me.email}. Nobody else was copied.`));
  }

  private async resolveParkedScenario(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const payload = parked.payload as { candidateId: string; scenario: string };

    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });

    try {
      /*
       * `decide` re-checks that this suggestion was put to this person and is still open. It throws
       * on an expired or already-answered one, and that is caught rather than allowed out: the
       * person did nothing wrong by answering a question the product asked them, and a 404 in a
       * chat window is the product blaming them for its own timing.
       */
      const decided = fromRow(await this.scenarios.decide(organizationId, payload.candidateId, who, decision === 'accept'));

      if (decision !== 'accept') {
        return rules('what_should_we_talk_about', text(declinedLine(COOLING_DAYS)));
      }

      /* The words say what happened; the block says where setting it up lives. Kept apart so the
         panel can route it into the customer's own application instead of sending somebody out of
         their own system - see `acceptedNextStep`. */
      return rules(
        'what_should_we_talk_about',
        text(acceptedLine(decided)),
        { type: 'next_step', ...acceptedNextStep(decided) },
      );
    } catch {
      return rules('what_should_we_talk_about', text('That suggestion is no longer open, so there was nothing for me to record. Ask me what is waiting on you and I will tell you what still stands.'));
    }
  }

  /**
   * WHAT THE CHECK-INS PRODUCED, WHICH THE ASSISTANT HAD NO WAY OF KNOWING.
   *
   * Every table this service reads is about the present: objectives, commitments, contributions,
   * its own turns. The product's actual output - a released report with a question a group agreed
   * was the central one - was invisible to it, so "what did we decide about the platform work" was
   * answered from a handbook or not at all.
   *
   * SCOPED BY PARTICIPATION, THROUGH THE PARTICIPANT ROW, and this is the only reason a query here
   * is acceptable at all. A person reaches a report because they were in that check-in - the same
   * bridge `whereAmIUpTo` already uses, matching a `Person` to a `GroundParticipant` by email,
   * which is the one identifier the two share. Somebody who was not in it does not select the row,
   * so there is nothing to filter afterwards.
   *
   * RELEASED ONLY. An unreleased report exists in the database before its parties may read it -
   * `releasedAt` is set once, atomically, for everybody at the same moment, and a recall that ran
   * ahead of it would hand one person a report the others cannot see yet.
   *
   * NARROWER THAN THE REPORT PAGE, DELIBERATELY. That page also lets an org admin read with the
   * lead's eyes. This does not: asking a chat window one question and receiving every check-in in
   * the organisation is a different act from opening one report, and the narrower default is the
   * one to start from. It is a decision to revisit, not a limitation to work around.
   *
   * NOT COMPOSED. The agreements are what a group settled on, in the words the report recorded, and
   * the composer's job is wording - it would rewrite the one thing here that has to be quotable.
   */
  private async whatCameOfIt(organizationId: string, personId: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { email: true },
    });
    if (!me?.email) return rules('what_came_of_it', text('I cannot find you in what your organisation has sent us.'));

    const mine = await this.prisma.groundParticipant.findMany({
      where: { email: me.email, ground: { organizationId } },
      select: {
        ground: {
          select: {
            label: true,
            /*
             * AN ALLOWLIST, NOT A ROW. `Report` also carries `engagement`, `finalSynthesis`,
             * `arcSignals` and `inferences` - per-person material that `own-reads-only.ts` exists
             * because it once went to everybody. Selecting the four shared fields by name means a
             * field added to the model later cannot arrive here by accident.
             */
            report: { select: { releasedAt: true, centralQuestion: true, agreements: true, divergences: true } },
          },
        },
      },
    });

    const finished = mine
      .map((p) => p.ground)
      .filter((g): g is NonNullable<typeof g> & { report: { releasedAt: Date } } => Boolean(g?.report?.releasedAt))
      .sort((a, b) => b.report.releasedAt!.getTime() - a.report.releasedAt!.getTime());

    if (!finished.length) {
      /* Two different silences, and which one it is is the useful part. */
      return rules('what_came_of_it', text(mine.length ? NOTHING_FINISHED : NOTHING_AT_ALL));
    }

    const now = new Date();
    const body: string[] = [];
    for (const g of finished.slice(0, ROUNDS_RECALLED)) {
      const r = recall({
        groundLabel: g.label,
        releasedAt: g.report.releasedAt!,
        centralQuestion: g.report.centralQuestion,
        agreements: (g.report as any).agreements,
        divergences: (g.report as any).divergences,
      });
      body.push(...saidOf(r, howLongAgo(r.when, now)), '');
    }
    if (finished.length > ROUNDS_RECALLED) {
      body.push(`${finished.length - ROUNDS_RECALLED} earlier check-ins are on your check-ins page.`);
    }

    return rules('what_came_of_it', text(body.join('\n').trim()));
  }

  /** The running history, scoped to one person and never anybody else's turns. */
  private async remember(organizationId: string, who: string, message: string, reply: Reply) {
    const said = reply.blocks.find((b) => b.type === 'text') as { body?: string } | undefined;
    await this.prisma.assistantTurn.createMany({
      data: [
        { organizationId, personExternalId: who, role: 'person', content: message },
        {
          organizationId, personExternalId: who, role: 'assistant',
          content: said?.body ?? '', lane: reply.lane, composedBy: reply.composedBy,
        },
      ],
    });
  }

  /**
   * WHAT THEY SAID THEY WOULD DO, AND WHICH OF IT IS LATE.
   *
   * Late is only ever said about a commitment that carried a real date. One with words and no date
   * is listed as what it is - something they said - and never as something they have missed.
   */
  /**
   * THE DRAFT'S NEXT QUESTION IS ANSWERED HERE.
   *
   * Only when a draft of theirs is still asking and no lane claimed the message. The draft's own
   * refusal ("that is not a measure") is returned as the reply, so the screen and the chat say the
   * same thing about the same answer. When the last piece lands, the offer to set it follows.
   */
  private async continueTheDraft(organizationId: string, who: string, message: string): Promise<Reply | null> {
    /* A draft that cannot be read is no draft: this must never be the reason a plain message gets no answer. */
    const open = await Promise.resolve(
      this.prisma.objectiveDraft?.findFirst({
        where: { organizationId, initiatorExternalId: who, state: { in: ['DRAFTING', 'CONTESTED'] } },
        orderBy: { updatedAt: 'desc' },
      }) ?? null,
    ).catch(() => null);
    if (!open) return null;
    const next = whatToAskForNext(open);
    if (!next) return null;
    try {
      const r = await this.drafts.answer(organizationId, open.id, who, next.piece, message);
      if (r.askNext) return rules('set_an_objective', text(`Noted. ${r.askNext.asks}`));
      const fresh = await this.prisma.objectiveDraft.findUnique({ where: { id: open.id } });
      return this.offerToSeed(organizationId, who, fresh ?? open);
    } catch (err: any) {
      const why = err?.message ?? 'That did not read as an answer.';
      return rules('set_an_objective', text(`${why} ${next.asks}`));
    }
  }

  /**
   * SET IT, AFTER A PLAIN YES. The draft becomes an objective on the organisation's own board -
   * the same subjects the API lists - owned by the person who drafted it. Never on a maybe, and
   * never by the assistant deciding the draft is good enough: the drafting service's own readiness
   * rule is asked first, and its reason is the reply when it says no.
   */
  private async offerToSeed(organizationId: string, who: string, draft: { id: string; workingTitle: string }): Promise<Reply> {
    const status = await this.drafts.status(organizationId, draft.id);
    if (!status.ready) return rules('set_an_objective', text(`"${draft.workingTitle}" has your answers. It cannot be set yet: ${status.because}`));
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'seed_objective',
        summary: `Set "${draft.workingTitle}" as an objective on your organisation's board, owned by you? Yes to set it, no to leave it as a draft.`,
        payload: { draftId: draft.id, title: draft.workingTitle } as any,
      },
    });
    return {
      lane: 'set_an_objective',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedSeed(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });
    const payload = parked.payload as { draftId: string; title: string };
    if (decision === 'decline') return rules('set_an_objective', text(`Left as a draft. "${payload.title}" is still here when you want it.`));
    try {
      const r = await this.drafts.seed(organizationId, payload.draftId, `chat-${payload.draftId}`, 'groundwork-chat');
      return rules(
        'set_an_objective',
        text(`Set. "${payload.title}" is on your organisation's board as an objective you own (subject ${r.subjectExternalId}). Check-ins against it read your evidence from here on.`),
      );
    } catch (err: any) {
      return rules('set_an_objective', text(`I could not set it: ${err?.message ?? 'something refused it'}. The draft is still here.`));
    }
  }

  /* --- to-dos: a note to yourself, apart from anything promised to anybody --- */

  private async addAToDo(organizationId: string, who: string | null, subject: string, message: string): Promise<Reply> {
    if (!who) return rules('add_a_to_do', text('I cannot see you in your organisation records, so I have no list to put that on.'));
    const todo = readToDo(subject, message);
    if (!todo) return rules('add_a_to_do', text('What goes on the list? A few words is enough.'));
    const proposal = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'todo', summary: toDoProposal(todo), payload: todo as any },
    });
    return {
      lane: 'add_a_to_do',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedToDo(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });
    if (decision === 'decline') return rules('add_a_to_do', text('Left it, then.'));
    const payload = parked.payload as { text: string; dueSaid: string | null };
    await this.prisma.todo.create({
      data: { organizationId, personExternalId: who, text: payload.text, dueSaid: payload.dueSaid, dueAt: null, source: 'chat' },
    });
    return rules('add_a_to_do', text(`On your list: ${payload.text}. Say "what is on my list" any time; "done: ${payload.text}" closes it.`));
  }

  private async myToDos(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('my_to_dos', text('I cannot see you in your organisation records, so I have no list to read.'));
    const open = await this.prisma.todo.findMany({
      where: { organizationId, personExternalId: who, state: 'OPEN' },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
    return rules('my_to_dos', text(listToDos(open)));
  }

  private async tickOffAToDo(organizationId: string, who: string | null, said: string): Promise<Reply> {
    if (!who) return rules('tick_off_a_to_do', text('I cannot see you in your organisation records, so I have no list to close anything on.'));
    const open = await this.prisma.todo.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN' } });
    const which = whichToDo(said, open);
    if ('none' in which) return rules('tick_off_a_to_do', text(open.length ? `Nothing on your list reads like "${said}". ${listToDos(open)}` : 'Your list is empty, so there is nothing to close.'));
    if ('several' in which) return rules('tick_off_a_to_do', text(`More than one of these could be it. Which?\n${which.several.map((t) => `- ${t.text}`).join('\n')}`));
    await this.prisma.todo.update({ where: { id: which.one.id }, data: { state: 'DONE', doneAt: new Date() } });
    return rules('tick_off_a_to_do', text(`Done: ${which.one.text}.`));
  }

  private async myCommitments(organizationId: string, personId: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    if (!me) return rules('what_did_i_commit_to', text('I cannot find you in what your organisation has sent us.'));

    const open = await this.prisma.commitment.findMany({
      where: { organizationId, personExternalId: me.externalId, state: 'OPEN' },
      orderBy: [{ dueAt: 'asc' }, { statedAt: 'asc' }],
    });
    if (!open.length) {
      return rules('what_did_i_commit_to', text('Nothing is open. Anything you say you will do in a check-in shows up here.'));
    }

    const now = new Date();
    const line = (c: (typeof open)[number]) => {
      const when = c.dueSaid ? ` (you said ${c.dueSaid})` : '';
      return `- ${c.text}${when}${hasSlipped(c as any, now) ? ' - the date you gave has passed' : ''}`;
    };
    const late = open.filter((c) => hasSlipped(c as any, now));
    const parts = [`${open.length} open:`, ...open.map(line)];
    if (late.length) {
      parts.push(`\n${late.length} of those ${late.length === 1 ? 'is' : 'are'} past the date you gave. That is worth saying out loud in your next check-in rather than letting it sit.`);
    }
    return rules('what_did_i_commit_to', text(parts.join('\n')));
  }

  private async whatICanSee(organizationId: string): Promise<Reply> {
    const subjects = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null },
      select: { sourceSystem: true, syncedAt: true, sourceDeletedAt: true },
    });
    const people = await this.prisma.person.count({ where: { organizationId, active: true } });

    if (!subjects.length && !people) {
      return rules('what_you_can_see', text('Nothing is connected yet, so there is genuinely nothing I can tell you. Your admin can connect your systems from the Connect page.'));
    }

    const now = new Date();
    const bySystem = new Map<string, { syncedAt: Date; stale: boolean }>();
    for (const s of subjects) {
      const cur = bySystem.get(s.sourceSystem);
      if (!cur || s.syncedAt > cur.syncedAt) {
        bySystem.set(s.sourceSystem, { syncedAt: s.syncedAt, stale: freshnessOf(s, now) === 'stale' });
      }
    }

    const lines = [
      `${subjects.length} ${subjects.length === 1 ? 'objective or project' : 'objectives and projects'}, and ${people} ${people === 1 ? 'person' : 'people'}.`,
      ...[...bySystem.entries()].map(([sys, v]) =>
        /* Staleness is said out loud rather than left for somebody to infer from a date. */
        v.stale
          ? `${sys} last sent anything on ${v.syncedAt.toDateString()}, which is old enough that I would check it before relying on it.`
          : `${sys}, last updated ${v.syncedAt.toDateString()}.`,
      ),
    ];

    const quiet = quietUntil(
      await this.prisma.detectionQuietPeriod.findMany({ where: { organizationId }, select: { endsAt: true } }),
      now,
    );
    if (quiet) lines.push(`I am not raising anything until ${quiet.toDateString()}, because your systems were only just connected.`);

    /*
     * AND WHAT I CAN DO WITH IT, READ FROM THE REGISTRY RATHER THAN LISTED HERE.
     *
     * A hand-written list of abilities in this one lane would be wrong within a
     * fortnight — it is the same failure as a hand-written pattern, one layer up.
     * Reading the declarations means the answer cannot drift from what the router
     * actually does, because a guard already holds those together.
     *
     * The honest half is `whatIStillCannotDo`: somebody who asks what this can do
     * is usually about to ask for the one thing it cannot, and hearing "not yet,
     * and here is why" is a better answer than discovering it a question later.
     */
    lines.push('', 'What you can ask me for:');
    for (const c of WHAT_THE_ASSISTANT_CAN_DO) {
      lines.push(`- ${c.does}${c.writes === 'nothing' ? '' : ` (${c.writes})`}`);
    }

    const notYet = whatIStillCannotDo();
    if (notYet.length) {
      lines.push('', 'What I cannot do yet:');
      for (const n of notYet) lines.push(`- ${n}`);
    }

    return rules('what_you_can_see', text(lines.join('\n')));
  }

  /**
   * Answered from the imported graph, and honest about the difference between the two ways of being
   * on something. "Assigned" is what their tool says; whether the person has ever discussed it is a
   * different question this cannot answer yet, and it does not pretend otherwise.
   */
  private async whatAmIOn(organizationId: string, personId: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    if (!me) return rules('what_am_i_on', text('I cannot find you in what your organisation has sent us, which is something your admin would need to look at.'));

    const all = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null },
      /* `justification` and `approach` are the reason the number is the number and what anybody
         meant to do about it. They were collected, carried across the API and rendered into the
         check-in prompt, and were invisible here - so the one place somebody ASKS about their work
         was the one place that could not say what it was for. */
      select: { title: true, target: true, measure: true, ownerExternalId: true, contributorExternalIds: true, dueDate: true, justification: true, approach: true },
      orderBy: { dueDate: 'asc' },
    });

    const owned = all.filter((s) => s.ownerExternalId === me.externalId);
    const contributing = all.filter(
      (s) => s.ownerExternalId !== me.externalId
        && Array.isArray(s.contributorExternalIds)
        && (s.contributorExternalIds as unknown[]).includes(me.externalId),
    );

    if (!owned.length && !contributing.length) {
      /* An empty answer that says WHY it is empty. "Nothing" and "nothing has been sent to me" are
         different facts and only one of them is about the person. */
      return rules('what_am_i_on', text('Nothing your organisation has sent us lists you as an owner or a contributor. That may mean the work is tracked somewhere that is not connected yet.'));
    }

    const parts: string[] = [];
    if (owned.length) parts.push(`You own ${owned.length}:`, ...owned.map(asALine));
    if (contributing.length) parts.push(`${parts.length ? '\n' : ''}You are a contributor on ${contributing.length}:`, ...contributing.map(asALine));

    const missing = whatIsMissingAcrossThem([...owned, ...contributing]);
    if (missing) parts.push(`\n${missing}`);

    parts.push('\nThat is what your systems say. Whether it matches what you are actually spending your time on is the more interesting question, and one for your check-in.');

    return rules('what_am_i_on', text(parts.join('\n')));
  }

  /**
   * A ROSTER LOOKUP AND NOTHING MORE.
   *
   * Name, role, department, who they report to - the things an org chart holds. Deliberately not
   * how they are doing, what they have said, or anything derived from a check-in: this is a
   * question one colleague asks about another, and the answer stays on the side of the wall that
   * shared intelligence lives on.
   */
  private async whoIs(organizationId: string, query: string): Promise<Reply> {
    const q = query.replace(/[?.]+$/, '').trim();
    if (!q) return rules('who_is', text('Who did you mean?'));

    const people = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, userName: true, displayName: true, title: true, department: true, managerExternalId: true },
    });
    const lower = q.toLowerCase();
    const hit = people.find(
      (p) => (p.displayName ?? '').toLowerCase() === lower
        || (p.userName ?? '').toLowerCase() === lower
        || (p.displayName ?? '').toLowerCase().split(' ')[0] === lower
        || p.externalId.toLowerCase() === lower,
    );
    if (!hit) return rules('who_is', text(`I do not have anybody called "${q}". I only know the people your organisation has sent us.`));

    const manager = hit.managerExternalId
      ? people.find((p) => p.externalId === hit.managerExternalId)
      : null;

    const bits = [
      `${hit.displayName ?? hit.userName}${hit.title ? `, ${hit.title}` : ''}${hit.department ? `, in ${hit.department}` : ''}.`,
      manager
        ? `Reports to ${manager.displayName ?? manager.userName}.`
        : hit.managerExternalId
          /* The id resolved to nobody: said plainly rather than rendered as "no manager", which is a
             different and wrong fact. */
          ? `Their reporting line points at ${hit.managerExternalId}, who has not been sent to us.`
          : 'No reporting line has been sent for them.',
    ];
    return rules('who_is', text(bits.join(' ')));
  }

}
