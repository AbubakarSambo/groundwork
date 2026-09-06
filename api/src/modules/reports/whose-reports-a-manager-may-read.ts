/**
 * A MANAGER MAY SEE THEIR DEPARTMENT'S REPORT. ONLY THE EXACT WORDS ARE WALLED OFF.
 *
 * Hafsah's rule, and it corrects a real over-caution: a management tool whose
 * output a manager cannot see is not a management tool. The wall is around
 * verbatim sentences attributed to a person, not around a manager knowing how
 * their people are doing.
 *
 * The released report is already the right shape for this. It is a synthesis —
 * where the accounts agree, where they diverge, the central question — and the
 * model refuses to quote either side. So this is an ACCESS rule rather than a
 * redaction one, and the two things that stay out stay out completely:
 *
 *   A SOLO REPORT is one person's own account of their own record. It is theirs,
 *   and they decide whether to share it. A manager never receives one by being a
 *   manager.
 *
 *   A TRANSCRIPT is the sentences somebody said. Never, at any level, to anybody.
 *
 * THE TRAP, AND IT IS NOT OBVIOUS. A report belongs to everybody in the
 * check-in. A manager of one participant reading it is reading a document about
 * the other participants too — and one of those may report somewhere else
 * entirely. Access by reporting line has to mean access to reports about YOUR
 * people, not reports that happen to mention one.
 */

export interface AParticipantInAGround {
  personExternalId: string | null;
  /** Whose report line they sit on. Null when they are outside the roster entirely. */
  managerExternalId: string | null;
  isLead: boolean;
}

export interface AGroundWithAReport {
  groundId: string;
  label: string;
  releasedAt: Date | null;
  participants: AParticipantInAGround[];
}

export type WhyNotReadable =
  | 'not released yet'
  | 'somebody in it reports elsewhere'
  | 'nobody in it reports to you';

export interface WhatAManagerGets {
  readable: { groundId: string; label: string; releasedAt: Date; about: string[] }[];
  /** Named rather than hidden: a manager who sees nothing assumes there is nothing. */
  withheld: { groundId: string; label: string; because: WhyNotReadable }[];
}

/**
 * What a manager may read, and what they may not, with the reason.
 *
 * The withheld list is not a courtesy. A manager shown a short list concludes
 * their people are quiet; a manager shown a short list and three reasons knows
 * where to look. The second is the only honest one.
 */
export function whatAManagerMayRead(
  grounds: AGroundWithAReport[],
  managerExternalId: string,
): WhatAManagerGets {
  const readable: WhatAManagerGets['readable'] = [];
  const withheld: WhatAManagerGets['withheld'] = [];

  for (const ground of grounds) {
    /* The lead is running it rather than being read in it, so who they report to
       does not decide whether this is a report about this manager's people. */
    const read = ground.participants.filter((p) => !p.isLead);
    const mine = read.filter((p) => p.managerExternalId === managerExternalId);

    if (mine.length === 0) {
      withheld.push({ groundId: ground.groundId, label: ground.label, because: 'nobody in it reports to you' });
      continue;
    }

    /*
     * SOMEBODY ELSE'S PERSON IS IN IT.
     *
     * A report is one document about everybody in the check-in. Handing it over
     * because one participant reports here would hand over an account of
     * somebody who reports somewhere else, to a manager who is not theirs.
     * That is the leak this rule exists to prevent, and it is invisible until
     * somebody reads a report about a peer's direct report.
     */
    if (mine.length !== read.length) {
      withheld.push({
        groundId: ground.groundId,
        label: ground.label,
        because: 'somebody in it reports elsewhere',
      });
      continue;
    }

    if (!ground.releasedAt) {
      withheld.push({ groundId: ground.groundId, label: ground.label, because: 'not released yet' });
      continue;
    }

    readable.push({
      groundId: ground.groundId,
      label: ground.label,
      releasedAt: ground.releasedAt,
      about: mine.map((p) => p.personExternalId as string),
    });
  }

  return { readable, withheld };
}

/** What to say about the ones they cannot read, in words that are not an apology. */
export function sayWhatIsWithheld(withheld: WhatAManagerGets['withheld']): string[] {
  return withheld.map((w) => {
    switch (w.because) {
      case 'not released yet':
        return `"${w.label}" has not been released yet. Everybody in it gets it at the same moment, including you.`;
      case 'somebody in it reports elsewhere':
        return `"${w.label}" includes somebody who does not report to you, and a report is one document about everybody in it. It stays with the people in it.`;
      default:
        return `"${w.label}" is not about anybody who reports to you.`;
    }
  });
}
