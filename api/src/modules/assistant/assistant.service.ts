import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { route, whatICanDoWith } from './the-router-is-deterministic';
import { Reply, rules, text, picker } from './a-reply-is-a-payload-not-a-string';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { AnthropicService } from '../conversation/anthropic.service';
import { STYLE, STYLE_VERSION, safeToUse, composePrompt } from './the-model-words-it-and-nothing-more';

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
    const routed = route(message);
    switch (routed.lane) {
      case 'what_you_can_see':
        return this.compose(await this.whatICanSee(organizationId));
      case 'what_am_i_on':
        return this.compose(await this.whatAmIOn(organizationId, personId));
      case 'who_is':
        return this.compose(await this.whoIs(organizationId, routed.subject ?? ''));
      default: {
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
