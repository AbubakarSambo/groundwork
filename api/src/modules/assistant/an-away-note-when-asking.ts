/** WHO IS AWAY, SAID WHEN ASKING FOR SOMETHING FROM THEM (chat is king, section 8). Dates only, from approved leave the asker may already read. */
export interface AnAwayRow { name: string; startsOn: string; endsOn: string }

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${months[m - 1]}`; };

/** One sentence to put after what is being asked of somebody, or an empty string when they are not off in the next two weeks. */
export function anAwayNote(name: string, rows: AnAwayRow[]): string {
  const first = name.trim().split(/\s+/)[0];
  const mine = rows.find((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? rows.find((r) => r.name.trim().split(/\s+/)[0].toLowerCase() === first.toLowerCase());
  if (!mine) return '';
  return mine.startsOn === mine.endsOn
    ? `Just so you know, ${first} is off on ${day(mine.startsOn)}, from approved leave, so the answer may take longer.`
    : `Just so you know, ${first} is off from ${day(mine.startsOn)} to ${day(mine.endsOn)}, from approved leave, so the answer may take longer.`;
}
