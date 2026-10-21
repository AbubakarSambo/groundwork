import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { SuggestionsService } from '../suggestions/suggestions.service';
import type { ForAnAdmin, ForTheLead, ForThePerson } from '../suggestions/a-suggestion-told-like-a-signal';
import {
  PATTERN_ROW_SELECT,
  markShownToThePerson,
  runsItForAPattern,
  servedPatterns,
  theOnesTheyAreSeeingFirst,
  whoIsWhoIn,
  type AServedPattern,
} from '../patterns/who-reads-a-pattern';
import { PATTERNS_ARE_SERVED } from '../patterns/patterns-are-served';
import { rememberedCompose } from '../reports/a-line-worded-once-is-kept';
import { wordPatternEvidence } from '../reports/pattern-evidence-in-plain-words';

/**
 * WHAT THE ENDING PAGE READS, AS EACH READER READS IT (week 11 of docs/weekly-plan.md; the prototype's
 * B6 "How does this end?").
 *
 * Served with the resolution read (GET /grounds/:id/resolution, as `theEndingPage`), after that read
 * has already refused anybody who may not read the check-in at all, which includes an admin without
 * access to an evaluation check-in (who-may-read-this-check-in.ts). This file decides what each of
 * the people who may read it is handed, and builds each shape field by field:
 *
 *   the lead      the week-10 suggestion for each person it was reached for (headline, why, what
 *                 would change it, the person's own answer, what to do if they agree, other choices),
 *                 only once that person has had their turn (decision 53), with the count behind it (decision 86);
 *                 the signals behind it, as plain sentences of what happened in the work; and the
 *                 questions to ask.
 *   the person    their own facts and what would change them, the decision with its reasons when one
 *                 is made, and their own signals. Never the lead's suggestion, never a verdict, never
 *                 a question written for the lead.
 *   a colleague   the same as a person: only what is about them, which is nothing when nothing is.
 *   an admin      a suggestion only once it is appealed (the week-10 rule); signals and questions only
 *                 where they run the check-in or set it up (decision 58), never as every admin.
 *
 * Nothing here rates anybody, and nothing names a pattern beside a person: a signal carries the
 * person as an id for the screen to place, with the plain name of what happened in the work.
 */

export interface AnEndingSignal {
  id: string;
  /** Whose work it is about, for the screen to place. Never joined to a name here. */
  participantId: string;
  yours: boolean;
  /** The plain name of what happened in the work, never a label on the person. */
  heading: string;
  whatHappened: string | null;
  howOften: string;
  /** What the person said is behind it, in their own words, once they have said it. */
  theirWords: string | null;
  whoSeesIt: string;
}

export interface AQuestionToAsk {
  /** The first name of the person it is about. */
  aboutName: string;
  question: string;
}

export interface TheEndingPage {
  reader: 'lead' | 'person' | 'admin';
  /** The lead's suggestions, one for each person one was reached for. Empty for everybody else. */
  suggestions: ForTheLead[];
  /** What the person reads about themselves: their facts, and the decision with its reasons once made. */
  aboutYou: ForThePerson[];
  /** An admin reads a suggestion only once it is appealed. */
  appealed: ForAnAdmin[];
  signals: AnEndingSignal[];
  /** For whoever runs the check-in only. Empty for everybody else. */
  questions: AQuestionToAsk[];
}

const EMPTY: Omit<TheEndingPage, 'reader'> = { suggestions: [], aboutYou: [], appealed: [], signals: [], questions: [] };

/** The two questions every person a suggestion was reached for is owed, in plain full sentences. */
export function questionsAboutOnePerson(firstName: string): string[] {
  return [
    `Were ${firstName}'s goals clear enough from the first day?`,
    `Is there something ${firstName} needed from you or from the team that has not been given yet?`,
  ];
}

const asASignal = (p: AServedPattern): AnEndingSignal => ({
  id: p.id,
  participantId: p.participantId,
  yours: p.yours,
  heading: p.heading,
  whatHappened: p.whatHappened,
  howOften: p.howOften,
  theirWords: p.theirWords,
  whoSeesIt: p.whoSeesIt,
});

