import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

/**
 * NOTHING IN HERE IS WIRED TO NOTHING.
 *
 * Three times in one sitting a change was proved against its own builder and
 * reached nobody:
 *
 *   the name restore, tested and bite-checked, with the call removed from the live
 *   path - 321 conversation tests stayed green
 *
 *   three report modules, each tested, none consumed by anything
 *
 *   recordCoachingStep, a public method nothing invoked, written an hour after I
 *   committed a note about exactly this
 *
 * And a fourth that is the same fault wearing different clothes: the restore WAS
 * wired, on the wrong path, so the flow the bug was found in still had it. The
 * tests said done.
 *
 * Every one of those would have been caught the moment it was written by asking a
 * question no reviewer remembers to ask: does anything that is not a test import
 * this?
 *
 * WHAT THIS IS NOT. It is not a coverage rule and not an architecture rule. It
 * says one thing: a module written to change the product has to be reachable from
 * the product. A module that fails this is either unfinished or dead, and both are
 * worth knowing about before somebody trusts its tests.
 *
 * THE ALLOW LIST IS THE INTERESTING PART. Anything on it is a deliberate statement
 * that something is not wired yet and why - which is exactly the information that
 * went missing three times today. Adding a name to it is cheap and honest; leaving
 * a module unwired and unlisted is the thing this catches.
 */

const SRC = join(__dirname);

/**
 * Modules that legitimately have no importer, each with the reason.
 *
 * Kept short on purpose. A long list here means the rule has stopped meaning
 * anything.
 */
