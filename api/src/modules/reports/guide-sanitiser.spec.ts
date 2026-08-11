import { readFileSync } from 'fs';
import { join } from 'path';
import { forbiddenNames, namesAnyone, containsQuote, sanitiseGuide } from './guide-sanitiser';

/**
 * THE SECOND TIME AN INSTRUCTIONAL GUARDRAIL LEAKED.
 *
 * The post-report guide's prompt has always forbidden quoting and naming. On a
 * real seven-party ground it produced, for two different participants:
 *
 *   "I want to acknowledge Eric's consistent focus on the strategic outcome."
 *   "...Eric's consistent push to define the 'why'..."
 *
 * One party being told, by name, what another party said in their private
 * check-in. That breaks "it never says who said what about whom", one of four
 * load-bearing promises on the landing page - and it protects the honesty the
 * reports are built from, so it is not a cosmetic promise.
 *
 * The rule this produced: anything derived from a private account is protected
 * STRUCTURALLY - stripped at the read, in code - never by prompt instruction
 * alone. A prompt is a request. A model that obeys it most of the time is worse
 * than one that never does, because it passes review and fails in production.
 *
 * The atStake pass got the stronger form of the same fix: never hand the model
 * the party labels, and it cannot name anyone it was never told about. Here the
 * model must read the party's own record, which names colleagues, so withholding
 * is unavailable and the strip happens on the way out.
 *
 * These tests use the real leaked sentences. If they ever pass with a name in
 * them, the promise is gone.
 */

const PARTIES = [
  { firstName: 'Eric', lastName: 'Abbott', email: 'eric.abbott@meridian.test' },
  { firstName: 'Hafeezah', lastName: 'Bello', email: 'h.bello@meridian.test' },
  { firstName: 'Jo', lastName: 'Ng', email: 'jo@meridian.test' },
];
const NAMES = forbiddenNames(PARTIES);

describe('the names it must know about', () => {
  it('collects first names, surnames and email tokens', () => {
    const values = NAMES.map(n => n.value);
    expect(values).toContain('Eric');
    expect(values).toContain('Abbott');
    expect(values).toContain('Hafeezah');
    // From the local part, so a surname absent from the profile is still caught:
    // Bello appears only in h.bello@ for this party.
    expect(values).toContain('Bello');
  });

  it('protects two-letter names instead of skipping them', () => {
    // The first version skipped anything under three characters, so people called
    // Jo, Ng, Li or Bo had NO protection - the failure landing hardest on the
    // shortest names. They are now matched case-sensitively instead, and the word
    // boundary keeps "Jo" out of "job" and "join".
    expect(NAMES.map(n => n.value)).toContain('Jo');
    expect(NAMES.find(n => n.value === 'Jo')?.caseSensitive).toBe(true);
    expect(namesAnyone('Jo has not weighed in yet.', NAMES)).toBe(true);
    expect(namesAnyone('We have a job to finish and plenty to join up.', NAMES)).toBe(false);
  });

  it('stores one canonical spelling per name, capitalised', () => {
    // Names arrive from the profile ("Eric") and from the email local part
    // ("eric"). Keeping both as separate entries is what defeated the
    // case-sensitive rule below, so there is exactly one, spelled as a name is.
    const values = NAMES.map(n => n.value);
    expect(values).toContain('Eric');
    expect(values).not.toContain('eric');
    expect(new Set(values.map(v => v.toLowerCase())).size).toBe(values.length);
  });
});

/**
 * NAMES THAT ARE ALSO ORDINARY WORDS.
 *
 * Groundwork's users are largely in Nigeria and Kenya, where Success, Progress,
 * Blessing, Precious, Favour, Grace, Faith, Hope, Mercy, Patience and Peace are
 * all common given names - and Will, Mark and May in English generally.
 *
 * Under case-insensitive matching, a ground with a participant called Success
 * produced NO GUIDE AT ALL: the word appears in nearly every line of a report
 * about what success means for the quarter, so every field was stripped. The
 * person whose name it was would be the only one on the ground to receive
 * nothing, which is both a broken feature and a quietly discriminatory one.
 */
