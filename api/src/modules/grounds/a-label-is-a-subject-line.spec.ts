import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE GROUND LABEL IS A SUBJECT LINE IN SOMEBODY ELSE'S INBOX.
 *
 * `email.service.ts` interpolates it directly: "{founder} invited you to check in on: {label}". So it
 * is not an internal title. It is the first thing a person reads about work they are about to be
 * asked to account for, and it arrives before they have opened anything.
 *
 * TWO GENERATIONS OF IT WERE WRONG.
 *
 * First the generator fell back to the raw scenario enum, so nineteen of twenty-two rows read
 * "NEW HIRE ground", "COHORT CHECK ground", and one read "PIP ground" - meaning somebody on a
 * performance plan received an email headed "Sahar Okonkwo invited you to check in on: PIP ground".
 *
 * Then the fix put the participant's name first, "Abubakar, new hire", to make an inbox
 * recognisable. That renders as "invited you to check in on: Abubakar", which makes the PERSON the
 * subject of the sentence. A message to the second party is anchored to the topic and never to them.
 */
const MIGRATION = readFileSync(
  join(__dirname, '../../../prisma/migrations/20260820120000_relabel_generated_grounds/migration.sql'),
  'utf8',
);
/*
 * THE GENERATOR MOVED WITH THE FLOW THAT CALLS IT.
 *
 * `/grounds/new` was a form whose last screen created the check-in and named it. It is a picker now
 * that hands over to the setup conversation, and that conversation's save is the only thing that
 * creates one - so the fallback name is `fallbackGroundName` in EntryChatPage.tsx.
 *
 * The rule is unchanged and is what this file is for: a label is a subject line in somebody else's
 * inbox, so it names the TOPIC and never the person, and never the raw enum in shouting caps.
 */
const GENERATOR = readFileSync(
  join(__dirname, '../../../../client/src/pages/enter/EntryChatPage.tsx'), 'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the generator names the topic, never the person', () => {
  it('takes no participant argument at all', () => {
    /** The strongest form of the guarantee: it cannot name somebody it was never given. */
    /* U.6 review: the second argument is where it runs (the organisation), not the lead's words,
       which an invitation never carries (Hafsah, 27 September). Still no participant argument. */
    /* 2724c9964 added a third argument, what the lead described so far, from which only a few fixed words are chosen
       (KINDS_OF_WORK), never her sentence: still no participant argument. */
    expect(GENERATOR).toMatch(/export function fallbackGroundName\(situation\?: string, where\?: string(?:, saidSoFar\?: string)?\)/);
    expect(GENERATOR).not.toMatch(/fallbackGroundName\([^)]*participants\[0\]/);
    expect(GENERATOR).not.toMatch(/fallbackGroundName\([^)]*peopleNamed/);
  });

  it('and no longer builds a "Name, topic" string', () => {
    expect(GENERATOR).not.toMatch(/\$\{name\}, \$\{base/);
  });

  /*
   * CHANGED IN THE U.6 REVIEW. This required the fallback to go on to "what the person actually
   * typed". That is the lead's own words, and they became the subject of the invitation sent to the
   * person they were about ("Daniel isn't hitting his targets" to Daniel). Hafsah decided on 27
   * September that an invitation never carries the lead's private words, not even reworded. So it
   * falls back to the situation in plain words, then to a neutral "A check-in", never to her words.
   * The rule this file is for, the topic and never the person, is unchanged.
   */
  it('falls back to the situation, then to a neutral name, never to what the lead typed', () => {
    expect(GENERATOR).toMatch(/const fromScenario = \(situation \?\? ''\)/);
    expect(GENERATOR).not.toMatch(/firstDescription/);
    expect(GENERATOR).toMatch(/at \? `A check-in at \$\{at\}` : 'A check-in'/);
    expect(GENERATOR).not.toMatch(/'Untitled'/);
  });

  it('and never to the raw enum in shouting caps', () => {
    /** "NEW HIRE ground" is what nineteen rows had to be repaired from. */
    expect(GENERATOR).not.toMatch(/scenario\?\.replace\(\/_\/g, ' '\)\} ground/);
    /* The underscores go and the shouting stops: NEW_HIRE becomes "New hire", never "NEW HIRE". */
    expect(GENERATOR).toMatch(/\.replace\(\/_\/g, ' '\)\s*\n?\s*\.toLowerCase\(\)/);
    expect(GENERATOR).toMatch(/\.replace\(\/\^\\w\/, \(c\) => c\.toUpperCase\(\)\)/);
  });
});

describe('the repair migration is narrow, and safe on typed labels', () => {
  it('matches only the generator\'s exact shape', () => {
    /**
     * Capitals then the literal word " ground". Three rows in this database are typed test labels
     * and must survive untouched; a looser pattern would have rewritten somebody's own words.
     */
    expect(MIGRATION).toMatch(/WHERE "label" ~ '\^\[A-Z\]\[A-Z \]\* ground\$'/);
  });

  it('leaves any scenario it does not recognise alone', () => {
    /** ELSE "label" rather than ELSE NULL or a default string. A new scenario must not be renamed. */
    expect(MIGRATION).toMatch(/ELSE "label"/);
  });

  it('and PIP does NOT become its own card label', () => {
    /**
     * The card says "Performance improvement plan". This string is read by the person being
     * reviewed, and participant-facing copy carries no "performance". It becomes the reframed
     * wording instead.
     */
    expect(MIGRATION).not.toMatch(/WHEN 'PIP'\s+THEN 'Performance/);
    expect(MIGRATION).toMatch(/WHEN 'PIP'\s+THEN 'Work that is off track'/);
  });

  it('no replacement text carries a forbidden word', () => {
    const replacements = [...MIGRATION.matchAll(/THEN '([^']+)'/g)].map(m => m[1]);
    expect(replacements.length).toBeGreaterThan(10);
    for (const r of replacements) {
      expect(r).not.toMatch(/ground|performance|review|assessment|evaluation|improvement/i);
    }
  });
});
