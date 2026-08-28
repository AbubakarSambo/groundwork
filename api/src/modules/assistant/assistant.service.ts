import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { route, whatICanDoWith } from './the-router-is-deterministic';
import { Reply, rules, text, picker } from './a-reply-is-a-payload-not-a-string';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { AnthropicService } from '../conversation/anthropic.service';
import { STYLE, STYLE_VERSION, safeToUse, composePrompt } from './the-model-words-it-and-nothing-more';
import { hasSlipped, theOneToRaise } from './what-somebody-said-they-would-do';
import { catchCommitment, resolveConfirmation, proposalSummary } from './something-said-in-passing';

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
    switch (routed.lane) {
      case 'what_you_can_see':
        return this.compose(await this.whatICanSee(organizationId));
      case 'what_am_i_on':
        return this.compose(await this.whatAmIOn(organizationId, personId));
      case 'who_is':
        return this.compose(await this.whoIs(organizationId, routed.subject ?? ''));
      case 'what_did_i_commit_to':
        return this.compose(await this.myCommitments(organizationId, personId));
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
  private async compose(reply: Reply): Promise<Reply> {
    const first = reply.blocks[0];
    if (!first || first.type !== 'text') return reply;
    const draft = first.body;

    try {
      const composed = await this.engine.respond(STYLE, [{ role: 'user', content: composePrompt(draft) }]);
      if (!safeToUse(draft, composed)) {
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
   * CONFIRM, RE-VERIFY, DELEGATE, AUDIT, READ BACK.
   *
   * The re-verification matters more than it looks: between the offer and the yes, the person may
   * have been deprovisioned, or their organisation disconnected. A parked action carries the
   * authorisation it had when it was offered, and that is exactly what must not be trusted.
   */
  private async resolveParked(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
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
      select: { title: true, target: true, measure: true, ownerExternalId: true, contributorExternalIds: true, dueDate: true },
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

    const line = (s: typeof all[number]) =>
      `- ${s.title}${s.target ? ` (target: ${s.target})` : ''}${s.dueDate ? `, due ${s.dueDate.toDateString()}` : ''}`;

    const parts: string[] = [];
    if (owned.length) parts.push(`You own ${owned.length}:`, ...owned.map(line));
    if (contributing.length) parts.push(`${parts.length ? '\n' : ''}You are a contributor on ${contributing.length}:`, ...contributing.map(line));
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
