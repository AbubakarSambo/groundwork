import type { ThePersonsRecord, ACoaching, AClaim, APromise } from './the-persons-record';

/**
 * A PERSON'S RECORD, IN PLAIN WORDS, FOR THE PERSON AND FOR THE LEAD (Groundwork does the managing, part 1).
 *
 * Each part says what happened, with the evidence (their own words and the day), and, where something needs work, what would change it,
 * in the behaviour and pattern library's own words. Never a score, never a label on the person. The person reads "you"; whoever runs the
 * check-in reads the person's first name. Who may read it is decided before this is called (board/my-work.ts and the reports controller):
 * this only writes the words.
 */

export interface APartOfTheRecord {
  /** What the part is about, as a heading. */
  heading: string;
  /** What happened, in one or two full sentences. */
  says: string;
  /** What would change it, where it needs work. Null where it does not. */
  toChange: string | null;
  /** The evidence: their own words with the day, one sentence each. */
  evidence: string[];
}

export interface ACoachingInWords {
  /** What Groundwork coached them on, and when. */
  said: string;
  /** Whether it worked, from the check-ins since. */
  since: string;
}

export interface TheRecordInWords {
  heading: string;
  note: string;
  parts: APartOfTheRecord[];
  coaching: ACoachingInWords[];
  coachingEmpty: string;
}

