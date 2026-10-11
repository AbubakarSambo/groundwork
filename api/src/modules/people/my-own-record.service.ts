import { withoutCommitmentsFromGoalsNotToldYet } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { forTheirOwnEyes, whyWithheld } from './what-i-can-see-about-myself';

/**
 * EVERYTHING THIS PRODUCT HOLDS ABOUT ONE PERSON, ASSEMBLED FOR THEM.
 *
 * There was already a GDPR export, and it was honest about what it covered: check-ins, record
 * entries, grounds. Every org-scoped record built since - commitments, contributions, findings,
 * handoffs, onboarding, suggested conversations - was invisible to it, because those are keyed to a
 * person's external id and that export walks participants.
 *
 * So somebody exercising a subject-access request would have received a real-looking document that
 * omitted most of what the product knows about them, and nothing anywhere would have said so. That
 * is worse than having no export: it is a wrong answer to a legal question, signed.
 */
@Injectable()
export class MyOwnRecordService {
  private readonly logger = new Logger(MyOwnRecordService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Their external id, resolved from the account they are signed in as.
   *
   * By email, which is the only thing a `User` and a `Person` reliably share. Somebody with no
   * matching Person has no org-scoped record at all, which is a real answer rather than an error.
   */
  private async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, organizationId: true },
    });
    if (!user?.email) throw new NotFoundException('No account found.');
    const person = await this.prisma.person.findFirst({
      where: { organizationId: user.organizationId, email: user.email },
      select: { externalId: true, timezone: true },
    });
    return { organizationId: user.organizationId, email: user.email, externalId: person?.externalId ?? null };
  }

  async orgScopedRecord(userId: string) {
    const { organizationId, email, externalId } = await this.me(userId);
    if (!externalId) {
      return {
        externalId: null,
        note: 'Your sign-in is not linked to a directory record here, so none of the organisation-wide '
          + 'material applies to you. What is in your check-ins is covered by the other export.',
        commitments: [], contributions: [], findings: [], handoffs: [],
        onboarding: [], suggestedConversations: [], emailPreferences: null,
        withheld: [],
      };
    }

    const [commitments, contributions, findings, onboarding, suggestions, prefs] = await Promise.all([
      this.prisma.commitment.findMany({
        where: { organizationId, personExternalId: externalId },
        select: { text: true, state: true, dueSaid: true, dueAt: true, statedAt: true, resolvedAt: true, sourcePersonObjectiveId: true },
        orderBy: { statedAt: 'asc' },
      }).then(async (rows) => (await withoutCommitmentsFromGoalsNotToldYet(this.prisma, rows)).map(({ sourcePersonObjectiveId: _source, ...shown }) => shown)),
      this.prisma.contribution.findMany({
        where: { organizationId, personExternalId: externalId },
        /*
         * The WEIGHT of a REFERENCED contribution is how many distinct colleagues described them
         * doing the work - a count that was deliberately never stored as a list. It is theirs to
         * see: it is about them, and it cannot be turned back into who said it.
         */
        select: { subjectExternalId: true, kind: true, weight: true, firstSeenAt: true, lastSeenAt: true },
      }),
      this.prisma.detectorResult.findMany({
        where: { organizationId, personExternalId: externalId },
        select: { key: true, severity: true, subjectExternalId: true, evidence: true,
          firstSeenAt: true, lastSeenAt: true, resolvedAt: true },
      }),
      this.prisma.onboardingStatus.findMany({
        where: { organizationId, personExternalId: externalId },
        select: { state: true, completedAt: true, gate: { select: { key: true, name: true, required: true } } },
      }),
      /*
       * Suggestions PUT TO THEM, not suggestions about them. A PIP proposed to their manager is not
       * theirs to read - telling somebody a performance conversation has been suggested about them,
       * through a data export, before their manager has decided anything, is the worst possible way
       * for them to learn it.
       */
      this.prisma.scenarioCandidate.findMany({
        where: { organizationId, proposedToPersonExternalId: externalId },
        select: { scenario: true, state: true, proposedAt: true, resolvedAt: true, confidence: true },
      }),
      this.prisma.emailPreference.findUnique({
        where: { organizationId_personExternalId: { organizationId, personExternalId: externalId } },
        select: { roundDigest: true, nudges: true, quietBeforeHour: true, quietAfterHour: true,
          unsubscribedAt: true },
      }),
    ]);

    /* Handoffs are ground-scoped and matched by email, in both directions - one they are waiting on
       and one somebody is waiting on them for are both about them. */
    const handoffs = await this.prisma.groundDependency.findMany({
      where: {
        ground: { organizationId },
        OR: [{ fromParticipant: { email } }, { onParticipant: { email } }],
      },
      select: { what: true, status: true, createdAt: true, clearedAt: true,
        ground: { select: { label: true } } },
    });

    const assembled = {
      externalId,
      commitments,
      contributions,
      findings,
      handoffs,
      onboarding,
      suggestedConversations: suggestions,
      emailPreferences: prefs,
    };

    const { value, withheld } = forTheirOwnEyes(assembled);
    return { ...value, withheld, whyWithheld: whyWithheld(withheld) };
  }
}
