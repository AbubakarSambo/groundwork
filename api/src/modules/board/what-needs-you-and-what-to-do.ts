/**
 * WHAT NEEDS YOU, AND WHAT YOU CAN DO ABOUT EACH ONE (screens request 112 b; the prototype's B5,
 * board-as-lead.txt: "Decide whether a price range counts as a budget", with "Yes, it counts" and "No";
 * "Samuel has chased the same 5 leads for 3 check-ins", with "Ask him").
 *
 * Each item under "What needs you in this check-in" (`leadActions` and `decisions`) gets `action`, to the
 * lead alone, who is the only person who can act on it. An action is one of two things:
 *   - choices, where the record holds the question and somewhere for the answer to go, each with the route
 *     that keeps it (or none, where the answer changes nothing, such as "Not yet");
 *   - a place to go, "check-in" or "context", with one sentence saying what to do there, where the product
 *     has no route for the answer itself.
 * Nothing is offered that the product cannot do. A choice is never made up: "Yes" and "No" only for a
 * question the lead wrote that is answered yes or no.
 */

export type APlace = 'check-in' | 'context';

export interface AChoice {
  label: string;
  /** The route that keeps this answer, or null where it changes nothing. */
  route: { method: 'PATCH' | 'POST'; path: string; body: Record<string, unknown> } | null;
}

export interface AnAction {
  /** What the button says. */
  label: string;
  /** What to do, in one full sentence, to the lead. */
  says: string;
  /** Where the button goes, or null where the choices carry it. */
  goesTo: APlace | null;
  choices?: AChoice[];
}

const firstNameOf = (name: string | null | undefined): string | null => {
  const t = (name ?? '').trim();
  return t ? t.split(/\s+/)[0] : null;
};

/** What the lead can do about one of their own actions, by the kind its id says it is. */
export function whatToDoAboutALeadAction(row: { id: string }, groundId: string, nameOfTheOneWaiting?: string | null): AnAction {
  if (row.id.startsWith('own-')) {
    const commitmentId = row.id.slice('own-'.length);
    return {
      label: 'Has it happened?',
      says: 'Say whether it has happened. Until you do, it stays open on your work plan.',
      goesTo: null,
      choices: [
        { label: 'Yes, it’s done', route: { method: 'PATCH', path: `/grounds/${groundId}/commitments/${commitmentId}`, body: { status: 'DONE' } } },
        { label: 'Not yet', route: null },
      ],
    };
  }
  if (row.id.startsWith('waiting-on-the-lead-')) {
    return {
      label: 'Reply in your check-in',
      says: nameOfTheOneWaiting
        ? `Tell Groundwork in your check-in what you will do for ${nameOfTheOneWaiting}, and by when.`
        : 'Tell Groundwork in your check-in what you will do about it, and by when.',
      goesTo: 'check-in',
    };
  }
  if (row.id.startsWith('nobody-named-')) {
    return { label: 'Name who provides it', says: 'Say in your check-in who can provide it, so they can be asked.', goesTo: 'check-in' };
  }
  if (row.id.startsWith('tell-')) {
    return { label: 'Open your check-in', says: 'Talk it through with them first. Then tell Groundwork in your check-in that you have.', goesTo: 'check-in' };
  }
  return { label: 'Open your check-in', says: 'You can settle this in your check-in.', goesTo: 'check-in' };
}

/** A question the lead wrote that is answered yes or no: "Whether to ..." with no "or", or "Should we ...?" and the like. */
export function isAYesOrNoQuestion(text: string): boolean {
  const t = (text ?? '').trim();
  if (/^whether\b/i.test(t)) return !/\bor\b/i.test(t);
  return /^(should|shall|do|does|did|is|are|can|will|may|must)\b[^?]*\?$/i.test(t);
}

/** The line that goes in how we work once the lead answers, in the lead's own words. */
export function theAnswerAsALine(question: string, yes: boolean): string {
  const q = (question ?? '').trim().replace(/[.!?]+$/, '');
  const answer = yes ? 'yes' : 'no';
  if (/^whether\b/i.test(q)) return `On ${q.charAt(0).toLowerCase()}${q.slice(1)}, the answer is ${answer}.`;
  return `The answer to "${q}?" is ${answer}.`;
}

