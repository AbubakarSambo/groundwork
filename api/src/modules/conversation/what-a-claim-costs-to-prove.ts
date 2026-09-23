/**
 * WHAT A CLAIM COSTS TO PROVE.
 *
 * "It is a generic conversation not by an expert." The conversation knows what is MISSING from a
 * claim - see what-we-have-so-far, which ranks the holes - and asking "what is the baseline?" is
 * still a form asking for a field. What an expert does is name what the claim would actually take,
 * so the person can see the problem themselves:
 *
 *   form    "What is the current income figure?"
 *   expert  "A before-and-after income figure for 30,000 women is a two-round survey of 30,000
 *            people. Most programmes cannot carry that and end up proxying it. Are you running the
 *            survey, or is there a channel whose volume you can read?"
 *
 * WHERE THE AUTHORITY COMES FROM, AND IT IS NOT DOMAIN KNOWLEDGE.
 *
 * Everything here is true by the STRUCTURE of the claim - arithmetic, or the definition of the
 * thing being claimed. Nothing is an empirical fact about Nigeria, about horticulture, or about
 * what usually happens. That is deliberate and it is the whole reason this can be trusted to
 * challenge somebody: a claim that 30,000 people's incomes will be compared before and after
 * entails 60,000 measurements whoever is doing it and wherever they are, and saying so cannot be
 * wrong. An empirical claim - "yield gains are usually lost to gluts" - might be true and is not
 * ours to assert; that belongs to the other respondents, as a count, and lives in the precedent
 * read instead.
 *
 * ONE PER TURN, AND ALWAYS ENDING IN A QUESTION. A challenge that does not hand the turn back is a
 * lecture, and two in a row is a cross-examination - see the-same-burden-on-both-sides for what
 * that does to somebody.
 */
import type { Claim } from './what-we-have-so-far';

/** A figure as somebody wrote it, as a number. "30k" and "30,000" are the same thirty thousand. */
export function howManyTheyMeant(number: string | null | undefined): number | null {
  const t = (number ?? '').toLowerCase().replace(/[, ]/g, '');
  const m = /^([0-9]*\.?[0-9]+)\s*(k|m|thousand|million)?/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const scale = m[2] === 'k' || m[2] === 'thousand' ? 1_000 : m[2] === 'm' || m[2] === 'million' ? 1_000_000 : 1;
  return Math.round(n * scale);
}

/** A verification that means asking people, rather than reading something that already exists. */
const MEANS_ASKING_PEOPLE =
  /\b(survey|surveys|interview|interviews|questionnaire|asking them|ask them|census|panel|focus group|data from the (women|men|farmers|people|households))\b/i;

/** A verification that is a record somebody already keeps. */
const MEANS_READING_A_RECORD =
  /\b(sales records?|records?|invoices?|receipts?|weighbridge|ledger|crm|system|statements?|bank|meter|scale)\b/i;

/** Claims whose figure is a change rather than a level. */
const IS_A_CHANGE = /(%|percent|increase|rise|growth|up|more|double|triple|reduce|reduction|less|down)/i;

export interface AChallenge {
  /** What it says, ending in a question. */
  say: string;
  /**
   * WHICH CHALLENGE THIS IS, not which claim.
   *
   * Keyed on the pair, because my first version keyed on the claim alone - so putting the
   * measurement challenge to her income target silently ruled out ever asking which half of it she
   * meant. Two different challenges about one claim, several turns apart, is a conversation. The
   * same challenge twice is doubting somebody.
   */
  key: string;
  /** Which claim it is about, for the log. */
  claimId: string;
  /** Why this is assertable: the structural fact it rests on. Never shown to anybody. */
  restsOn: string;
}

/**
 * A HEAD-COUNT AND A BEFORE-AND-AFTER ARE A SURVEY RUN TWICE.
 *
 * Her own claim: thirty thousand women, income up thirty per cent, measured from data taken from
 * the women before and after. That is sixty thousand measurements, and saying so is arithmetic.
 */
