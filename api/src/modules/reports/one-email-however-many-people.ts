import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
/**
 * WHEN A REVIEW FALLS DUE, THE MANAGER GETS THE REPORT.
 *
 * One email, whether it is one person or nine, with a link to each person's
 * report.
 *
 * THE REPORT IS UNCHANGED AND SAYS NOTHING ABOUT WHY IT ARRIVED. That is
 * deliberate and it is the whole design. A report that announced itself as
 * arriving for a probation decision would be read as a recommendation, and
 * whoever read it would go looking for one. It is the same record it always is;
 * only the timing and the bundling are new.
 *
 * NOTHING GOES OUT EMPTY. A manager with nothing to read is not emailed at all —
 * an email that says "no reports yet" trains somebody to stop opening them, and
 * then the one that matters is the one they skip.
 *
 * BUT A GAP IS NAMED. Where a review is due and the round has not released, the
 * email goes with the reports that exist and says who is still outstanding. A
 * manager who receives nothing assumes the system forgot; a manager who receives
 * four of five knows to ask about the fifth.
 */

export interface AReviewDue {
  personExternalId: string;
  displayName: string;
  dueOn: Date;
  kind: string;
}

export interface AReadableReport {
  groundId: string;
  label: string;
  /** Display names of the people it is about. */
  about: string[];
}

export interface TheEmail {
  subject: string;
  text: string;
  /** The reviews this covers, so they can be marked told and never told twice. */
  covers: string[];
}

/**
 * The email for one manager, or null when there is nothing worth sending.
 *
 * `linkTo` is passed rather than built here so that the one place a report URL
 * is constructed stays the one place. A second construction is how a link ends
 * up pointing at a transcript.
 */
export function theEmailForOneManager(input: {
  managerName: string;
  due: AReviewDue[];
  readable: AReadableReport[];
  linkTo: (groundId: string) => string;
}): TheEmail | null {
  if (input.due.length === 0) return null;

  const byPerson = new Map<string, AReadableReport[]>();
  for (const report of input.readable) {
    for (const name of report.about) {
      byPerson.set(name, [...(byPerson.get(name) ?? []), report]);
    }
  }

  const withSomething = input.due.filter((d) => (byPerson.get(d.displayName) ?? []).length > 0);
  const withNothing = input.due.filter((d) => (byPerson.get(d.displayName) ?? []).length === 0);

  /* Nothing to read for anybody. An email saying so trains somebody to stop
     opening them, and then the one that matters is the one they skip. */
  if (withSomething.length === 0) return null;

  const lines: string[] = [
    `${input.managerName},`,
    '',
    input.due.length === 1
      ? `A review is coming up for ${input.due[0].displayName} on ${asADate(input.due[0].dueOn)}.`
      : `Reviews are coming up for ${saidAsAList(input.due.map((d) => d.displayName))}.`,
    '',
  ];

  for (const person of withSomething) {
    lines.push(`${person.displayName} — ${person.kind}, ${asADate(person.dueOn)}`);
    for (const report of byPerson.get(person.displayName) ?? []) {
      lines.push(`  ${report.label}: ${input.linkTo(report.groundId)}`);
    }
    lines.push('');
  }

  if (withNothing.length > 0) {
    /* Named, because a manager who receives four of five and is told nothing
       about the fifth assumes there was nothing to say about them. */
    lines.push(
      `Nothing has been released yet for ${saidAsAList(withNothing.map((d) => d.displayName))}.`,
      '',
    );
  }

  lines.push(
    '---',
    'These are the reports from their check-ins, unchanged. They are an account of how the work went, from everybody who was in it.',
  );

  return {
    subject:
      input.due.length === 1
        ? `Review coming up: ${input.due[0].displayName}`
        : `Reviews coming up: ${input.due.length} people`,
    text: lines.join('\n'),
    /* Everybody the email mentions, including the ones with nothing to read —
       they were told, and telling them again next week helps nobody. */
    covers: input.due.map((d) => d.personExternalId),
  };
}

/** Reviews close enough to be worth an email, and not yet sent. */
export function whichAreDueSoon(
  due: (AReviewDue & { notifiedAt: Date | null })[],
  today: Date,
  withinDays: number,
): AReviewDue[] {
  const horizon = new Date(today.getTime() + withinDays * 86_400_000);
  return due.filter((d) => d.notifiedAt === null && d.dueOn >= startOfDay(today) && d.dueOn <= horizon);
}

export function saidAsAList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const asADate = (d: Date) =>
  whenItWas(d, 'full', 'UTC');

const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
