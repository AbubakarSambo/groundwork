/**
 * ONE LINE, ONE LINK, ONE REPORT: THE TWO EMAILS THAT ARE THE WHOLE PRODUCT FOR THIS CARD.
 *
 * "Get updates from your team" promises a two-minute setup and a same-week payoff, and both halves
 * of that promise are emails rather than screens. Hafsah, 18 September 2026:
 *
 *   What the team gets    "Hafsah asked you for a quick update. [the one line] Takes two minutes.
 *                          Reply by Friday." -> Your link
 *   What you get          "An email the moment everyone's in: Your team has all checked in. One
 *                          report - what each person said, where they line up, where they don't,
 *                          what nobody's holding. That's the thing you take into your next team
 *                          meeting."
 *
 * WHY THESE ARE NOT THE ORDINARY TWO. The ordinary invite explains what a check-in is, that nobody
 * on the team sees the words, and that it takes about ten minutes - all true, all necessary when
 * somebody is being asked to be honest about a colleague. None of it fits being asked one question
 * by your own manager. And the ordinary report mail leads with "the shared picture is ready", which
 * is the product's name for the thing rather than the sentence the lead is waiting for.
 *
 * THE WORD DOING THE WORK IS "ONE". One line, one link, one report. Everything else - the cadence,
 * the links, the reports - is how it works rather than what it is, so it is mentioned once and
 * never led with.
 */

/** What the person answering sees, in the subject line, before they open anything. */
export function theSubjectTheTeamSees(leadName: string): string {
  return `${leadName} asked you for a quick update`;
}

/**
 * The lead's own line is the body. It is quoted rather than paraphrased, because it is the question
 * they are being asked and the product has no better version of it.
 */
export function whatTheTeamGets(opts: {
  leadName: string;
  theOneLine: string;
  by: string | null;
  /** Said plainly rather than hidden - see BEING STRAIGHT ABOUT A TRIAL below. */
  aTrial?: boolean;
}): { subject: string; lines: string[] } {
  const by = opts.by?.trim();
  /*
   * BEING STRAIGHT ABOUT A TRIAL RAISES REPLIES AND IT IS ALSO THE DECENT THING.
   *
   * Her call: "If it's a trial, say it in the invite rather than hiding it. Being straight about it
   * raises response rates, and it makes the team a participant in the evaluation instead of a test
   * subject." Written in the first person plural on purpose - it is the lead's trial, not ours.
   */
  const trial = opts.aTrial
    ? 'We are trying this out to see if this new tool can help us be aligned, and your answers go into one summary that gives us a shared picture.'
    : null;
  return {
    subject: theSubjectTheTeamSees(opts.leadName),
    lines: [
      `${opts.leadName} asked you for a quick update.`,
      opts.theOneLine.trim(),
      /*
       * FIVE MINUTES, AND WHAT COMES BACK.
       *
       * "Takes two minutes" was never true of a conversation that asks five or six questions -
       * measured across a hundred real ones, the median was six answers. Hafsah, 23 September 2026:
       * "should we tell people it takes 5mins and not 2?" And the reason to spend them is what
       * arrives at the end, which this never mentioned.
       */
      by ? `It takes about ten minutes. Reply by ${by}.` : 'It takes about ten minutes.',
      'You will get the consolidated report at the end.',
      ...(trial ? [trial] : []),
    ],
  };
}

/** The moment of value, and the reason a two-minute setup is worth anybody's time. */
export function whatTheLeadGets(opts: { theOneLine: string; howMany: number }): {
  subject: string;
  lines: string[];
} {
  return {
    subject: 'Your team has all checked in',
    lines: [
      `All ${opts.howMany} of them have answered. Here is one report.`,
      opts.theOneLine.trim(),
      'It shows what each person said, where they line up, where they do not, and what nobody is holding.',
      'That is the thing to take into your next team meeting.',
    ],
  };
}

/** The button, on both. It says what is on the other side of it and nothing else. */
export const THE_TEAM_BUTTON = 'Your link';
export const THE_LEAD_BUTTON = 'Read the report';
