/**
 * "YOUR REPORT IS READY" GOES AT MOST TWICE A PERSON FOR A REPORT (decision 117, D14, Hafsah, 8 October).
 *
 * The reminder repeated every three days for as long as the person had not "activated" their report, and nothing in the screens
 * activates one any more, so it could only repeat: seven people on one check-in were sent it three times in ten days, about a report
 * released months before. Now at most two go for a person and a report. After that the report appears only in the person's regular
 * summary, "your week" (engagement/the-participants-week.ts).
 *
 * ONCE, NOT TWICE (Hafsah, 19 October: "Stop the second "your report is ready" reminder. Don't start recording reads."). In the messages
 * test Brian was sent "Your report for "Litigation team daily" is ready to view" and Aisha the same, with the same words, on two days
 * running. The first stays; no second goes. Nothing new is recorded about who opened what.
 *
 * Counted from what was really sent, the record of messages (`Notification`), by this sender, to this address, with this subject, so
 * it needs no new column and survives a restart. A message held for quiet hours is counted when it goes, not when it is held.
 */
export const THE_MOST_REPORT_READY_REMINDERS = 1;
export const REPORT_READY_REMINDER_SENDER = 'sendActivationRevealReminder';

/** The one subject of the reminder, so that the sender and the count read the same words. */
export const reportReadyReminderSubject = (groundLabel: string) => `Your report for "${groundLabel}" is ready to view`;

export async function howManyReportReadyRemindersWereSent(
  prisma: { notification: { count: (args: any) => Promise<number> } },
  email: string,
  groundLabel: string,
  /** Only those sent since this moment, for the three-day wait between two of them. */
  since?: Date,
): Promise<number> {
  return prisma.notification.count({
    where: {
      channel: 'email',
      sender: REPORT_READY_REMINDER_SENDER,
      outcome: 'sent',
      toAddress: { equals: email, mode: 'insensitive' },
      subject: reportReadyReminderSubject(groundLabel),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
  });
}
