import { aDaySaidInFull } from '../board/a-day-said-in-full';
import { WhatIsTrue, Source, MOST_OF_EACH } from './what-is-true-for-this-person';
import { WHAT_THE_ASSISTANT_CAN_DO } from './what-the-assistant-can-do';
import { whatIStillCannotDo } from './what-is-not-offered-in-chat';

/**
 * SOMEWHERE TO SEE WHAT THE ASSISTANT CAN SEE.
 *
 * Every fact already carries where it came from — `what-is-true-for-this-person.ts`
 * makes that rule one — but a citation nobody can go and look at is a citation on
 * trust. This is the looking. It shows a person the exact material their next
 * answer will be built from, item by item, before they ask anything.
 *
 * TWO THINGS IT IS NOT.
 *
 *   IT IS NOT A SECOND QUERY. It is handed the assembly the assistant is handed,
 *   and turns it into something readable. If it fetched its own rows it would be
 *   a page about a different set of facts than the one being answered from, and
 *   the day the two disagreed the page would be the more convincing of the two
 *   and the wrong one.
 *
 *   IT IS NOT A SETTINGS SCREEN. Nothing here turns anything off. What the
 *   assistant may read is decided by whose row it is, in the queries, and a
 *   toggle on this page would be a second answer to a question that already has
 *   one.
 *
 * WHAT WAS LEFT OUT IS SHOWN AS LOUDLY AS WHAT WAS KEPT. A bounded answer that
 * looks whole is the failure this exists to catch: somebody reads four objectives
 * and concludes those are their objectives, when there are twenty-six.
 */

export interface SeenGroup {
  /** In the words a person reads. */
  what: string;
  from: Source;
  /** How many were handed over. Never a percentage of anything. */
  howMany: number;
  /** Each one, said in a line. The whole point is being able to look. */
  each: string[];
}

export interface WhatICanSee {
  about: { displayName: string | null; externalId: string };
  groups: SeenGroup[];
  /** What the bound cut, in the same words the assistant would use about it. */
  leftOut: string[];
  /** The bound itself, said out loud, so the trimming is explainable rather than mysterious. */
  mostOfEach: number;
  canDo: string[];
  cannotDo: string[];
}

const day = (d: Date | null) => (d ? aDaySaidInFull(d) : null);

/** Pure. Everything below is a rearrangement of what came in — nothing is fetched, nothing is added. */
export function whatICanSee(truth: WhatIsTrue): WhatICanSee {
  const groups: SeenGroup[] = [
    {
      what: 'Objectives and projects you are on',
      from: truth.objectives.from,
      howMany: truth.objectives.value.length,
      each: truth.objectives.value.map((o) => {
        const measure = o.measure && o.target ? `${o.measure}: ${o.target}` : o.measure ?? o.target;
        const due = day(o.dueDate);
        return [
          o.title,
          o.theirs ? 'yours' : 'you contribute',
          measure,
          due ? `due ${due}` : null,
        ].filter(Boolean).join(' - ');
      }),
    },
    {
      what: 'Things you said you would do',
      from: truth.commitments.from,
      howMany: truth.commitments.value.length,
      each: truth.commitments.value.map((c) =>
        [c.text, c.dueSaid, c.state].filter(Boolean).join(' - '),
      ),
    },
    {
      what: 'Check-ins that are yours right now',
      from: truth.sessions.from,
      howMany: truth.sessions.value.length,
      each: truth.sessions.value.map((s) => `${s.label} - ${s.standing}`),
    },
    {
      what: 'What your organisation has written down',
      from: truth.decisions.from,
      howMany: truth.decisions.value.length,
      each: truth.decisions.value.map((d) => d.title),
    },
  ];

  return {
    about: { displayName: truth.person.displayName, externalId: truth.person.externalId },
    groups,
    leftOut: truth.trimmed,
    mostOfEach: MOST_OF_EACH,
    canDo: WHAT_THE_ASSISTANT_CAN_DO.map((c) => c.does),
    cannotDo: whatIStillCannotDo(),
  };
}
