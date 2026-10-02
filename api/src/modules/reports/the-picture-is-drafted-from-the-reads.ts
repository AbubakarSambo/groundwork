import type { Drafted } from './the-engine-drafts-it-the-model-words-it';
import { peopleSaidDifferentThingsAbout, isAWholeSentence } from './what-people-said-differently-about';
import { someOfThemHave } from './some-of-them-has-or-have';
import { roleMapFor, MIN_COACHING_CONFIDENCE } from '../board/role-maps';
import { WHO_CAN_MOVE_IT, WHAT_IT_MEANS, type Kind } from '../board/what-kind-of-thing-is-in-the-way';

/** A topic that is a whole sentence, said as one. */
const theTopicAsASentence = (topic: string): string => {
  const t = topic.trim().replace(/[.!?]+$/, '');
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
};

/**
 * THE PICTURE FROM EVERYBODY IS DRAFTED FROM THE READS. THE MODEL WORDS IT.
 *
 * It used to be the most weighted prose on the page and the least accountable: a model handed the
 * whole corpus and asked for "a plain-language synthesis of the situation". Nothing checked it. The
 * pattern engine reached it as a suggestion the model could decline. Meanwhile `board/reads.ts`,
 * `coverage.ts`, the confidence read, the four tiles and the blocker rows all produce structured
 * claims over the same rows, and the picture used none of them.
 *
 * Now the claims come from the engines and the model may only choose the words. Every line here is
 * built from an engine's own output and travels with the strings the model must keep. Where there
 * is no engine basis at all, the picture is empty - it is not filled by a model over the transcript.
 *
 * ONE CLAIM, ONE LINE. Grouping is done here, so the phrasing pass is never asked to vary a mail
 * merge.
 */
export interface PictureInput {
  /** Where two people describe the same thing differently, from the written report's own read. */
  differences?: { topic: string; sides: { who: string; says: string }[] }[];
  answered: number;
  ofPeople: number;
  confidence: { band: 'thin' | 'partial' | 'solid'; saying: string; reasons: string[] };
  tiles: { label: string; value: string; sub: string; tone: string }[];
  patterns: { who: string; signal: string; periodsObserved: number; positive: boolean; carrying?: boolean }[];
  /** Per person, from buildCoverage: what is landing where, in the engine's words. */
  coverage: { name: string; reasonText: string }[];
  /** Per person, from buildContribution: the engine's reason line, where it has one. */
  contribution: { name: string; reason: string }[];
  blockers: { who: string | null; on: string | null; onIsPerson: boolean; what: string; kind: Kind | null; escalated: boolean; named?: boolean }[];
  /** The written report's own agreed and open items. Model-authored, and labelled as such. */
  settled: string[];
  open: string[];
  /*
   * THE ARITHMETIC, WHICH OUTRANKS EVERYTHING ELSE WHEN IT HAS SOMETHING TO SAY.
   *
   * Read off a live three-person report: the objective was 10,000 units of tea, the three people in
   * it had described 2,000 units, 150 bags and 50 bags each, and the finding read "the role was
   * never clearly defined, so there is no boundary to measure work against" - true of almost every
   * check-in ever run, and no use to anybody.
   *
   * Her words: "doesnt tell us to go work out individual targets and also the fact that all of us
   * are listing goals too low to meet the objective." One sentence of arithmetic beats any read on
   * coverage, because a number that does not reach another number is not a matter of opinion.
   */
  numbers?: string | null;
  /**
   * WHAT CHANGED SINCE LAST TIME, WHICH FROM SESSION 2 IS THE MOST USEFUL SENTENCE ON THE PAGE.
   *
   * 4.3: "Session 1 has nothing to compare, but from session 2 the report should open on movement,
   * not on a fresh read." Every round's picture was written as though it were the first one, so a
   * reader on session 4 got a fresh description of a situation they already knew and had to work
   * out for themselves what was different.
   *
   * Computed rather than asked for, like the arithmetic above it, and ranked above everything
   * except the arithmetic: a number that does not add up is still the bigger fact.
   */
  sinceLastTime?: string | null;
  /**
   * A LISTENING SESSION IS NOT A RUN OF WORK. Run 8, 21 Sep 2026, the discovery report's finding read
   * "You, Ifeoma Okonkwo, Adamu Tanko, ... and Dr Folake Adeyemi are waiting for 54 things, starting
   * with confirmed interest from partners... with no escalation on record", and under it the same
   * "1 check-in on record. Nothing named so far could be checked... Read against Project
   * management" ten times. Information a person said they lack is the answer a discovery session
   * asks for, not a blocker; there is no "so far" in one session; nobody is read against a role. So
   * a one-time session drafts from the differences and the direction only.
   */
  oneTime?: boolean;
  /** The direction the room points, already worded by the product (see what-the-room-said). */
  direction?: { saying?: string | null; lines: string[] } | null;
}