function theSizeOfTheMeasurement(c: Claim): AChallenge | null {
  const how = c.verification ?? '';
  if (!MEANS_ASKING_PEOPLE.test(how)) return null;
  const people = howManyTheyMeant(c.number);
  if (!people || people < 500) return null;
  const twice = /\bbefore and after\b|\bbaseline\b|\bendline\b|\bchange\b/i.test(how) || IS_A_CHANGE.test(c.said);
  const measurements = twice ? people * 2 : people;
  return {
    claimId: c.id,
    key: `${c.id}:size`,
    restsOn: 'arithmetic: one measurement per person, twice where it is a before and after',
    say: [
      `You have said this is measured by ${how.trim()}, for ${people.toLocaleString('en-GB')} people.`,
      twice
        ? `That is ${measurements.toLocaleString('en-GB')} measurements - once before and once after, and the same people both times.`
        : `That is ${measurements.toLocaleString('en-GB')} measurements.`,
      'Is somebody running that, or is there a record already being kept that would show the same thing?',
    ].join(' '),
  };
}

/**
 * INCOME IS PRICE TIMES VOLUME, AND A RISE IN ONE IS NOT A RISE IN THE OTHER.
 *
 * Definitional, not empirical. With no volume named, a thirty per cent income rise is consistent
 * with selling exactly as much at a higher price - which is a good year, not an intervention.
 */
const COMPOUNDS: { of: RegExp; parts: [string, string]; why: string }[] = [
  { of: /\b(income|revenue|turnover|earnings|sales value)\b/i, parts: ['the price they get', 'how much they sell'], why: 'income is price times volume' },
  { of: /\b(growth|grew|grow)\b/i, parts: ['new customers', 'customers who stayed'], why: 'growth is new plus retained' },
];

function whichHalfTheyMean(c: Claim): AChallenge | null {
  const subject = `${c.measure ?? ''} ${c.said}`;
  const found = COMPOUNDS.find((x) => x.of.test(subject));
  if (!found) return null;
  /* Only where they have given one side and not the other. Both named is not a gap. */
  if (c.baseline && c.number) return null;
  return {
    claimId: c.id,
    key: `${c.id}:halves`,
    restsOn: `definition: ${found.why}`,
    say: [
      `${found.why.charAt(0).toUpperCase()}${found.why.slice(1)}.`,
      `With nothing said about ${found.parts[1]}, a rise here could be ${found.parts[0]} moving on its own.`,
      `Which of the two are you aiming at?`,
    ].join(' '),
  };
}

/**
 * A RECORD THAT IS SOMEBODY ELSE'S IS A RECORD YOU CANNOT READ.
 *
 * Definitional again: a measure taken from a record names whoever keeps it, and where that is not
 * the person answering, the claim depends on access nobody has mentioned.
 */
function whoseRecordItIs(c: Claim): AChallenge | null {
  const how = c.verification ?? '';
  if (!MEANS_READING_A_RECORD.test(how) || MEANS_ASKING_PEOPLE.test(how)) return null;
  /* They have already said whose. */
  if (/\b(our|my|we|us|in-house|internal)\b/i.test(how)) return null;
  return {
    claimId: c.id,
    key: `${c.id}:whose`,
    restsOn: 'definition: a record is kept by somebody, and reading it needs their agreement',
    say: `You would read this off ${how.trim()}. Whose records are those, and do you get to see them?`,
  };
}

const IN_ORDER = [theSizeOfTheMeasurement, whichHalfTheyMean, whoseRecordItIs];

/**
 * The one challenge worth putting, or null.
 *
 * `alreadyPut` are the challenge keys already used this session. The same challenge is never put
 * twice, because a person who has answered one and is asked it again has not been challenged, they
 * have been doubted. A DIFFERENT challenge about the same claim is allowed, and has to be: the
 * measurement one and the which-half one are two different problems with one sentence.
 */
export function theChallengeWorthPutting(
  claims: Claim[] | null | undefined,
  alreadyPut: string[] = [],
): AChallenge | null {
  const put = new Set(alreadyPut);
  for (const make of IN_ORDER) {
    for (const c of claims ?? []) {
      const challenge = make(c);
      if (challenge && !put.has(challenge.key)) return challenge;
    }
  }
  return null;
}

/** What the conversation is told, where there is a challenge to put. */
/* Named `sayThisChallenge` rather than `putThisToThem`: the conversation already has a local
   `putThisToThem` block in the prompt join, and a second one of the same name compiled to a string
   being called as a function. */
export function sayThisChallenge(challenge: AChallenge): string {
  return [
    'PUT THIS TO THEM. It is the most useful thing you can say this turn.',
    challenge.say,
    '',
    'Say it as your own sentence, in the words they have been using, and end on the question. Do not soften it into a request for a field - the point is that they can see the problem themselves.',
    'One of these per turn, and never the same one twice: somebody asked again has not been challenged, they have been doubted.',
  ].join('\n');
}
