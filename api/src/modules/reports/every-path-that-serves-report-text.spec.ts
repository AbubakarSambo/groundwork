import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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

  it('and each of them runs the rewrite', () => {
    const missing = SERVES_REPORT_TEXT.filter((f) => {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
      return !/notTheWordParty/.test(src);
    }).map((f) => f.replace(MODULES, ''));
    expect(missing).toEqual([]);
  });
});
