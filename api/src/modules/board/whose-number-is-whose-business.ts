/**
 * TEN PEOPLE EACH SAW ALL TEN TARGETS, AND NOBODY DECIDED THAT.
 *
 * Watched live: a salesperson opened his first check-in and the first thing on the screen was every
 * colleague's quota, top to bottom, from the best seller's 40 down to the newest person's 13. He
 * had not asked for it and his manager had not chosen it. It fell out of the brief being a shared
 * fact and a target being a board object, which was true and fine for every check-in this product
 * had until somebody set one per person.
 *
 * IT IS NOT OBVIOUSLY WRONG, WHICH IS WHY IT NEEDS ASKING. Plenty of sales floors put the whole
 * board on the wall on purpose. Plenty of others would call publishing the newest person's number
 * beside the best seller's a way to lose them in a fortnight. Both are defensible; neither should
 * be an accident of how the data happens to be modelled.
 *
 * SO THE DEFAULT IS THE NARROW ONE AND IT IS SAID OUT LOUD. Their own number, and the total they
 * are part of - a person's number means nothing without the whole it belongs to. Somebody who wants
 * the wall can have it by choosing it.
 */
export type WhoSees = 'their own' | 'everybody';

export const WHAT_THAT_MEANS: Record<WhoSees, string> = {
  'their own': 'Each person sees their own number and the team total. Nobody sees anybody else\'s.',
  'everybody': 'Everybody on the check-in sees every number, including whose is whose.',
};

/** Narrow unless somebody chose otherwise: a default that publishes is not a default. */
export const UNLESS_SOMEBODY_SAYS: WhoSees = 'their own';

export interface Target {
  name: string;
  target: number | null;
  ownerParticipantId?: string | null;
  /** THE LEAD SAYS PLAINLY (decision 46, 29 September 2026), set when the target is made, never
   * guessed from its wording - see GroundObjective.isADecisionAboutAPerson in schema.prisma. A
   * target with this set is shown to the check-in's lead and nobody else. */
  isADecisionAboutAPerson?: boolean;
}

/**
 * The targets this reader may see, and the line that says what is missing and why.
 *
 * A target belonging to nobody is everybody's: that is what a board target was before owners
 * existed, and it is still the common case - "paying companies", "first response under four hours".
 * Only a target with somebody's name on it is narrowed.
 */
/** A total over this many people or fewer gives somebody's number away: it is the whole minus the reader's own. */
export const MOST_PEOPLE_WHOSE_TOTAL_GIVES_ONE_AWAY = 2;