describe('a participant named Success does not empty the guide', () => {
  const REAL_WORLD = forbiddenNames([
    { firstName: 'Success', lastName: 'Obi', email: 'success.obi@x.test' },
    { firstName: 'Grace', lastName: 'Mwangi', email: 'grace@x.test' },
    { firstName: 'Will', lastName: 'Ade', email: 'will@x.test' },
  ]);

  it('matches collision-prone names case-sensitively', () => {
    for (const name of ['Success', 'Grace', 'Will']) {
      expect(REAL_WORLD.find(n => n.value === name)?.caseSensitive).toBe(true);
    }
    // A surname with no ordinary-word meaning stays case-insensitive, so a model
    // lowercasing it is still caught.
    expect(REAL_WORLD.find(n => n.value === 'Mwangi')?.caseSensitive).toBe(false);
  });

  it('keeps the ordinary word', () => {
    expect(namesAnyone('It looks like we have different views of what success is for the quarter.', REAL_WORLD)).toBe(false);
    expect(namesAnyone('We will deliver a stable v1 by the end of the quarter.', REAL_WORLD)).toBe(false);
    expect(namesAnyone('There is grace in how that was handled.', REAL_WORLD)).toBe(false);
  });

  it('still catches the name', () => {
    expect(namesAnyone('Success has been clear that the deadline matters.', REAL_WORLD)).toBe(true);
    expect(namesAnyone('Will raised the scope question.', REAL_WORLD)).toBe(true);
    expect(namesAnyone("Grace's focus has been the partner deadline.", REAL_WORLD)).toBe(true);
  });

  it('does not silently produce an empty guide for the person named Success', () => {
    const { guide, dropped } = sanitiseGuide({
      openingLine: 'It looks like we have different views of what success is for the quarter.',
      questionToCarry: 'What single outcome will completing our list have created?',
      toAcknowledge: 'Another account measures success by what a partner can use.',
    }, REAL_WORLD);
    expect(dropped).toEqual([]);
    expect(Object.keys(guide)).toHaveLength(3);
  });
});

describe('the sentence that actually leaked', () => {
  const LEAKED = "I want to acknowledge Eric's consistent focus on the strategic outcome of a stable v1.";

  it('is detected', () => {
    // A possessive is exactly the form it took, and \b falls between the name
    // and the apostrophe.
    expect(namesAnyone(LEAKED, NAMES)).toBe(true);
  });

  it('is dropped rather than shown', () => {
    const { guide, dropped } = sanitiseGuide({ toAcknowledge: LEAKED }, NAMES);
    expect(guide.toAcknowledge).toBeUndefined();
    expect(dropped).toEqual([{ field: 'toAcknowledge', reason: 'names-a-party' }]);
  });

  it('is dropped whole, never redacted into a gap', () => {
    // "I want to acknowledge ___'s focus" still says a specific person was
    // discussed, and reads as a cover-up. Silence is the honest outcome.
    const { guide } = sanitiseGuide({ toAcknowledge: LEAKED }, NAMES);
    expect(JSON.stringify(guide)).not.toMatch(/acknowledge/);
    expect(JSON.stringify(guide)).not.toMatch(/\[redacted\]|___|\*\*\*/);
  });

  it('catches the name whatever the casing', () => {
    expect(namesAnyone('eric was clear about this', NAMES)).toBe(true);
    expect(namesAnyone('ERIC was clear about this', NAMES)).toBe(true);
  });

  it('does not fire on a word that merely contains a name', () => {
    // "generic" contains "eric". Word boundaries, not substrings - otherwise the
    // strip empties guides for no reason and gets switched off.
    expect(namesAnyone('This is a generic observation about scope.', NAMES)).toBe(false);
  });
});