/** What the lead can do about one decision on the board. */
export function whatToDoAboutADecision(
  d: { source?: string; question: string; contextItemId?: string | null; waitsOn?: { participantId: string | null; outside: string | null; what: string } },
  groundId: string,
  leadId: string | null,
  nameOf: (participantId: string) => string | null,
): AnAction {
  if (d.source === 'lead') {
    if (d.contextItemId && isAYesOrNoQuestion(d.question)) {
      const route = (yes: boolean) => ({ method: 'POST' as const, path: `/grounds/${groundId}/board/decisions/${d.contextItemId}/answer`, body: { yes } });
      return {
        label: 'Decide it',
        says: 'Your answer goes in how we work, and this comes off the list of things still to decide.',
        goesTo: null,
        choices: [{ label: 'Yes', route: route(true) }, { label: 'No', route: route(false) }],
      };
    }
    return { label: 'Open the Context page', says: 'Write down what you decided on the Context page, and close this line there.', goesTo: 'context' };
  }
  if (d.source === 'blocker' && d.waitsOn) {
    const on = d.waitsOn.participantId;
    if (on && on === leadId) {
      return { label: 'Reply in your check-in', says: 'This is waiting on you. Tell Groundwork in your check-in what you will do about it, and by when.', goesTo: 'check-in' };
    }
    if (on) {
      const name = nameOf(on);
      const first = firstNameOf(name);
      return {
        label: first ? `Ask ${first}` : 'Ask them',
        says: name
          ? `Tell Groundwork on the Context page what to ask ${name}, and it will ask in ${name}'s next check-in.`
          : 'Tell Groundwork on the Context page what to ask, and it will ask in their next check-in.',
        goesTo: 'context',
      };
    }
    if (d.waitsOn.outside) {
      return { label: 'Open your check-in', says: `Nobody in this check-in can provide it. Say in your check-in who will ask ${d.waitsOn.outside}, and by when.`, goesTo: 'check-in' };
    }
    return { label: 'Name who provides it', says: 'Nobody has been named to provide it. Say in your check-in who can, so they can be asked.', goesTo: 'check-in' };
  }
  return { label: 'Open your check-in', says: 'People said different things about this. Talk it through with them, and say in your check-in what you settled.', goesTo: 'check-in' };
}

/**
 * AN ACTION ALWAYS SAYS WHAT ITS BUTTON IS (request 152, 1). Two items on a real board arrived with an empty
 * `label` and a `goesTo`, so the button held no words. Whatever a later pass does to the sentences of a board,
 * this runs last: an action whose label is empty or only spaces is given the plain one for where it goes.
 */
export function anActionWithItsLabel<A extends { label?: string; goesTo?: APlace | null; choices?: AChoice[] } | null | undefined>(action: A): A {
  if (!action || typeof action !== 'object') return action;
  if (typeof action.label === 'string' && action.label.trim()) return action;
  const label = action.choices?.length ? 'Decide it' : action.goesTo === 'context' ? 'Open the Context page' : 'Open your check-in';
  return { ...action, label };
}

/** A sentence for comparing: no case, no punctuation, one space between words. */
export const sameSentenceKey = (t: unknown): string => String(t ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * THE BOARD'S TWO LISTS OF WHAT NEEDS THE LEAD, EACH THING ONCE, EACH WITH ITS LABEL (requests 151 E6, 152 1).
 * Two lines that say the same thing (the discount decision, the tax view) were listed twice. A line is kept once,
 * by its text with case and punctuation ignored, and a decision that a lead action already says is left to the action.
 */
export function everyActionHasALabel<B extends { leadActions?: any; decisions?: any }>(board: B): B {
  const fix = (rows: any) => (Array.isArray(rows) ? rows.map((r) => (r && r.action ? { ...r, action: anActionWithItsLabel(r.action) } : r)) : rows);
  const once = (rows: any, textOf: (r: any) => unknown, seen: Set<string>) => (Array.isArray(rows)
    ? rows.filter((r) => {
      const k = sameSentenceKey(textOf(r));
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    : rows);
  const out: any = { ...board };
  const seen = new Set<string>();
  if (board.leadActions !== undefined) out.leadActions = fix(once(board.leadActions, (r) => r?.says, seen));
  if (board.decisions !== undefined) out.decisions = fix(once(board.decisions, (r) => r?.question, seen));
  return out;
}
