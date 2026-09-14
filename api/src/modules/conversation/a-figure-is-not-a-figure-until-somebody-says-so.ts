/**
 * THE NUMBERS A TRACKING CHECK-IN IS FOR, TAKEN OUT OF THE TRANSCRIPT.
 *
 * The implementation-tracking pack presses on exactly one thing harder than anything else: the
 * figures, with where they came from and what period they cover. `ReportedFigure` was built to hold
 * them - what it is a figure OF in the person's own words, minor units, currency, inclusive period
 * dates, a source, and who is attached to it. Twelve contract check-ins exist and the table is
 * empty, because nothing has ever carried an answer from the conversation into it. The chat asks
 * the right question and the answer lands as prose.
 *
 * A MODEL'S READING IS NOT THE FIGURE UNTIL A PERSON SAYS SO. The schema says it and this obeys it:
 * everything written here is unconfirmed, and the comparison engine does not touch an unconfirmed
 * figure. The most dangerous failure in this area is an extracted number quietly becoming a fact
 * somebody is then held to.
 *
 * FOUR REFUSALS, EACH ONE A ROW NOT WRITTEN.
 *
 * No period, no figure. The pack's own line is that a number with no source cannot be compared to
 * anything later, and the same is true of a number with no period: "we did about forty thousand"
 * is a remark, and storing it beside dated figures makes it look like one of them.
 *
 * No source, no figure. Same reason, and the pack asks for it explicitly - a system, a filing, a
 * spreadsheet somebody keeps.
 *
 * An approximation is not a figure. "Roughly", "about", "north of" - the person is telling you they
 * do not have the number to hand, and a rounded number stored as exact is the thing that turns into
 * an argument in the month it matters.
 *
 * And NOTHING IS EVER DESCRIBED AS MISSING, WITHHELD, UNDER-REPORTED, BREACHED OR OWED. That is the
 * pack's hardest rule and it applies to the stored words too: where two numbers do not agree, they
 * do not agree, and that is arithmetic rather than an accusation.
 */

export interface StatedFigure {
  says: string;
  minorUnits: number;
  currency: string;
  periodFrom: Date;
  periodTo: Date;
  source: string;
}

/** The words the pack forbids, checked against what would be STORED rather than only what is said. */
const AN_ACCUSATION = /\b(missing|withheld|conceal(ed|ing)?|under[- ]?report(ed|ing)?|breach(ed|es)?|owed|owes|short(fall)?|hidden|evad(ed|ing))\b/i;

/** "roughly 40k" is somebody telling you they do not have the number. */
const AN_APPROXIMATION = /\b(roughly|approx(imately)?|about|around|circa|ish|or so|north of|south of|give or take|somewhere)\b/i;

const A_CURRENCY = /^[A-Z]{3}$/;

function aDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return null;
  const d = new Date(`${raw.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Turn what came back into figures, or nothing.
 *
 * Minor units are required as an integer rather than derived from a decimal here: rounding a
 * major-unit number into minor units is a place to lose a hundredth of somebody's revenue, and the
 * model is asked for the integer directly so the arithmetic has one owner.
 */
export function theFiguresTheyStated(raw: { figures?: unknown } | null): StatedFigure[] {
  const rows = Array.isArray(raw?.figures) ? (raw!.figures as any[]) : [];
  const out: StatedFigure[] = [];
  for (const r of rows) {
    const says = String(r?.says ?? '').trim();
    const source = String(r?.source ?? '').trim();
    const currency = String(r?.currency ?? '').trim().toUpperCase();
    const minorUnits = r?.minorUnits;
    const periodFrom = aDate(r?.periodFrom);
    const periodTo = aDate(r?.periodTo);

    if (!says || !source) continue;
    if (!A_CURRENCY.test(currency)) continue;
    if (!Number.isInteger(minorUnits) || minorUnits < 0) continue;
    if (!periodFrom || !periodTo || periodFrom > periodTo) continue;
    if (AN_APPROXIMATION.test(says) || r?.approximate === true) continue;
    if (AN_ACCUSATION.test(says) || AN_ACCUSATION.test(source)) continue;

    out.push({ says, minorUnits, currency, periodFrom, periodTo, source });
  }
  // One check-in does not report thirty figures. A long list is a transcript being mined.
  return out.slice(0, 12);
}

/**
 * THE YEAR IS NOT SOMETHING TO GUESS AT.
 *
 * Driven live: a person said "the first to the thirty-first of August" and it came back dated 2024,
 * on a check-in run in 2026. A figure filed under the wrong year is the worst kind of error this
 * table can hold - it reconciles against nothing, it looks exactly like a real row, and the first
 * person to notice is somebody arguing about money two years later.
 *
 * So the date of the check-in is given, and the rule is stated: a period the person did not date
 * belongs to the period being checked in on, and a month with no year is the most recent one that
 * has already happened.
 */
export function theDayThisWasSaid(on: Date): string {
  const iso = on.toISOString().slice(0, 10);
  return `

TODAY IS ${iso}. Every date you return must be a real calendar date on or before it.

When somebody names a month or a quarter without a year, it is the most recent one that has already
finished. "August" said today means the August that has been; it is never a future August and it is
never a year they did not mention. If that leaves you unsure which year they meant, leave the figure
out - a number filed under the wrong year reconciles against nothing and looks exactly like a real
one.`;
}

export const FIGURE_PROMPT = `You are reading ONE side's check-in on an arrangement that is already running. Find every FIGURE they stated about it.

For each one, give:
- says: what it is a figure OF, in the words they used. "revenue", "VAT declared", "units shipped". Never your words for it.
- minorUnits: the amount as an INTEGER in minor units. 1,250.50 in a currency with two decimal places is 125050. Never a decimal, never rounded.
- currency: the three-letter code.
- periodFrom and periodTo: the inclusive calendar dates the figure covers, as YYYY-MM-DD. A period is not a timestamp.
- source: where it came from, in their words - a system, a filing, a spreadsheet somebody keeps.
- approximate: true if they hedged the number at all.

WHEN TO LEAVE IT OUT, which is most of the time:
- They did not say what period it covers. A number with no period cannot be compared to anything later, and storing it beside dated figures makes it look like one of them.
- They did not say where it came from.
- They hedged it. "Roughly forty thousand" is somebody telling you they do not have the number to hand. Mark approximate true and it will be left out.
- You had to work it out. Adding two numbers they gave you, converting a currency, annualising a month - all of those are your arithmetic, not their figure.

An empty list is a correct and common answer. Most periods in most arrangements have no new figure in them.

NEVER describe anything as missing, withheld, under-reported, short, breached or owed, in any field. Where two numbers do not agree, they do not agree; that is arithmetic and it is not an accusation. You are recording what one side said, not checking it.`;

export const FIGURE_SCHEMA = {
  name: 'figures_stated',
  description: 'The figures this side stated about the arrangement, each with the period it covers and where it came from.',
  input_schema: {
    type: 'object',
    properties: {
      figures: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            says: { type: 'string' },
            minorUnits: { type: 'integer' },
            currency: { type: 'string' },
            periodFrom: { type: 'string' },
            periodTo: { type: 'string' },
            source: { type: 'string' },
            approximate: { type: 'boolean' },
          },
          required: ['says', 'minorUnits', 'currency', 'periodFrom', 'periodTo', 'source'],
        },
      },
    },
    required: ['figures'],
  },
} as const;
