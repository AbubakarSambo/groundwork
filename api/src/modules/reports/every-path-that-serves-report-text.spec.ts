import { readFileSync, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';

/**
 * REPORT TEXT REACHES A READER BY FOUR PATHS, AND ONLY ONE OF THEM HAD THE RULES.
 *
 * Found by reading one page in the running product, where the same sentence appeared twice:
 *
 *   report tab      "Both agree that the Sam Okoro is responsible for twelve dormant accounts..."
 *   the page beside it   "Both parties agree that the Renewals owner is responsible for twelve..."
 *
 * The reports service does its work in its own read. Everything else selects `sharedPicture`
 * straight out of the column:
 *
 *   /grounds/:id           the brief, and the whole report object spread into the response
 *   /report/rounds         every past round, and what each one led with
 *   /resolution            not report text at all, as it turned out - hardcoded option copy
 *
 * I fixed the first, checked the page, and the sentence was still there. Fixed the second, checked
 * again, still there. Three guesses before asking the response which field carried it, which took
 * one call and would have been the right first move.
 *
 * This is the guard that stops the fourth one being a surprise: anything selecting the report's
 * text columns has to run it through the rule.
 */
const MODULES = join(__dirname, '..');

function tsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsFiles(full, out);
    else if (entry.endsWith('.ts') && !entry.includes('.spec.')) out.push(full);
  }
  return out;
}

/** Files that read report prose out of the database and hand it to somebody. */
const SERVES_REPORT_TEXT = tsFiles(MODULES).filter((f) => {
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  return /sharedPicture:\s*true/.test(src);
});

describe('every path that serves report text applies the rule', () => {
  it('finds the paths at all, so an empty list cannot pass', () => {
    expect(SERVES_REPORT_TEXT.length).toBeGreaterThanOrEqual(2);
  });

  it('and each of them runs the rewrite, itself or through something that does', () => {
    /*
      APPLYING IT IN A SHARED FUNCTION COUNTS, AND HAS TO.

      The board's header serves the same three-sentence summary the check-in list does, so the cut
      AND the rewrite live in one function both call - which is the whole reason neither can drift.
      Read as "does this file contain the word", the board looked like a path that skipped the rule
      when it is the path that cannot skip it: it has no access to the text except through that
      function.

      So a file passes if it rewrites the text itself, or if it gets the text from something in this
      tree that does. The guard is unchanged in what it refuses - a file that selects report prose
      and hands it on raw, by any route, still fails.
    */
    const APPLIES_IT = new Set(
      tsFiles(MODULES)
        .filter((f) => /notTheWordParty/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')))
        .map((f) => basename(f, '.ts')),
    );
    const missing = SERVES_REPORT_TEXT.filter((f) => {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
      if (/notTheWordParty/.test(src)) return false;
      /* Or it imports something that does. */
      const imports = [...src.matchAll(/from '[^']*\/([a-z0-9-]+)'/g)].map((m) => m[1]);
      return !imports.some((name) => APPLIES_IT.has(name));
    }).map((f) => f.replace(MODULES, ''));
    expect(missing).toEqual([]);
  });
});
