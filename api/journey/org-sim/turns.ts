import { Person } from './people';
import { GroundSpec } from './grounds';

/**
 * What each person actually types, given who they are.
 *
 * Scripted rather than improvised, for the same reason the earlier runs were:
 * without knowing what is true, "this person is drifting" cannot be judged
 * correct or invented. But scripted does not mean uniform. A HIGH person names
 * a number and a date unprompted; a BASIC person answers four words beside the
 * point; a defensive person answers the question they wish you had asked.
 *
 * The shapes here are the ones that break things:
 *   - the person who sounds fine every week and says nothing checkable,
 *   - the person doing the work who describes it as "fine",
 *   - the person genuinely blocked by something outside their control,
 *   - the person who does not know what the product's words mean and says so.
 *
 * A specific detail carries a session number so it cannot be confused with the
 * same person's answer three weeks earlier - that is what makes restated old
 * news detectable in the record afterwards.
 */

const pick = <T,>(arr: T[], n: number): T => arr[n % arr.length];

/** Something anyone could check later: a number, a date, a name. */
function concrete(p: Person, g: GroundSpec, s: number): string {
  const bank = [
    `I finished item ${s} of the ${g.subject.split(',')[0]} list on the ${(s % 28) + 1}st`,
    `Closed out ${s + 1} of the open questions with ${pick(['Priya', 'Tom', 'Dan', 'Ada'], s)} this week`,
    `Sent the written version to ${pick(['Priya', 'Tom', 'Dan', 'Ada'], s + 1)} on the ${(s % 28) + 2}nd, ${s * 3 + 4} pages`,
    `We agreed ${s + 2} of the ownership lines in writing on the ${(s % 27) + 3}rd`,
  ];
  return pick(bank, s);
}

/** True, and completely uncheckable. The commonest real answer. */
function vague(p: Person, s: number): string {
  const bank = [
    'Going well, no real problems',
    'Yeah all good, just getting on with it',
    'Same as last week really, steady',
    'Fine. Nothing to report',
    'Busy but it is moving',
  ];
  return pick(bank, s + p.key.length);
}

/** Opening line, coloured by style. */
function opener(p: Person, g: GroundSpec, s: number): string {
  if (p.level === 'HIGH') return `On ${g.subject}: ${concrete(p, g, s)}.`;
  if (p.level === 'MEDIUM') {
    return p.style === 'terse' ? vague(p, s) : `Mostly fine. ${s % 3 === 0 ? concrete(p, g, s) : vague(p, s)}.`;
  }
  return vague(p, s);
}

/** What they say when pressed for something specific. */
function underPressure(p: Person, g: GroundSpec, s: number): string {
  if (p.level === 'HIGH') return concrete(p, g, s + 1);
  if (p.level === 'MEDIUM') {
    if (p.style === 'defensive') return 'I mean, it is going fine. Is there a problem with how I am doing it?';
    if (p.style === 'terse') return s % 2 ? concrete(p, g, s) : 'Not much to add.';
    return concrete(p, g, s);
  }
  // BASIC: does not produce a specific even when asked plainly.
  if (p.style === 'distracted') return 'Sorry what was the question again';
  return 'Just the usual stuff really, nothing I can point to';
}

/** Blocker answer. Some people are genuinely blocked; most are not. */
function blocker(p: Person, g: GroundSpec, s: number): string {
  if (p.key === 'nate' && s <= Math.ceil(g.sessions / 2)) {
    return `Still waiting on the approval that sits outside the team - I have chased it twice and lined everything up so it moves the day it clears.`;
  }
  if (p.key === 'eric') return 'Nothing blocking. Though I would say the amount of checking-in is itself a cost.';
  if (p.level === 'BASIC') return 'No, all fine';
  if (p.level === 'HIGH') return s % 3 === 0 ? `Waiting on ${pick(['the budget line', 'sign-off', 'the spec'], s)} from ${g.lead}.` : 'Not blocked.';
  return 'Not really blocked.';
}

/** Where the product's own vocabulary lands or bounces. */
function jargonReaction(p: Person): string | null {
  if (p.jargon === 'confused') return 'Sorry, when you say "ground" do you mean this conversation or the project itself? I want to make sure I am answering the right thing.';
  if (p.jargon === 'put-off') return 'Before I answer more - who reads this? I want to know what it is being used for.';
  return null;
}

/**
 * A person's turns for one session. Four or five, which is roughly what someone
 * gives before they stop, and enough for a natural close to be possible.
 */
export function turnsFor(p: Person, g: GroundSpec, session: number): string[] {
  const out: string[] = [opener(p, g, session)];

  // Early on, the people who do not speak the product's language say so.
  const jr = jargonReaction(p);
  if (jr && session <= 2) out.push(jr);

  out.push(underPressure(p, g, session));
  out.push(blocker(p, g, session));

  // The lead of a ground carries what they owe other people.
  if (p.key === g.lead && session >= 2) {
    out.push(
      session < g.sessions - 1
        ? `I still owe the team the decision on ${pick(['scope', 'the budget', 'reporting lines'], session)}. It keeps slipping down my list.`
        : `I made the decision I had been putting off, later than I should have.`,
    );
  }

  // Final session: everyone reflects, and the weak one admits it.
  if (session === g.sessions && g.sessions > 1) {
    if (p.level === 'BASIC') out.push('Honestly I have not got as far as I should have. Nothing was blocking me.');
    else if (p.level === 'HIGH') out.push(`Finished at ${session * 2} of the things I set out to do. What I would change is starting the written part earlier.`);
    else out.push('Got most of it done. Some of it took longer than I thought.');
  }

  out.push(p.style === 'chatty' ? 'Anyway, that is probably more than you needed. That is me.' : 'That is it from me.');
  return out;
}
