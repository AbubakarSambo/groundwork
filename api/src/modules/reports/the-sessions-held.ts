/**
 * THE SESSIONS HELD, AND WHO ANSWERED EACH, AS A FACT FOR THE JUDGEMENT (final real-model check, follow-up 2). Grace ran a daily check-in and
 * answered all three of its sessions; the judgement, told only her promise of "daily check-ins", wrote that she had not held them. This is
 * the record's own count: how many sessions have been answered, on which days, and how many each person answered. Labels only, no names.
 */
export function theSessionsHeld(
  done: readonly { participantId: string; sessionNumber: number; completedAt: Date | string | null }[],
  people: readonly { participantId: string; who: string }[],
  zone = 'Africa/Nairobi',
): string {
  if (!done.length) return '';
  const sessions = [...new Set(done.map((c) => c.sessionNumber))].sort((a, b) => a - b);
  const day = (d: Date | string) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d));
  const firstDay = (n: number) => done.filter((c) => c.sessionNumber === n && c.completedAt).map((c) => new Date(c.completedAt as any)).sort((a, b) => a.getTime() - b.getTime())[0];
  const lines = sessions.map((n) => { const d = firstDay(n); return `  Check-in ${n} was held${d ? ` on ${day(d)}` : ''}.`; });
  const each = people.map((p) => {
    const mine = [...new Set(done.filter((c) => c.participantId === p.participantId).map((c) => c.sessionNumber))];
    return `  ${p.who} answered ${mine.length} of the ${sessions.length} check-ins.`;
  });
  return [`THE Check-ins HELD, read from the record. ${sessions.length} ${sessions.length === 1 ? 'check-in has' : 'check-ins have'} been held. Never say a check-in or a check-in was not held when it is here, and say who did not answer only from these counts.`, ...lines, ...each].join('\n');
}