const NOT_WIRED_ON_PURPOSE: Record<string, string> = {
  // Nest finds these by convention or by decorator rather than by import.
  'main.ts': 'the entrypoint - nothing imports it, it imports everything',
  // Screens request 93: shared set-up for the request 92 specs, in assistant/ and grounds/, used by tests only.
  // Request 70: shared set-up for the board's seven new section specs, used by tests only.
  'an-organisation-to-set-up-for-specs.ts': 'test-only stand-in organisation shared by the assistant specs; nothing in the product should import it',
  'a-leave-organisation-for-specs.ts': 'test-only stand-in organisation shared by the leave specs; nothing in the product should import it',
  'a-spending-organisation-for-specs.ts': 'test-only stand-in organisation shared by the spending specs; nothing in the product should import it',
  'a-time-sheets-organisation-for-specs.ts': 'test-only stand-in organisation shared by the time sheet specs; nothing in the product should import it',
  'a-whatsapp-inbound-harness.ts': 'test-only set-up shared by the WhatsApp inbound specs; nothing in the product should import it',
  // Week 26: the wording rules every product sentence is held to, run by the board and report specs.
  'a-product-sentence-is-plain.ts': 'the wording check the board and report specs run over every product sentence; a rule read by tests, not served',
  /* Hafsah's quality pass, 18 October: the short run's record (Drop Access, gw_sweep_drop3), as the board specs and the report specs read it. */
  'the-short-run-harness.ts': 'test-only set-up: the short run of Drop Access as the board specs read it; nothing in the product should import it',
  'the-short-run-reports-bed.ts': 'test-only stand-in database holding the short run of Drop Access for the report specs; nothing in the product should import it',
  'request-92-harness.ts': 'test-only set-up shared by the request 92 specs in assistant/ and grounds/; nothing in the product should import it',
  // Duplicated deliberately into the client, and documented there.
  'what-this-ground-can-tell-you.ts': 'shares its rules with client/src/lib/contextStrength.ts by deliberate duplication - see the header in both',
  // Rule modules that exist to be READ by a person and asserted by a spec: they
  // state a boundary the product must not cross, and the enforcement is the test.
  /* Request 36, 27 September 2026: a label never uses the lead's description of a person, so nothing
     calls this any more. Kept with its spec, rather than deleted, until Hafsah says it can go. */
  'the-faults-in-a-judgement.ts': 'finds the faults in a served judgement as evidence for a prompt proposal, and only journey/self-learning-one-cycle.ts makes proposals, by hand; no product path makes one yet, so nothing in the product can call this',
  'a-name-is-short.ts': 'unwired on purpose since request 36: it shortens the lead\'s description into a name, which no label may use now',
  'a-worry-steers-questions-not-findings.ts': "G39's reachability rules, enforced by its spec - the product has no branch that could import a rule saying 'never'",
  /**
   * Was exempt as "awaiting the objectives UI". It has one now: `PersonObjective` has three writes and
   * the ground returns each person's objective with `described` and `mayBeReadAgainst` attached, so this
   * guard correctly told me the exemption was stale the moment it was wired.
   */
  'what-has-to-be-true.ts': 'G15-G19 rules, awaiting the conditions UI',
  'what-setup-never-asked-for.ts': 'G37/G23 questions, awaiting the context chat surface',
  'an-interview-not-a-longer-setup.ts': 'G21/G22, awaiting the post-setup interview surface',
  'role-clarity-is-not-a-score.ts': 'G20/G36, awaiting the contribution record surface',
  /**
   * PHASE 1 OF THE REPORT OVERHAUL, AND UNWIRED IS THE POINT OF IT.
   *
   * It places every field a report can carry into one of the four - two readers, two scopes - so
   * that eight surfaces stop each having an opinion about what belongs on them. Nothing computes
   * anything: every read it names is already built.
   *
   * It is deliberately not wired to a surface yet. Phase 1 was "the map, and no behaviour change",
   * so that the map could be argued with before anything moved. Its spec runs it against the real
   * payload and fails on a field nobody has placed, which is the mechanism - the exemption is for
   * the surfaces, not for the checking.
   *
   * This exemption comes out when the first surface assembles from it. If it is still here after
   * the phases finish, the overhaul stopped halfway and this line is the evidence.
   */
  // Kept in src on purpose (nothing under src may import from outside it), and read by the journey scripts in api/journey/, which are not part of the build.
  'on-this-computer.ts': 'the check the journey scripts run before they talk to a running API, kept in src so a spec can prove it; the journeys import it, the product does not',
  'the-anchor-readers.ts': 'what each reader of an anchor check-in may be served, said once for the journey runner in api/journey/anchor/ and the cross-reader specs; a rule read by scripts and tests, not served',
  'a-hypothesis-is-not-a-finding.ts': "the lead-context corroboration rules, stated as a boundary and asserted by its spec. The behaviour it describes is now enforced by a-lead-note-is-not-evidence.ts, which does the arithmetic on real findings - so this stays as the statement of the rule rather than its implementation.",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * EVERYTHING IS SCANNED. ONLY SOME OF IT IS CHECKED. The distinction is the fix
 * for the first two rounds of false positives.
 *
 * A barrel (index.ts) is imported by its DIRECTORY name - `from '../../common'` -
 * so a stem match never sees it, and twenty came up at once. My first fix skipped
 * barrels entirely, which took them out of the SCAN as well - so every dto, guard,
 * decorator, filter and interceptor that reaches the app through a barrel looked
 * orphaned too. Thirty more.
 *
 * Twenty then thirty is what a rule looks like just before somebody turns it off,
 * and the answer was not a longer allow list: the barrel IS the importer, so it
 * has to stay in the scan and stay out of the check.
 *
 * Fixtures are imported by specs only, which is what they are for.
 */
const allFiles = walk(SRC);

/**
 * The seed and migration scripts under `prisma/` are importers too.
 *
 * They sit outside `src/` because Prisma expects them there, not because they
 * are less real than a controller - `npm run seed:ops` is as much a live entry
 * point as an HTTP route. Scanning only `src/` made a module imported by a seed
 * look orphaned, which is a false positive that would have been paid for with an
 * allow-list entry saying the opposite of the truth.
 *
 * Scanned, never checked: a seed script has no importer BY DESIGN, the way
 * main.ts has none.
 */
const PRISMA_SCRIPTS = walk(join(SRC, '..', 'prisma'));

const sources = new Map<string, string>();
for (const f of [...allFiles, ...PRISMA_SCRIPTS])
  sources.set(f, readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

const files = allFiles.filter(
  (f) => basename(f) !== 'index.ts' && !f.includes('__fixtures__'),
);

/** Whether anything that is not a test imports this file. */
function hasProductionImporter(file: string): boolean {
  const stem = basename(file, '.ts');
  // Matches './stem', '../x/stem', 'src/x/stem' - any specifier ending in the
  // module's own name, which is how every import in this codebase is written.
  // `from './stem'` covers an import; `export ... from './stem'` covers a barrel
  // re-export, which is how most of common/ and every dto reaches the app.
  const pattern = new RegExp(`from\\s+['"][^'"]*\\/${stem}['"]`);
  for (const [other, text] of sources) {
    if (other === file) continue;
    if (pattern.test(text)) return true;
  }
  return false;
}

describe('every module is reachable from the product', () => {
  it('or is listed as not wired yet, with a reason', () => {
    const orphans: string[] = [];
    for (const file of files) {
      const name = basename(file);
      if (name in NOT_WIRED_ON_PURPOSE) continue;
      if (!hasProductionImporter(file)) orphans.push(relative(SRC, file));
    }

    /**
     * THE FAILURE MESSAGE MATTERS AS MUCH AS THE CHECK. "Orphaned module" sends
     * somebody looking for a bug; the real answer is nearly always "I have not
     * wired it in yet", and the fix is one line either way.
     */
    expect({
      orphans,
      whatToDo:
        'Each of these is tested and unreachable. Either wire it into the path it was written for, or add it to NOT_WIRED_ON_PURPOSE with the reason it is waiting.',
    }).toMatchObject({ orphans: [] });
  });

  it('and the allow list holds nothing that has since been wired', () => {
    // A stale exemption is how this rule quietly stops applying: a module gets
    // wired, nobody removes its line, and the next unwired module added under the
    // same name is never noticed.
    const stale: string[] = [];
    for (const name of Object.keys(NOT_WIRED_ON_PURPOSE)) {
      const file = files.find((f) => basename(f) === name);
      if (!file) { stale.push(`${name} (no such file)`); continue; }
      if (hasProductionImporter(file)) stale.push(`${name} (now imported - remove the exemption)`);
    }
    expect(stale).toEqual([]);
  });
});
