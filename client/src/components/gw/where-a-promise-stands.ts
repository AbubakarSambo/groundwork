/**
 * WHERE A PROMISE STANDS, FOR SOMEBODY LOOKING AT THE RECORD.
 *
 * The Context page listed what was agreed and could not say whether any of it had happened, so it
 * read as a list of sentences rather than as a record you return to. Everything below reads only
 * what somebody wrote down - a date they named, a status somebody set - and refuses to imply
 * anything else.
 *
 * NOTHING HERE IS A JUDGEMENT ON A PERSON. "Past its date" is a fact about a calendar. Whether that
 * means anything at all is the report's business, where the four explanations live and where a
 * blocker can outrank a date - and it is deliberately not decided on a list.
 */

export interface Standing {
  dueDate?: string | Date | null;
  dueSaid?: string | null;
  status?: string | null;
}

export type Stand =
  | { tone: 'done'; says: string }
  | { tone: 'ended'; says: string }
  | { tone: 'late'; says: string }
  | { tone: 'due'; says: string }
  | { tone: 'quiet'; says: string }
  | { tone: 'none'; says: null };

/** Whole days between two dates, positive when the first is later. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * How this reads on the page.
 *
 * `now` is passed in rather than read, so a test can say what day it is and so two panels rendering
 * a second apart cannot disagree.
 *
 * `whoSaid` is only used for the one branch where what is quoted is somebody's own words
 * (`o.dueSaid`, with no structured `dueDate` behind it) - group 3's review, batch A fault 2. Two
 * faults in that one sentence: it always said "They said", even on the reader's own row, where the
 * rest of the page already calls it "You"; and it added "- no date agreed" to a quote that can
 * itself be a date ("9 October" is a date, said in words rather than picked from a calendar), which
 * told the reader the opposite of what they had just read.
 */
export function whereItStands(o: Standing, now: Date, whoSaid?: { isMine: boolean; name: string }): Stand {
  const status = (o.status ?? 'OPEN').toUpperCase();

  /*
   * ENDED THINGS FIRST, and CHANGED is deliberately its own word. An expectation that moved is not
   * one that was missed, and a page that shows them the same way makes the unfairest reading the
   * easy one.
   */
  if (status === 'MET') return { tone: 'done', says: 'Done' };
  if (status === 'DROPPED') return { tone: 'ended', says: 'No longer expected' };
  if (status === 'CHANGED') return { tone: 'ended', says: 'Replaced by something else' };


  if (!o.dueDate) {
    /*
     * No date ON RECORD, which is most of them - but `dueSaid` can itself be a date, said in words
     * rather than entered as one, so this never claims "no date agreed" over somebody's own words.
     */
    if (!o.dueSaid) return { tone: 'none', says: null };
    const who = whoSaid?.isMine ? 'You' : (whoSaid?.name ?? 'They');
    return { tone: 'quiet', says: `${who} said "${o.dueSaid}"` };
  }

  const due = new Date(o.dueDate);
  const days = daysBetween(due, now);

  if (days < 0) {
    const late = Math.abs(days);
    return { tone: 'late', says: late === 1 ? 'Past its date by a day' : `Past its date by ${late} days` };
  }
  if (days === 0) return { tone: 'due', says: 'Due today' };
  if (days === 1) return { tone: 'due', says: 'Due tomorrow' };
  if (days <= 7) return { tone: 'due', says: `Due in ${days} days` };
  return { tone: 'quiet', says: `Due ${due.toISOString().slice(0, 10)}` };
}

/**
 * WHAT IS OUTSTANDING, IN ONE LINE.
 *
 * The line a lead reads before a conversation. It counts and never characterises: three past their
 * date is a number, and what it means is not this component's business.
 *
 * Returns null when there is nothing to say, which is the state a healthy check-in is in most of
 * the time. A panel that always has a warning in it is one people stop reading.
 */
export function whatIsOutstanding(items: Standing[], now: Date): string | null {
  const open = items.filter((i) => (i.status ?? 'OPEN').toUpperCase() === 'OPEN');
  const late = open.filter((i) => whereItStands(i, now).tone === 'late').length;
  const undated = open.filter((i) => !i.dueDate).length;

  const parts: string[] = [];
  if (late) parts.push(`${late} past ${late === 1 ? 'its date' : 'their dates'}`);
  if (undated) parts.push(`${undated} with no date agreed`);
  if (!parts.length) return null;

  return `${parts.join(', ')}. Worth a look before the next conversation.`;
}
