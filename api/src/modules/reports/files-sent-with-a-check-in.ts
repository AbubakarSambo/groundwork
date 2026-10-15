/**
 * WHICH FILES WERE SENT WITH A CHECK-IN (B-103).
 *
 * A file, a photo or a location pin is kept on the check-in's ground against the person who sent it,
 * the same way from the app and from WhatsApp; there is no column naming the check-in. It is with
 * a check-in when its sender sent it while that check-in was open: from when they started it until
 * they finished it, or until now while it is still open. The same rule the checkability read uses
 * (theyAttachedADocumentIn in the conversation service).
 */
export interface AFileKept { participantId: string | null; createdAt?: Date | string | null }
export interface ACheckInOpen { participantId: string; startedAt?: Date | string | null; completedAt?: Date | string | null }

export function filesSentWith(files: AFileKept[], checkIns: ACheckInOpen[], now: Date = new Date()): number {
  const t = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : NaN);
  return files.filter((f) => {
    const at = t(f.createdAt);
    if (!f.participantId || Number.isNaN(at)) return false;
    return checkIns.some((c) => c.participantId === f.participantId
      && !Number.isNaN(t(c.startedAt)) && at >= t(c.startedAt)
      && at <= (Number.isNaN(t(c.completedAt)) ? now.getTime() : t(c.completedAt)));
  }).length;
}