export function targetsFor(
  targets: Target[],
  readerParticipantId: string | null,
  whoSees: WhoSees,
  opts: { isLead?: boolean; seesEveryShare?: boolean } = {},
): { shown: Target[]; alsoSay: string | null } {
  if (opts.isLead) return { shown: targets, alsoSay: null };
  /* A decision the lead has to make about somebody is the lead's alone, whoever else reads (request
     42, decision 46). Read off the field the lead set when the target was made, never guessed from
     its wording - see Target.isADecisionAboutAPerson above. */
  targets = targets.filter((t) => !t.isADecisionAboutAPerson);
  /* An admin, the chief executive included, sees the figures: every person's share (decision 86,
     which reverses that part of decision 73). Never the lead's decision about a person, above. */
  if (whoSees === 'everybody' || opts.seesEveryShare) return { shown: targets, alsoSay: null };

  const unowned = targets.filter((t) => !t.ownerParticipantId);
  const mine = targets.filter((t) => t.ownerParticipantId && t.ownerParticipantId === readerParticipantId);
  const others = targets.filter((t) => t.ownerParticipantId && t.ownerParticipantId !== readerParticipantId);
  if (!others.length) return { shown: [...unowned, ...mine], alsoSay: null };

  /*
   * THE TOTAL, BECAUSE A NUMBER WITH NO WHOLE IS NOT A TARGET, IT IS A CHORE.
   *
   * "Yours is 21" tells somebody what to do. "Yours is 21, of 270 across ten people" tells them why
   * it is 21, and it is the fact that makes the ask reasonable rather than arbitrary. It gives away
   * nothing about any individual.
   */
  /*
   * AND THE WHOLE IS ONLY ADDED UP WHERE EVERY NUMBER HAS A NAME ON IT.
   *
   * Read live: a check-in with a team target of 500 and four people carrying 150, 150, 150 and 50
   * of it was told "the whole check-in is aiming at 1000". The per-person numbers COMPOSE the
   * team's one, so adding both counted the same work twice and doubled the ask.
   *
   * The first fix was to treat a target belonging to nobody as the whole. That is wrong too: a
   * target with no owner is often just a target nobody has been given yet, and calling it the whole
   * understates the ask by as much as the other way overstated it. Nothing in a target says whether
   * it is a whole or a part, so where the two are mixed there is no honest total to give.
   *
   * So the sum is said only where every number has a name on it, which is the case it was written
   * for - "yours is 21, of 270 across ten people". Where some number belongs to nobody, what is
   * withheld is still worth saying and the arithmetic is not.
   */
  const total = unowned.length ? 0 : targets.reduce((a, t) => a + (t.target ?? 0), 0);
  /*
   * THE HEAD COUNT ONLY WHERE EVERY NUMBER HAS A NAME ON IT.
   *
   * Read live with eight of ten targets unassigned: "aiming at 270 across 2 people" - the two whose
   * targets happened to have owners. True of the data and nonsense to a reader.
   */
  const everyoneNamed = unowned.length === 0;
  const heads = others.length + mine.length;
  /*
   * AND THE TOTAL ONLY WHERE THREE OR MORE PEOPLE HAVE A NUMBER (decision 110, P3; Hafsah's hidden-target rule).
   *
   * With two people carrying a number, the whole minus your own IS your colleague's number, so "of 270 across two people" gave it
   * away. With three or more, what is left is the sum of at least two others, which names nobody's. Where the total is withheld the
   * reader is still told that other people's numbers are their own, so a short list is never a silent one.
   */
  if (!everyoneNamed || heads < MOST_PEOPLE_WHOSE_TOTAL_GIVES_ONE_AWAY + 1) {
    /*
     * NO NUMBER, BUT STILL AN ANSWER. Something is missing from this screen and the reason is worth
     * one line - without it, a person sees a short list and has no idea anything was left out.
     */
    return { shown: [...unowned, ...mine], alsoSay: 'Other people on this check-in have numbers of their own, and those are theirs.' };
  }
  return {
    shown: [...unowned, ...mine],
    alsoSay: total > 0
      ? `The whole check-in is aiming at ${total} across ${heads} ${heads === 1 ? 'person' : 'people'}.` +
        " Everybody's own number is their own."
      : null,
  };
}

/**
 * WHAT THE LEAD NEEDS TELLING, WHERE THE SETTING IS NOT DOING WHAT THEY THINK.
 *
 * A target with nobody's name on it belongs to the whole check-in, which is what every board target
 * was and is still the common case. But a lead who has just typed ten targets called "Bala",
 * "Fatima", "Musa" and assigned none of them has ten per-person numbers that everybody can read,
 * with the privacy setting on and doing nothing.
 *
 * Nothing guesses here - a name in a target's text is not an owner, and inferring one would attach
 * a person's number to them on the strength of a string match. It says what is true and leaves the
 * fixing to the person who knows.
 */
export function whatTheLeadShouldKnow(targets: Target[], whoSees: WhoSees): string | null {
  if (whoSees !== 'their own') return null;
  const unowned = targets.filter((t) => !t.ownerParticipantId && t.target != null);
  if (!unowned.length || unowned.length === targets.length) return null;
  const n = unowned.length;
  return `${n === 1 ? 'One target has' : `${n} targets have`} nobody's name on ${n === 1 ? 'it' : 'them'}, so everybody on this check-in can see ${n === 1 ? 'it' : 'them'}. Set whose ${n === 1 ? 'it is' : 'they are'} to keep each person's number to them.`;
}
