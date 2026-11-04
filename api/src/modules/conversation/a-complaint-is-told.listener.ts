import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { GroundworkEvents, type AssessmentReadyEvent } from '../../common/events';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { theAssessmentIn } from './the-assessment';
import { theDayInWords } from '../board/the-day-in-words';
import { whoHearsAComplaintAbout, theComplaintAsTheyReadIt, theComplaintsWords } from './a-complaint-about-the-lead';

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nameOf = (u: any, given?: string | null) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || (given ?? '').trim();

/**
 * A COMPLAINT ABOUT THE LEAD REACHES WHOEVER HEARS IT (Hafsah, 3 November 2026), once, when the conversation's assessment is ready: by
 * email to the HR person, or each admin, who is neither the lead nor the person (a-complaint-about-the-lead.ts). Never to the lead.
 * When nobody hears it, nothing is sent; the person was told so in the conversation.
 */
@Injectable()
export class AComplaintIsToldListener {
  private readonly logger = new Logger(AComplaintIsToldListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly email?: EmailService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  @OnEvent(GroundworkEvents.ASSESSMENT_READY)
  async onAssessmentReady(event: AssessmentReadyEvent): Promise<{ told: number }> {
    try {
      const row: any = await (this.prisma as any).checkIn.findUnique({
        where: { id: event.checkInId },
        select: {
          sessionReport: true, completedAt: true,
          participant: { select: { userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
          ground: { select: { label: true, initiatorId: true, organizationId: true, initiator: { select: { firstName: true, lastName: true } }, organization: { select: { name: true } } } },
        },
      });
      const words = theComplaintsWords(theAssessmentIn(row?.sessionReport));
      if (!row || !words.length || !this.email) return { told: 0 };
      const people = await whoHearsAComplaintAbout(this.prisma, { organizationId: row.ground.organizationId, leadUserId: row.ground.initiatorId, personUserId: row.participant?.userId ?? null });
      const base = (this.config?.get<string>('resend.frontendUrl') || '').replace(/\/$/, '');
      const about = {
        personName: nameOf(row.participant?.user, row.participant?.nameGiven) || 'Somebody on the team',
        leadName: nameOf(row.ground.initiator) || 'their lead',
        checkIn: row.ground.label ?? null,
        on: row.completedAt ? theDayInWords(new Date(row.completedAt)) : null,
        organisation: row.ground.organization?.name ?? null,
      };
      let told = 0;
      for (const p of people) {
        if (!p.email) continue;
        const m = theComplaintAsTheyReadIt(p, about, words);
        const r = await this.email.sendTeamAlert(p.email, m.subject, m.lines.map(escape), 'Open Groundwork', `${base}/today`);
        if (r?.sent) told += 1;
      }
      return { told };
    } catch (err: any) {
      this.logger.warn(`A complaint in check-in ${event.checkInId} could not be told: ${err?.message ?? err}`);
      return { told: 0 };
    }
  }
}