const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const theThing = (s: string) => s.replace(/[.\s]+$/, '');
/* Lower-case a first letter that is only capitalised because the row began a sentence. A name or
   an acronym keeps its case: two capitals in a row, or a capital followed by a non-letter, is left. */
const lower = (s: string) => (/^[A-Z]([a-z]|\s)/.test(s) && !/^I\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * WHICH LINE IS THE FINDING. The template on the marketing page leads with one sentence in amber,
 * then the four states, then the rest. The drafted lines are ranked for that slot: something in
 * the way outranks a read on coverage or contribution, which outranks a pattern, which outranks
 * the tile line, which outranks the settled-and-open line. The basis line never leads; it goes
 * underneath the finding, small.
 */
const FINDING_RANK: [RegExp, number][] = [[/^direction$/, -2], [/^numbers$/, -1], [/^moved$/, -0.5], [/^differs-/, 0], [/^block-/, 1], [/^(cov|con)-/, 2], [/^pattern-/, 3]];
/**
 * AN ABSENCE IS NOT A FINDING.
 *
 * Read on a live session report, 22 September 2026, the headline: "Sahar Jamal and Catherine
 * Kinyanjui: their responsibilities are staying with them. Nothing is leaking out or piling in, so
 * there is nothing here to read into." Four lines below it the same page carried the actual finding:
 * one of them was selling tractors and the other subscriptions, against one shared number.
 *
 * The rank already puts a difference above a coverage read. What it could not do was refuse a
 * coverage read that says nothing is happening - which is not a smaller finding than a difference,
 * it is the opposite of one. Those lines stay in the picture, where "nothing is leaking" is worth
 * knowing; they are simply never the sentence the round is named by.
 */
const SAYS_NOTHING_IS_HAPPENING = /nothing (here )?to read into|nothing is (leaking|piling)|staying with them|no boundary to measure/i;
export function pickTheFinding(keys: string[], texts?: Record<string, string>): string | null {
  const ranked = keys
    .map((k) => ({ k, r: FINDING_RANK.find(([re]) => re.test(k))?.[1] ?? 9 }))
    .filter((x) => x.r < 9)
    .filter((x) => !(texts?.[x.k] && SAYS_NOTHING_IS_HAPPENING.test(texts[x.k])))
    .sort((a, b) => a.r - b.r);
  return ranked[0]?.k ?? null;
}

export function hasAnEngineBasis(i: PictureInput): boolean {
  return i.answered > 0 || i.patterns.length > 0 || i.coverage.length > 0 || i.contribution.length > 0 || i.blockers.length > 0 || !!i.direction?.lines?.length;
}

export function draftThePicture(i: PictureInput): Drafted[] {
  if (!hasAnEngineBasis(i)) return [];
  const out: Drafted[] = [];

  /* WHERE THE ROOM POINTS, first, on a one-time session. Product-worded already; nothing to reword. */
  if (i.direction?.lines?.length) {
    const text = [i.direction.saying?.trim(), ...i.direction.lines].filter(Boolean).join(' ');
    out.push({ key: 'direction', text, mustKeep: [...i.direction.lines] });
  }

  /*
   * THE NUMBERS FIRST, where there are any. It leads the picture and it takes the finding slot,
   * because arithmetic about the objective outranks every read in this file. See PictureInput.
   */
  /* Before the reads and after the arithmetic. See PictureInput.sinceLastTime. */
  if (i.sinceLastTime?.trim()) {
    out.push({ key: 'moved', text: i.sinceLastTime.trim(), mustKeep: [] });
  }

  if (i.numbers?.trim()) {
    /* The line arrives written for the model with an instruction on the end of it; the picture
       wants only the fact. Everything up to the first instruction sentence is the fact. */
    const bare = i.numbers.replace(/^THE NUMBERS:\s*/, '').split(/\s(?:Lead with this|Say so|That is worth saying)\b/)[0].trim();
    /* And it starts with a capital: the line was written mid-sentence for the model, and reached a page as "the objective is 400,000 and..." */
    const fact = bare.charAt(0).toUpperCase() + bare.slice(1);
    out.push({ key: 'numbers', text: fact.endsWith('.') ? fact : `${fact}.`, mustKeep: [] });
  }

  /* Who this rests on, and how much there is to go on. Both are counts. */
  out.push({
    key: 'basis',
    text: `${someOfThemHave(i.answered, i.ofPeople, 'answered this session.')} ${i.confidence.saying}`,
    mustKeep: [i.confidence.saying],
  });

  /* The four reads, only where one wants attention. A row of "None" is the tiles' job, not prose. */
  /* The tiles say what the tiles say. A line restating them ("Differences: 1, still open. How much was
     said: All from memory") was the mail merge in paragraph form, and it went. Same for the
     settled-and-open line: those rows have their own place. */
  /* THE DIFFERENCE IS THE FINDING. "Abubak says success is usage; Hafsah says it is five contracts"
     is the sharpest fact a shared report can carry, and the board already had it while the picture
     led with coverage boilerplate. One line per difference, both sides in it. */
  for (const d of i.differences ?? []) {
    const sides = d.sides.filter((x) => x.who && x.says.trim());
    if (sides.length < 2) continue;
    /*
     * EACH SIDE A SENTENCE, AND THE PERSON ONCE (request 109 f). It read "On the crop: Amani Wekesa says Amani is
     * growing maize ...": a colon, and the person named twice, because the side's own words already name them.
     * A side that already starts with the person is said as it is; any other side is "<name> says ...".
     */
    const startsWithThem = (who: string, says: string) => {
      const first = who.trim().split(/\s+/)[0];
      return !!first && new RegExp(`^(?:${who.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i').test(says.trim());
    };
    const said = sides.map((x) => {
      const t = theThing(x.says).trim();
      return startsWithThem(x.who, t) ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : `${x.who} says ${lower(t)}.`;
    });
    out.push({
      key: `differs-${d.topic.slice(0, 24)}`,
      text: `${peopleSaidDifferentThingsAbout(d.topic)} ${said.join(' ')}`,
      mustKeep: sides.map((x) => lower(theThing(x.says))),
    });
  }
  if (i.blockers.length && !i.oneTime) {
    const byKind = new Map<string, typeof i.blockers>();
    for (const b of i.blockers) byKind.set(b.kind ?? '', [...(byKind.get(b.kind ?? '') ?? []), b]);
    for (const [kind, bs] of byKind) {
      /* Five asks read out in one breath ("the rota, a clear list of what is mine, to be paid for
         the nights, a reply and...") is a list wearing a sentence. Past two, count them and name
         the first; the rows themselves sit in What people said. */
      /*
       * "MARKETING ANALYST IS WAITING FOR WAITING ON SOMEONE ELSE" - read off a live run, and not a
       * sentence anybody would write.
       *
       * `what` is the person's own words, and where they never said what they were waiting ON it is
       * a clause rather than a noun: "waiting on someone else", "something". The template put it
       * after "for" and produced that. The row is RIGHT - they are blocked and did not say on what -
       * so the fix is the sentence, not the row.
       *
       * The named ones fill the list. The rest are counted and said as what they are, which is the
       * more useful thing for somebody reading it anyway: a manager who knows that two people are
       * stuck on something they have not named knows exactly what to ask.
       */
      const named = bs.filter((b) => b.named !== false);
      const unnamed = bs.length - named.length;
      const things = named.map((b) => theThing(b.what));
      const namedItems = things.length > 2 ? `${things.length} things, starting with ${lower(things[0])}` : andList(things.map(lower));
      const notSaid = unnamed === 1 ? 'something they have not named' : `${unnamed} things they have not named`;
      const items = things.length && unnamed ? `${namedItems}, and ${notSaid}` : things.length ? namedItems : notSaid;
      const who = [...new Set(bs.map((b) => b.who).filter(Boolean))] as string[];
      /*
       * "ON" IS PEOPLE ONLY. Driven live: "waiting on You, role definition, payment for on-call work
       * and the on-call rota for the rota..." - the row's `onLabel` is whatever the person waiting
       * typed, and half the time it is the THING, not a person. A name resolved from a participant
       * id is a person; a free-text label is not trusted to be one.
       */
      const on = [...new Set(bs.map((b) => b.onIsPerson ? b.on : null).filter(Boolean))] as string[];
      const escalated = bs.filter((b) => b.escalated).length;
      /* The reader is "You" as a name and "you" mid-sentence. Read live as "waiting on You for". */
      const mid = (n: string) => (n === 'You' ? 'you' : n);
      /* "Zainab Bello and You are waiting": the reader's label is only capitalised when it opens the sentence. */
      const whoSaid = who.length ? andList(who.map((n, i) => (i === 0 ? n : mid(n)))) : 'Somebody';
      /*
       * "YOU IS WAITING ON RUNA" - read off a live report, 11 September.
       *
       * The verb agreed with how many people were waiting, which is right for every name and wrong
       * for the one subject that is a pronoun. "You" takes a plural verb however many of you there
       * are, so the subject decides it and the count only decides the rest.
       */
      const subjectIsYou = who.length === 1 && who[0] === 'You';
      const head = `${whoSaid} ${who.length > 1 || subjectIsYou ? 'are' : 'is'} waiting${on.length ? ` on ${andList(on.map(mid))}` : ''} for ${items}${escalated ? `, ${escalated === bs.length ? (who.length > 1 || subjectIsYou ? 'and have escalated it' : 'and has escalated it') : `and ${escalated} of ${bs.length} has been escalated`}` : ', with no escalation on record'}.`;
      const tail = kind ? ` ${WHAT_IT_MEANS[kind as Kind]} ${WHO_CAN_MOVE_IT[kind as Kind]}` : '';
      out.push({
        key: `block-${kind || 'unkinded'}`,
        text: head + tail,
        /* Only the things somebody actually named are held through the rewrite. "something they
           have not named" is the product's own phrasing and does not need protecting. */
        mustKeep: [...(things.length > 2 ? [lower(things[0])] : things.map(lower)), ...(kind ? [WHAT_IT_MEANS[kind as Kind], WHO_CAN_MOVE_IT[kind as Kind]] : [])],
      });
    }
  }

  /* What keeps showing up. The library's sentence, and the count that makes it a pattern. A pattern
     needs more than one session; a one-time session has none. */
  for (const p of i.oneTime ? [] : i.patterns) {
    out.push({
      key: `pattern-${p.who}-${p.signal.slice(0, 16)}`,
      /* Three endings, because there are three kinds of pattern and the middle one is neither
         praise nor a problem with the person. See CARRYING_CODES. */
      /* A sentence, never the person and the signal joined by a colon (request 101 a). */
      text: `${p.signal} This has come up for ${p.who === 'You' ? 'you' : p.who} across ${p.periodsObserved} sessions${
        p.positive ? ', which is a good sign' : p.carrying ? ', and that is worth somebody looking at' : ''
      }.`,
      mustKeep: [p.signal],
    });
  }

  /*
   * WHOSE WORK IS LANDING WHERE, AND THE CONTRIBUTION READ, GROUPED BY WHAT THEY SAY.
   *
   * Driven live, three people got the identical coverage reason - "The role was never clearly
   * defined, so there is no boundary to measure work against" - and the picture printed it three
   * times with a name swapped. That is the mail-merge shape, from an engine. One claim that is true
   * of several people is one line naming them all.
   */
  const grouped = (rows: { name: string; text: string }[], prefix: string) => {
    const byText = new Map<string, string[]>();
    /* THE ROLE TAIL IS NOT PART OF THE CLAIM. "...Read against Project management: on track here means
       blockers driven to cleared..." made ten identical reads into ten different texts, so nothing
       grouped, and the keys below (the first 24 characters) then collided, so the model's wording of
       one person's line was printed under one name ten times (run 8, 21 Sep 2026). */
    const withoutTheRoleTail = (t: string) => t.replace(/\s*Read against [^.]+:.*$/s, '').trim();
    for (const r of rows) {
      const text = withoutTheRoleTail(r.text);
      if (!text) continue;
      byText.set(text, [...(byText.get(text) ?? []), r.name]);
    }
    for (const [text, names] of byText) {
      const claim = `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
      const all = names.length === i.ofPeople && i.ofPeople > 1;
      out.push({
        /* The whole text keys the line, so two lines that begin the same way never share one wording. */
        key: `${prefix}-${text.slice(0, 24)}-${[...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`,
        /* Two sentences, never the names and the claim joined by a colon (request 101 a). The reader is
           "you" mid-sentence. */
        text: all
          ? `This is true of everybody here. ${claim}`
          : `This is true of ${andList(names.map((n) => (n === 'You' ? 'you' : n)))}. ${claim}`,
        mustKeep: [claim],
      });
    }
  };
  if (!i.oneTime) {
    grouped(i.coverage.map((c) => ({ name: c.name, text: c.reasonText })), 'cov');
    grouped(i.contribution.map((c) => ({ name: c.name, text: c.reason })), 'con');
  }

  /*
   * THE WRITTEN REPORT'S OWN ITEMS, LABELLED AS ITS. No engine produces "agreed" and "open", so they
   * stay the model's - but the picture says so, rather than presenting them as measurement.
   */
  return out;
}

/**
 * THE CONVERSATION WORTH HAVING, FROM THE ROLE MAP AND THE BLOCKER KIND.
 *
 * It was a model's question over the transcript. Two engines already hold questions: every role map
 * carries `neutralProbes` - normal questions about the work whose answer's shape is the signal - and
 * every blocker kind carries who can move it. The blocker one leads, because it is the actionable
 * one. With no confident function in the round and no kinded blocker there is no question, and the
 * section says so rather than asking the model for one.
 */
export interface ADifferenceOnRecord {
  topic: string;
  /** What the report says would settle it, where it said. */
  settledBy?: string | null;
}

export interface QuestionInput {
  functions: { fn: string | null; confidence: number | null }[];
  blockers: { what: string; kind: Kind | null }[];
  /** What the round found people describing differently, and what the report says would settle it. */
  differences?: ADifferenceOnRecord[];
}

export function draftTheQuestion(i: QuestionInput): Drafted | null {
  /*
   * A DIFFERENCE ON THE SAME PAGE IS THE CONVERSATION WORTH HAVING.
   *
   * Read live, 22 September 2026: section 01 of a session report named the difference - one person
   * selling tractors, the other subscriptions - and said what would settle it. Section 06, four
   * inches below, said "No question yet. One comes from what kind of thing is in the way, or from
   * the kind of work this is. Neither is on record here." Both sentences from the same report.
   *
   * This only ever looked at blockers and the role map. Where the round found a difference and the
   * report said what settles it, that IS the question, and it goes first: it is the one thing on the
   * page that two people have to sit down about.
   */
  const difference = (i.differences ?? []).find((d) => d?.topic?.trim());
  if (difference) {
    const settles = (difference.settledBy ?? '').trim().replace(/\s+/g, ' ');
    return {
      key: 'question',
      /* A topic that is a whole sentence is said as one, never after "settles" (item 18): Tunde read "That is what
         settles the delivery deadline for the analysis is not agreed upon." */
      text: isAWholeSentence(difference.topic)
        ? (settles
          ? `${theTopicAsASentence(difference.topic)} ${settles.replace(/[.]+$/, '')}.`
          : `${theTopicAsASentence(difference.topic)} Settle it between the people who described it differently.`)
        : settles
          ? `${settles.replace(/[.]+$/, '')}. That is what settles ${lower(difference.topic.trim().replace(/[.]+$/, ''))}.`
          : `Settle ${lower(difference.topic.trim().replace(/[.]+$/, ''))} between the people who described it differently.`,
      mustKeep: [difference.topic.trim(), ...(settles ? [settles] : [])],
    };
  }
  const kinded = i.blockers.find((b) => b.kind);
  if (kinded) {
    const k = kinded.kind as Kind;
    return {
      key: 'question',
      /* No colon joining two pieces (request 109 f). */
      text: `${WHO_CAN_MOVE_IT[k]} Who is that for ${theThing(kinded.what)}, and have they been asked?`,
      mustKeep: [WHO_CAN_MOVE_IT[k], theThing(kinded.what)],
    };
  }
  const counts = new Map<string, number>();
  for (const f of i.functions) {
    if (!f.fn || (f.confidence ?? 0) < MIN_COACHING_CONFIDENCE) continue;
    counts.set(f.fn, (counts.get(f.fn) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const map = top ? roleMapFor(top[0]) : null;
  /*
   * A QUESTION FOR THE ROOM, NOT FOR ONE PERSON (request 109 f). The MarketView board showed "What did you do
   * this period that only you could have done?" under "What to settle together": a question asked of one
   * person, put to everybody. Only a probe that is not addressed to "you" is something to settle together.
   */
  const probe = map?.neutralProbes?.find((q) => !/\b(you|your|yours|yourself)\b/i.test(q));
  if (!probe) return null;
  return { key: 'question', text: probe, mustKeep: [probe] };
}

export const WHY_NO_QUESTION =
  'No question yet. One comes from what kind of thing is in the way, or from the kind of work this is once the record has shown it clearly. Neither is on record here.';