describe('quotes, including the harmless-looking kind', () => {
  it('catches the scare-quoted phrase from the other leaked line', () => {
    // "the 'why'" looks innocuous and is a form of words lifted from a private
    // record, which identifies its author about as well as a name.
    expect(containsQuote('...consistent push to define the ‘why’ for the quarter.')).toBe(true);
    expect(containsQuote('They described it as "a stable v1".')).toBe(true);
  });

  it('does not mistake a possessive for a quotation', () => {
    // Same carve-out the board makes. Without it, ordinary English is unusable.
    expect(containsQuote("another account's view of the timeline")).toBe(false);
    expect(containsQuote('another account’s view of the timeline')).toBe(false);
  });

  it('does not mistake CONTRACTIONS for a quotation - the real false positive', () => {
    // These two are verbatim from the first sanitised run, where both were
    // dropped as "contains-a-quote" and neither contains one. The apostrophe in
    // "I'm" opened a match that closed on the one in "we're".
    //
    // A false positive here silently deletes good advice and makes the strip look
    // expensive, which is how a safety mechanism gets argued away. It is not a
    // lesser failure than a false negative, just a quieter one.
    expect(containsQuote(
      "I'm thinking about the gap between our list of tasks and our larger definition of success. I want to make sure the work we're logging is adding up to the right quarterly outcome.",
    )).toBe(false);
    expect(containsQuote(
      "I'm looking at the different ways we're defining success and want to be sure we agree on the main goal for the quarter.",
    )).toBe(false);
  });

  it('still catches a real quote in a sentence full of contractions', () => {
    // The carve-out must not become a loophole: neutralising word-internal
    // apostrophes cannot be allowed to swallow actual quoting around them.
    expect(containsQuote(`I'm not sure we're agreed on what "done" means here.`)).toBe(true);
    expect(containsQuote("I'm not sure we're agreed on what ‘done and shipped’ means.")).toBe(true);
  });

  it('drops a quoting field and says why', () => {
    const { guide, dropped } = sanitiseGuide(
      { questionToCarry: 'What does "done" mean for the quarter?' },
      NAMES,
    );
    expect(guide.questionToCarry).toBeUndefined();
    expect(dropped).toEqual([{ field: 'questionToCarry', reason: 'contains-a-quote' }]);
  });
});

describe('what survives', () => {
  it('keeps a clean field untouched', () => {
    const clean = 'How success is defined for the quarter is not settled between the accounts.';
    const { guide, dropped } = sanitiseGuide({ openingLine: clean }, NAMES);
    expect(guide.openingLine).toBe(clean);
    expect(dropped).toEqual([]);
  });

  it('keeps the clean fields when only one is bad', () => {
    // Partial value is real value. Dropping the whole guide over one bad line
    // would make the strip expensive enough to argue about.
    const { guide, dropped } = sanitiseGuide(
      {
        openingLine: 'The accounts do not agree on what success means this quarter.',
        questionToCarry: 'What would we have to see by the end of the quarter to call it done?',
        toAcknowledge: "Eric has been consistent about the strategic outcome.",
      },
      NAMES,
    );
    expect(guide.openingLine).toBeDefined();
    expect(guide.questionToCarry).toBeDefined();
    expect(guide.toAcknowledge).toBeUndefined();
    expect(dropped).toHaveLength(1);
  });

  it('returns nothing at all when every field is bad', () => {
    const { guide } = sanitiseGuide(
      { openingLine: 'Eric said this.', questionToCarry: 'What did "we" agree?', toAcknowledge: "Hafeezah's point." },
      NAMES,
    );
    expect(guide).toEqual({});
  });

  it('handles absent and blank fields without inventing them', () => {
    const { guide, dropped } = sanitiseGuide({ openingLine: '   ', toAcknowledge: undefined }, NAMES);
    expect(guide).toEqual({});
    expect(dropped).toEqual([]);
  });
});