export interface Deps { prisma: PrismaService; suggestions?: SuggestionsService | null }

export async function theEndingPageFor(deps: Deps, groundId: string, userId: string): Promise<TheEndingPage> {
  const { prisma } = deps;
  const ground: any = await prisma.ground.findUnique({
    where: { id: groundId },
    select: {
      id: true, organizationId: true, initiatorId: true, createdByUserId: true, cadence: true,
      participants: {
        where: { managingOnly: false },
        select: {
          id: true, userId: true, nameGiven: true, detectedFunction: true, detectedFunctionConfidence: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      patternDetections: { select: PATTERN_ROW_SELECT, orderBy: { lastSeenAt: 'desc' }, take: 60 },
    },
  });
  if (!ground) return { reader: 'person', ...EMPTY };

  const parties: any[] = ground.participants ?? [];
  const mine = parties.find((p) => p.userId === userId) ?? null;
  const isTheLead = ground.initiatorId === userId;
  const runsIt = runsItForAPattern(ground, userId);
  const reader: TheEndingPage['reader'] = isTheLead ? 'lead' : mine ? 'person' : 'admin';

  /* The suggestions, in the shape the week-10 service serves this reader. It knows who the reader is
     in this check-in and refuses an outsider; here that means nothing is shown, not an error. */
  let suggestions: (ForTheLead | ForThePerson | ForAnAdmin)[] = [];
  if (deps.suggestions) {
    try {
      suggestions = (await deps.suggestions.forGround(groundId, { userId, organizationId: ground.organizationId })).suggestions;
    } catch (err) {
      if (!(err instanceof ForbiddenException)) throw err;
    }
  }

  /* The signals: the patterns this reader may read on this check-in, through the one rule. */
  let signals: AnEndingSignal[] = [];
  if (PATTERNS_ARE_SERVED && (mine || runsIt) && (await thePersonJudgementsAreOn(prisma, ground.organizationId))) {
    const names = whoIsWhoIn(parties, ground.initiatorId, ground.cadence);
    const served = servedPatterns(ground.patternDetections ?? [], { participantId: mine?.id ?? null, runsIt }, names);
    const worded = await wordPatternEvidence(served, names.firstNameOf ?? (() => null), rememberedCompose(prisma, async () => null, false)).catch(() => served);
    signals = worded.map(asASignal);
    /* A person reading their own for the first time starts the clock on when the lead may read it. */
    await markShownToThePerson(prisma as any, theOnesTheyAreSeeingFirst(ground.patternDetections ?? [], served));
  }

  if (reader === 'lead') {
    const mineToRead = suggestions as ForTheLead[];
    const firstNameOf = whoIsWhoIn(parties, ground.initiatorId).firstNameOf!;
    const questions: AQuestionToAsk[] = [];
    const seen = new Set<string>();
    const add = (aboutName: string, question: string) => {
      const key = `${aboutName}|${question}`;
      if (!seen.has(key)) { seen.add(key); questions.push({ aboutName, question }); }
    };
    for (const s of mineToRead) for (const q of questionsAboutOnePerson(s.aboutName)) add(s.aboutName, q);
    for (const p of servedPatterns(ground.patternDetections ?? [], { participantId: mine?.id ?? null, runsIt }, whoIsWhoIn(parties, ground.initiatorId, ground.cadence))) {
      if (p.askThem && !p.yours) add(firstNameOf(p.participantId) ?? 'The person', p.askThem);
    }
    return { reader, ...EMPTY, suggestions: mineToRead, signals, questions };
  }

  if (reader === 'person') {
    return { reader, ...EMPTY, aboutYou: suggestions as ForThePerson[], signals: signals.filter((s) => s.yours) };
  }

  return { reader, ...EMPTY, appealed: suggestions as ForAnAdmin[], signals };
}
