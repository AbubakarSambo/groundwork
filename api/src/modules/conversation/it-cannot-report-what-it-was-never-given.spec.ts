import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A REPORT INVENTED TWO PARTIES, A NAME, AND A CLAIM ABOUT WHO HAD CHECKED IN.
 *
 * Observed on a live participant report:
 *
 *   "Two of the three parties on this ground, Hafsah Jumare and the 2nd lead, have not yet
 *    contributed a record. The picture below is therefore drawn from Hafsah Jumare's account alone."
 *
 * Three separate fabrications and a self-contradiction in one sentence: the count, the second name,
 * the claim about contribution, and naming the same person as both absent and the sole source.
 *
 * THE PART THAT MAKES IT STRUCTURAL RATHER THAN A WORDING SLIP. `buildSoloArtifact` passes the
 * model ONE thing: that person's own record entries, joined as `(type) text`. No roster, no party
 * count, no other participant, nothing about who has checked in. So every fact in that sentence
 * was produced from an input that contained none of it.
 *
 * `labelsForParties` never emits "2nd" either - it produces letter suffixes, "lead A" and
 * "participant B". So the label was not a leak from the labelling code. It was invented.
 *
 * The existing tally detector DID catch this sentence - `countsAccounts` returns "Two of the three"
 * for it - and shipped it anyway, because that detector is deliberately advisory: cutting a tally
 * out of a divergence claim changes what the claim says. That reasoning is right there and wrong
 * here, because here the claim is not a judgement about the work, it is a fabricated fact.
 */
/**
 * Comments stripped, as the ratchet requires - and it caught this file. The docblock above quotes
 * the fabricated sentence verbatim, including "2nd lead", so an assertion matching that string
 * against the raw file could have been satisfied by this explanation rather than by the rule.
 */
const CODE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the solo artifact is given one person and nothing else', () => {
  const method = CODE.slice(CODE.indexOf('async buildSoloArtifact('), CODE.indexOf('async buildSoloArtifact(') + 900);

  it('reads only this participant own entries', () => {
    expect(method).toMatch(/where: \{ participantId, participant: \{ groundId \} \}/);
  });

  it('and the corpus is those entries, with nothing else joined in', () => {
    /**
     * The guard that makes the prompt rules enforceable. If a roster or a party count is ever
     * added to this corpus, the model may legitimately mention them and every rule below becomes
     * a lie - so the input has to stay this narrow for the instruction to mean anything.
     */
    expect(method).toMatch(/const corpus = entries\.map\(\(e\) => `\(\$\{e\.type\}\) \$\{e\.text\}`\)\.join\('\\n'\)/);
    expect(method).not.toMatch(/roster|parties|participantCount|groundParticipant\.findMany/i);
  });
});

describe('the prompt forbids every fact it does not have', () => {
  const prompt = CODE.slice(CODE.indexOf('const SOLO_ARTIFACT_PROMPT'), CODE.indexOf('const SOLO_ARTIFACT_PROMPT') + 2600);

  it('says outright that the party count is not in the input', () => {
    expect(prompt).toMatch(/Never state or imply a number of parties/i);
  });

  it('forbids naming or inventing another person', () => {
    expect(prompt).toMatch(/Never refer to another person by name, role or position/i);
    expect(prompt).toMatch(/2nd lead/);
  });

  it('forbids claiming who has or has not contributed', () => {
    expect(prompt).toMatch(/Never say whether anybody has or has not checked in, contributed/i);
  });

  it('and forbids the second half of the contradiction', () => {
    /** "drawn from X's account alone" is the same fabrication wearing a different hat. */
    expect(prompt).toMatch(/Never say whose account this picture is drawn from/i);
  });

  it('it also addresses the reader as you, matching the report body', () => {
    /** Release 3 made the report speak to its reader. The solo summary is part of that report. */
    expect(prompt).toMatch(/Address them directly as "you" and "your", never by name/i);
  });
});

describe('there is one solo prompt, not two', () => {
  it('reports.service no longer defines a dead copy', () => {
    /**
     * Both files defined this pair and only one was called. They had already drifted: the dead copy
     * said "under 150 words", the live one 200, and neither carried the anti-invention rules. A
     * dead prompt is worse than no prompt - whoever hardens it next has even odds of editing the
     * one that never runs.
     */
    const reports = readFileSync(join(__dirname, '../reports/reports.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(reports).not.toMatch(/const SOLO_ARTIFACT_PROMPT\s*=/);
    expect(reports).not.toMatch(/const SOLO_ARTIFACT_SCHEMA\s*=/);
  });
});