describe('the service applies it, and the flag stays off', () => {
  const SERVICE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');

  it('sanitises before storing', () => {
    /**
     * MATCHES THE CALL, NOT THE DECLARATION KEYWORD. This asserted on
     * `const { guide, dropped } = ...` and went red when the variables became
     * reassignable to hold a retry - a real improvement failing a test about
     * punctuation. What matters is that the sanitiser runs on the model's output
     * before anything is stored, which is what the pattern says now.
     */
    expect(SERVICE).toMatch(/sanitiseGuide\(result, names\)/);
    // And that a retry, if one happens, is sanitised too rather than trusted.
    expect(SERVICE).toMatch(/sanitiseGuide\(retry, names\)/);
    // Stored value is the sanitised one, never the raw extraction.
    expect(SERVICE).toMatch(/guides\[participantId\] = guide;/);
    expect(SERVICE).not.toMatch(/guides\[participantId\] = result;/);
  });

  it('builds the forbidden list from the ground, not from a hardcoded list', () => {
    expect(SERVICE).toMatch(/const names = forbiddenNames\(/);
    expect(SERVICE).toMatch(/groundParticipant\.findMany\(\{\s*\n\s*where: \{ groundId: report\.groundId \}/);
  });

  it('stores nothing when a guide is stripped empty', () => {
    expect(SERVICE).toMatch(/if \(Object\.keys\(guide\)\.length === 0\) return;/);
  });

  it('logs each drop, so a still-misbehaving prompt is visible', () => {
    expect(SERVICE).toMatch(/Dropped post-report guide field/);
  });

  it('is still gated off pending review', () => {
    // The flag stays off until a re-reviewed preview shows zero names, zero
    // quotes, and a top line that matches the finding.
    expect(SERVICE).toMatch(/if \(!this\.config\.get<boolean>\('app\.postReportGuideEnabled'\)\)/);
  });
});

describe('the prompt no longer contradicts the report or invent a meeting', () => {
  const SERVICE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
  const PROMPT = (() => {
    const i = SERVICE.indexOf('const POST_REPORT_GUIDE_PROMPT');
    return SERVICE.slice(i, SERVICE.indexOf("].join('\\n')", i)).replace(/\s+/g, ' ');
  })();

  it('forbids opening on reassurance, and says it in the first clause', () => {
    // Five of seven real guides opened with "we're aligned" or "tracking well"
    // on a ground whose whole finding was a definitional gap - which buries the
    // finding and makes whoever raises it sound like the difficult one. A first
    // pass at this instruction cut it to three of seven, so the rule now names
    // the FIRST CLAUSE and carries the three real failures as worked examples.
    expect(PROMPT).toMatch(/LEAD WITH THE GAP, NOT WITH REASSURANCE/);
    expect(PROMPT).toMatch(/FIRST CLAUSE of the opening line must be about what is not settled/);
    expect(PROMPT).toMatch(/These are all wrong/);
    // The banned openers, so a future trim cannot quietly drop the list.
    for (const opener of ['it is great', 'it is good', 'I am glad', 'we are tracking well']) {
      expect(PROMPT).toContain(opener);
    }
  });

  it('asks for the opening to be anchored in this party\'s own record', () => {
    // All seven openings on the first clean run were near-paraphrases of the same
    // sentence, because each only restated the shared finding. Two colleagues
    // comparing notes would find they had been handed the same words.
    // Wording updated in the plain-language pass: "this party's own record"
    // became "what this person themselves said". The rule this pins is unchanged;
    // only the register moved. No escaped apostrophe to work around now, which
    // is itself a small sign the sentence got plainer.
    expect(PROMPT).toMatch(/ANCHOR THE OPENING IN WHAT THIS PERSON THEMSELVES SAID/);
    expect(PROMPT).toMatch(/comes out near-identical for all of them/);
  });

  it('forbids revealing which side of the gap anyone is on', () => {
    // The way personalisation could leak: "the others think X, you think Y" is a
    // register of who agrees with whom.
    expect(PROMPT).toMatch(/Do not say which side of the gap anyone else is on/);
    expect(PROMPT).toMatch(/Counting sides is taking a register/);
  });

  it('forbids assuming a meeting', () => {
    // All seven assumed a room. There may be no conversation scheduled at all.
    expect(PROMPT).toMatch(/DO NOT ASSUME A MEETING/);
    expect(PROMPT).toMatch(/in the room/);
  });

  it('still asks for no names and no quotes, belt as well as braces', () => {
    // The strip is the guarantee; the instruction reduces how often it fires.
    expect(PROMPT).toMatch(/NEVER NAME ANYONE AND NEVER QUOTE ANYONE/);
    expect(PROMPT).toMatch(/discarded before the person sees it/);
  });
});