const NUMBER_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n === 0 ? 'no' : inWords(n)} ${n === 1 ? one : many}`;
const cap = (s: string) => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);
const quote = (s: string) => `“${String(s ?? '').trim().replace(/^[“"]|[”"]$/g, '')}”`;
const lowerFirst = (s: string) => (s && !/^[A-Z]{2,}|^I\b|^[A-Z][a-z]+ [A-Z]/.test(s) ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s);

interface Who { self: boolean; first: string }
const you = (w: Who) => (w.self ? 'you' : w.first);
const You = (w: Who) => (w.self ? 'You' : w.first);
const your = (w: Who) => (w.self ? 'your' : `${w.first}’s`);
const Your = (w: Who) => (w.self ? 'Your' : `${w.first}’s`);

/** One claim, with what shows it, for the person ("you") or for whoever runs the check-in (their first name). */
export function aClaimSaidFor(c: AClaim, who: { self: boolean; firstName: string }): string {
  return aClaimSaid(c, { self: who.self, first: who.firstName || 'This person' });
}

/** One promise, with what became of it, for the person or for whoever runs the check-in. */
export function aPromiseSaidFor(p: APromise, who: { self: boolean; firstName: string }): string {
  return aPromiseSaid(p, { self: who.self, first: who.firstName || 'This person' });
}

function aClaimSaid(c: AClaim, w: Who): string {
  const said = `On ${c.on} ${you(w)} said ${quote(c.said)}`;
  if (c.proven) return `${said} ${w.self ? (c.proofSays ?? 'Something on file') : String(c.proofSays ?? 'Something on file').replace(/\byou (added|typed)\b/, `${w.first} $1`)} shows it.`;
  if (c.takenBack) return `${said} On ${c.takenBack.on} ${you(w)} said ${quote(c.takenBack.said)}`;
  return `${said} Nothing on file shows it yet.`;
}

function aPromiseSaid(p: APromise, w: Who): string {
  const promised = quote(p.said);
  switch (p.outcome) {
    case 'kept on time': return `${cap(you(w))} promised ${promised} on ${p.madeOn}, and it was done${p.keptOn ? ` by ${p.keptOn}` : ''}.`;
    case 'kept late': return `${cap(you(w))} promised ${promised} for ${p.dueOn}, and it was done on ${p.keptOn}.`;
    case 'not done': return `${cap(you(w))} promised ${promised} on ${p.madeOn}, and said later it was not done.`;
    case 'late': return `${cap(you(w))} promised ${promised} for ${p.dueOn}, and nothing ${w.self ? 'you have' : `${w.first} has`} said since shows it done.`;
    default: return `${cap(you(w))} promised ${promised} on ${p.madeOn}${p.dueOn ? `, for ${p.dueOn}` : ''}.`;
  }
}

/** The record's parts, each only where the record holds something for it. */
export function theRecordInWords(r: ThePersonsRecord, coaching: readonly ACoaching[], who: { self: boolean; firstName: string }, checkInName: string): TheRecordInWords {
  const w: Who = { self: who.self, first: who.firstName || 'This person' };
  const s = r.summary;
  const parts: APartOfTheRecord[] = [];

  /* What they said, and what shows it. */
  if (s.claims) {
    const proven = s.proven;
    const times = s.claims === 1 ? 'once' : s.claims === 2 ? 'twice' : `${inWords(s.claims)} times`;
    const says = s.claims === 1 && !proven
      ? `${You(w)} said once that something was sold, paid or signed, and nothing on file shows it${s.takenBack ? `. ${You(w)} took it back later` : ' yet'}.`
      : proven === s.claims
      ? `${You(w)} said ${times} that something was sold, paid or signed, and ${s.claims === 1 ? 'it has' : s.claims === 2 ? 'both have' : 'every one has'} proof on file.`
      : `${You(w)} said ${times} that something was sold, paid or signed. ${proven ? `${cap(inWords(proven))} of them ${proven === 1 ? 'has' : 'have'}` : 'None of them has'} proof on file${s.takenBack ? `, and ${w.self ? 'you' : w.first} took ${s.takenBack === 1 ? 'one' : inWords(s.takenBack)} back later` : ''}.`;
    parts.push({
      heading: `What ${you(w)} said and what shows it`,
      says,
      toChange: (s.onlySaid + s.takenBack >= 2 && proven / s.claims < 0.75) || (s.onlySaid + s.takenBack >= 1 && proven / s.claims < 0.5) ? `Adding the photo, slip or link when ${you(w)} ${w.self ? 'say' : 'says'} something is done would change this.` : null,
      evidence: r.claims.map((c) => aClaimSaid(c, w)),
    });
  }

  /* Promises. */
  const due = r.promises.filter((p) => p.outcome !== 'open');
  if (due.length) {
    const kept = s.keptOnTime + s.keptLate;
    const bits = [
      due.length === 1
        ? (kept ? `${You(w)} kept the one promise that came due${s.keptLate ? ', late' : ''}.` : `${You(w)} made one promise that came due, and it was not kept.`)
        : kept === 0
          ? `${due.length === 2 ? 'Neither' : 'None'} of the ${plural(due.length, 'promise')} ${w.self ? 'you made' : `${w.first} made`} that came due was kept.`
          : `${You(w)} kept ${inWords(kept)} of the ${plural(due.length, 'promise')} that came due${s.keptLate ? `, ${inWords(s.keptLate)} of them late` : ''}.`,
      due.length === 1 ? (s.notDone ? `${You(w)} said later it was not done.` : s.late ? `It is past its day, with nothing said about it yet.` : '') : '',
      due.length > 1 && s.notDone ? `${cap(inWords(s.notDone))} ${s.notDone === 1 ? 'was' : 'were'} not done.` : '',
      due.length > 1 && s.late ? `${cap(inWords(s.late))} ${s.late === 1 ? 'is' : 'are'} past ${s.late === 1 ? 'its' : 'their'} day with nothing said about ${s.late === 1 ? 'it' : 'them'} yet.` : '',
    ].filter(Boolean);
    parts.push({
      heading: 'Promises',
      says: bits.join(' '),
      toChange: s.late + s.notDone > kept ? 'Promising less, and saying early when a date will move, would change this.' : s.late ? `Saying what happened to ${s.late === 1 ? 'it' : 'them'} in ${your(w)} next check-in would change this.` : null,
      evidence: [...due.filter((p) => p.outcome === 'late'), ...due.filter((p) => p.outcome !== 'late')].map((p) => aPromiseSaid(p, w)),
    });
  }

  /* Figures that changed. A sale or payment taken back is said once, with the claim it took back, above. */
  const figures = r.changes.filter((c) => c.what === 'units');
  if (figures.length) {
    const changed = figures.filter((c) => !c.putRight);
    const putRight = figures.filter((c) => c.putRight);
    const says = changed.length
      ? `${changed.length === 1 ? 'One figure' : `${cap(inWords(changed.length))} figures`} ${w.self ? 'you gave' : `${w.first} gave`} changed from one check-in to the next, with nothing said about why.`
      : `${You(w)} put ${putRight.length === 1 ? 'a figure' : 'figures'} right ${w.self ? 'yourself' : 'without being asked'}.`;
    parts.push({
      heading: 'Figures that changed',
      says,
      toChange: changed.length ? `Saying so ${w.self ? 'yourself' : 'at once'} when a figure changes, with what shows the new one, would change this.` : null,
      evidence: figures.map((c) => (c.putRight
        ? `${You(w)} put the figure for ${c.about} right ${w.self ? 'yourself' : 'without being asked'}, from ${c.from} units to ${c.to}, on ${c.toOn}.`
        : `On ${c.fromOn} ${you(w)} said ${c.from} units for ${c.about}, and on ${c.toOn} ${you(w)} said ${c.to} units.`)),
    });
  }

  /* Where the time went, on a sales check-in. */
  const notNow = r.focus.filter((f) => f.canBuy === 'not now');
  if (notNow.length) {
    const talked = notNow.filter((f) => f.sessions.length);
    parts.push({
      heading: `Where ${your(w)} time went`,
      says: talked.length
        ? `${talked.map((f) => f.deal).join(' and ')} cannot buy now, and ${you(w)} talked about ${talked.length === 1 ? 'it' : 'them'} in ${plural(new Set(talked.flatMap((f) => f.sessions)).size, 'check-in')} after that was on record.`
        : `${notNow.map((f) => f.deal).join(' and ')} cannot buy now, and ${you(w)} ${w.self ? 'have' : 'has'} not spent a check-in on ${notNow.length === 1 ? 'it' : 'them'} since.`,
      toChange: talked.some((f) => f.sessions.length >= 3) ? 'Putting that time into a deal that can buy would change this.' : null,
      evidence: notNow.map((f) => `On ${f.becauseOn} ${you(w)} said ${quote(f.because ?? '')}`),
    });
  }

  /* Blockers. */
  if (r.blockers.length) {
    const tried = s.blockersTriedFirst;
    parts.push({
      heading: 'Blockers',
      says: r.blockers.length === 1
        ? `${You(w)} raised one blocker, and ${tried ? 'said' : 'did not say'} what ${w.self ? 'you had' : 'had been'} tried first.`
        : `${You(w)} raised ${plural(r.blockers.length, 'blocker')} and said what ${w.self ? 'you had' : 'had been'} tried first on ${tried === r.blockers.length ? 'all of them' : `${inWords(tried)} of them`}.`,
      toChange: r.blockers.length >= 2 && tried / r.blockers.length < 0.5 ? `Trying one thing before raising a blocker, and saying what was tried, would change this.` : null,
      evidence: r.blockers.map((b) => `On ${b.on} ${you(w)} raised a blocker, waiting ${/^to\b/i.test(b.what) ? '' : 'for '}${lowerFirst(b.what.replace(/[.\s]+$/, ''))}, ${b.triedFirst ? (b.tried ? `and said what had been tried, ${quote(b.tried)}` : 'and said what had been tried') : `and did not say what ${w.self ? 'you had' : 'had been'} tried first`}.`),
    });
  }

  /* Check-ins. */
  if (s.checkInsDue) {
    const timing = s.checkInsOnTime === s.checkInsDone ? 'all on time' : `${inWords(s.checkInsOnTime)} of them on time`;
    parts.push({
      heading: `${Your(w)} check-ins`,
      says: `${You(w)} did ${inWords(s.checkInsDone)} of ${plural(s.checkInsDue, 'check-in')}${s.checkInsDone ? `, ${timing}` : ''}. ${cap(inWords(s.checkInsSpecific))} of them named the item, what changed and the day.`,
      toChange: s.checkInsDue >= 3 && (s.checkInsDone / s.checkInsDue < 0.8 || s.checkInsOnTime / s.checkInsDue < 0.7 || (s.checkInsDone ? s.checkInsSpecific / s.checkInsDone : 0) < 0.7)
        ? 'Naming the item, what changed and the day, every time, would change this.' : null,
      evidence: r.checkIns.filter((c) => !c.done || !c.onTime || !c.specific).map((c) => `${c.on ? `On ${c.on}` : `In session ${c.sessionNumber}`}, ${!c.done ? 'the check-in was not done' : !c.onTime ? 'the check-in was done more than a day after it opened' : 'the check-in did not name the item, what changed and the day'}.`),
    });
  }

  return {
    heading: w.self ? `Your record in ${checkInName}` : `${w.first}’s record in ${checkInName}`,
    note: w.self
      ? 'This is read from what you said in your check-ins and what is on file. It changes only when something new comes in.'
      : `This is read from what ${w.first} said in ${w.first}’s check-ins and what is on file. It changes only when something new comes in.`,
    parts,
    coaching: coaching.map((c) => theCoachingInWords(c, w)),
    coachingEmpty: w.self ? 'Groundwork has not coached you on anything yet.' : `Groundwork has not coached ${w.first} on anything yet.`,
  };
}

/** One coaching, what it said and when, and whether it worked. */
export function theCoachingInWords(c: ACoaching, who: Who | { self: boolean; firstName: string }): ACoachingInWords {
  const w: Who = 'first' in who ? who : { self: who.self, first: who.firstName || 'This person' };
  const line = c.said.trim();
  const said = `After ${your(w)} check-in on ${c.givenOn}, Groundwork told ${you(w)} ${quote(line)}`;
  const since = !c.since || !c.outcome
    ? `No check-in since then shows whether it has changed yet.`
    : c.outcome === 'better'
      ? `${theThing(c, w)} has got better since then.`
      : c.outcome === 'worse'
        ? `${theThing(c, w)} has got worse since then.`
        : `${theThing(c, w)} has stayed the same since then.`;
  return { said, since };
}

const theThing = (c: ACoaching, w: Who) => ({
  proof: `Backing what ${you(w)} ${w.self ? 'say' : 'says'} with proof`,
  changes: 'Saying when a figure changes',
  promises: 'Keeping promises',
  blockers: 'Trying something before raising a blocker',
  focus: 'Spending time on deals that can buy',
  'check-ins': `How specific and on time ${your(w)} check-ins are`,
}[c.about]);

/**
 * THE SAME PERSON IN THEIR OTHER CHECK-INS IN THE ORGANISATION, for the person alone (each person's load across check-ins is private,
 * always). One sentence for each other check-in, from its stored record.
 */
export function acrossTheirCheckIns(others: readonly { label: string; record: ThePersonsRecord }[]): string[] {
  return others.map(({ label, record }) => {
    const s = record.summary;
    const kept = s.keptOnTime + s.keptLate;
    const due = s.keptOnTime + s.keptLate + s.notDone + s.late;
    const bits = [
      due ? `you kept ${inWords(kept)} of ${plural(due, 'promise')} that came due` : '',
      s.claims ? `${inWords(s.proven)} of the ${plural(s.claims, 'thing')} you said ${s.claims === 1 ? 'was' : 'were'} sold, paid or signed ${s.proven === 1 ? 'has' : 'have'} proof on file` : '',
      s.checkInsDue ? `you did ${inWords(s.checkInsDone)} of ${plural(s.checkInsDue, 'check-in')}` : '',
    ].filter(Boolean);
    if (!bits.length) return `In ${label}, nothing has come in yet.`;
    const last = bits.pop()!;
    return `In ${label}, ${bits.length ? `${bits.join(', ')} and ${last}` : last}.`;
  });
}
