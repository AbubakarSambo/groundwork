/**
 * THE REAL SEAMS BEHIND THE YEAR-END WORK'S PORTS (Ebele, increment 4). Mail goes through EmailService (the one door), and WhatsApp through
 * WhatsAppService.sendFor (the window and template gate, the night, the day's one message, STOP). Nothing here reaches either provider
 * by another way. A WhatsApp message held for the night counts as taken, because it will go in the morning from the held queue; one the gate
 * refused does not, so the caller tries another day and the record never says it went.
 */
import type { EmailService } from '../email/email.service';
import type { WhatsAppService } from '../whatsapp/whatsapp.service';
import { QUIET_HOURS_HELD } from '../whatsapp/quiet-hours-are-the-organisations';
import { theAddressForHer } from '../executive-onboarding/onboard-an-executive';
import type { OwnerPorts } from './the-year-end-owner';

const HELD = QUIET_HOURS_HELD(new Date(0)).split(';')[0];

export function theRealPorts(email: EmailService, whatsapp: WhatsAppService, prisma?: any): OwnerPorts {
  return {
    email: { sendTheYearEndFiles: (to, subject, text, files, sendKey, replyTo, answeringNow) => email.sendTheYearEndFiles(to, subject, text, files, sendKey, replyTo, answeringNow) },
    whatsapp: {
      send: async (a) => {
        const r = await whatsapp.sendFor(a.organizationId, a.phone, a.text, { kind: a.kind });
        return { sent: !!r.sent || String(r.error ?? '').startsWith(HELD) };
      },
    },
    progressEmail: (to, subject, text) => email.sendTheYearEndProgress(to, subject, text),
    /* A question mailed to somebody can be answered by replying: it carries the assistant's address (Ebele round 1, H5). */
    askByEmail: async (a) => email.sendTheRoutineMessageByEmail(a.to, a.subject, a.text, null, null, undefined, prisma ? await theAddressForHer(prisma, a.organizationId).catch(() => undefined) : undefined, a.askKey),
  };
}
