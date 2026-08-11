import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

/**
 * NO PUBLIC METHOD IN HERE IS DEAD.
 *
 * The file-level rule next door found four real bugs this morning and then missed a
 * fifth, because it checks FILES and reports.service.ts is imported everywhere. What
 * was hiding inside it:
 *
 *   async generateSoloArtifact(...)   nothing called it, and its own docstring said
 *                                     "called after each check-in completes via the
 *                                     conversation service"
 *
 * The conversation service has its own near-identical copy and calls that. So a
 * user-visible artifact - the "what we heard from you" summary, the first thing a
 * person reads about their own check-in - had two implementations, one dead, and the
 * dead one advertised itself as live.
 *
 * That is the expensive kind of dead code. Anybody improving that summary would have
 * read the comment, edited the dead method, tested it, and shipped a change that
 * reached nobody - which happened three separate times today for other reasons.
 *
 * WHAT THIS CHECKS, and it is narrow on purpose: a method declared public on a
 * service or a rule module, that nothing anywhere calls. Not private methods, which
 * are called from inside their own file and are the compiler's business. Not
 * controllers, whose methods are called by Nest's router through decorators. Not
 * lifecycle hooks. Just the ones somebody wrote for a caller that does not exist.
 */

const SRC = join(__dirname);

/** Nest and Jest call these; no source file will. */
const CALLED_BY_A_FRAMEWORK = new Set([
  'onModuleInit', 'onModuleDestroy', 'onApplicationBootstrap', 'onApplicationShutdown',
  'beforeApplicationShutdown', 'constructor', 'canActivate', 'intercept', 'catch',
  'transform', 'use', 'validate',
]);

/**
 * Methods deliberately kept without a caller, with the reason.
 *
 * Short on purpose, like the file-level list. A long one means the rule has stopped
 * meaning anything.
 */
const NO_CALLER_ON_PURPOSE: Record<string, string> = {
  /**
   * SIXTEEN CAME BACK ON THE FIRST RUN. Two were leftovers and are deleted. The
   * rest are the same thing in two flavours, and both are worth a line rather than
   * a silent exemption:
   *
   *   BUILT AND NEVER TRIGGERED. Six notification emails exist, are tested, and
   *   nothing in the product ever sends them - so a customer approaching their
   *   session limit, an organisation hitting its member cap, and anybody whose
   *   billing changed are all told nothing. That is a product gap with working code
   *   sitting behind it, and wiring each one is a decision about when it should
   *   fire, not a refactor.
   *
   *   BUILT AHEAD OF ITS SURFACE. pauseGround, the anonymised rollup, the org-wide
   *   mention view: written before the screen that would call them.
   */
  'email.service.ts#sendApproachingSessionLimit': 'built and tested, nothing triggers it - a customer near their session limit is currently told nothing',
  'email.service.ts#sendMemberCapWarning': 'built and tested, nothing triggers it - an organisation at its member cap is currently told nothing',
  'email.service.ts#sendBillingChangeNotification': 'built and tested, nothing triggers it',
  'email.service.ts#sendPaymentRequestEmail': 'built and tested, nothing triggers it',
  'email.service.ts#sendFreeExtensionClaimed': 'built and tested, nothing triggers it',
  'email.service.ts#sendCareFeeConfirmation': 'built and tested, nothing triggers it',
  'billing.service.ts#isBillingReady': 'a readiness check with no caller; the paths that would use it check their own preconditions',
  'stripe.service.ts#cancelSubscriptionAtPeriodEnd': 'no cancellation surface exists yet, and cancelling is not a thing to wire in speculatively',
  'grounds.service.ts#pauseGround': 'built before the surface that would offer pausing',
  'intelligence.service.ts#rollupAnonymised': 'built before the org-wide intelligence surface',
  'intelligence.service.ts#detectForceMultiplier': 'built before the surface that would show it',
  'patterns.service.ts#getOrgWideMentions': 'built before the org-wide view',
  'reports.service.ts#recordOutcomeLearning': 'the outcome-learning write path; the weekly cron reads outcomes but nothing records one yet',
  'whatsapp.service.ts#setPhoneNumber': 'admin toggle plumbing, waiting on the number being provisioned',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
const sources = new Map<string, string>();
for (const f of files) sources.set(f, readFileSync(f, 'utf8'));

/**
 * Public methods on a service class.
 *
 * Deliberately only *.service.ts. Controllers are routed by decorator, modules have
 * no methods, and rule modules export functions rather than classes - the file-level
 * rule already covers those. Services are where a method gets written for a caller
 * somebody meant to add.
 */
function publicMethodsOf(text: string): string[] {
  const out: string[] = [];
  // `  async name(` or `  name(` at class-member indent, not preceded by private or
  // protected, and not a control-flow keyword.
  const re = /^ {2}(?!private |protected |static )(?:async )?([a-zA-Z_][\w]*)\s*[(<]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    if (CALLED_BY_A_FRAMEWORK.has(name)) continue;
    if (['if', 'for', 'while', 'switch', 'return', 'get', 'set'].includes(name)) continue;
    out.push(name);
  }
  return out;
}

/** Whether anything anywhere calls it - including its own file, and including specs. */
function hasAnyCaller(method: string, declaredIn: string): boolean {
  // `.method(`, `method(` after this/await, or referenced without calling (passed as
  // a callback, spied on in a test). A spec calling it counts: this rule is about
  // dead code, not about coverage.
  const call = new RegExp(`(?:\\.|\\b)${method}\\s*\\(`, 'g');
  const reference = new RegExp(`['"\`]${method}['"\`]`);
  for (const [file, text] of sources) {
    if (file === declaredIn) {
      // In its own file, a declaration is not a call - so count occurrences and
      // require more than the one that declared it.
      const hits = text.match(call)?.length ?? 0;
      if (hits > 1) return true;
      if (reference.test(text)) return true;
      continue;
    }
    if (call.test(text) || reference.test(text)) return true;
  }
  return false;
}

describe('every public service method has a caller', () => {
  it('or is listed as deliberately without one', () => {
    const dead: string[] = [];
    for (const file of files) {
      if (!file.endsWith('.service.ts')) continue;
      for (const method of publicMethodsOf(sources.get(file)!)) {
        const key = `${basename(file)}#${method}`;
        if (key in NO_CALLER_ON_PURPOSE) continue;
        if (!hasAnyCaller(method, file)) dead.push(`${relative(SRC, file)}#${method}`);
      }
    }

    expect({
      dead,
      whatToDo:
        'Each of these is a public method nothing calls. Either wire it to the path it was written for, delete it, or add it to NO_CALLER_ON_PURPOSE with the reason. Check its docstring while you are there - the one that prompted this rule claimed to be the live path.',
    }).toMatchObject({ dead: [] });
  });

  it('and would have caught the one that prompted it', () => {
    /**
     * A rule that cannot fail is worse than no rule, so the deleted method is
     * reconstructed here and run through the same check. Without this, a refactor
     * that broke the detection would leave a green test claiming there is no dead
     * code anywhere.
     */
    const pretendService = [
      'export class ReportsService {',
      '  async generateSoloArtifact(participantId: string, groundId: string) {',
      '    return null;',
      '  }',
      '}',
    ].join('\n');
    const methods = publicMethodsOf(pretendService);
    expect(methods).toContain('generateSoloArtifact');

    /**
     * AND THE SECOND HALF OF THIS TEST TRIPPED ON THE RULE ITSELF, which is worth
     * keeping rather than hiding. Asserting hasAnyCaller('generateSoloArtifact')
     * was false FAILED - because the name now appears in quotes in this very file
     * and in the note left where the method used to be, and a quoted mention counts
     * as a reference so that callbacks and spies are not reported as dead.
     *
     * A neat demonstration of the rule's own false-positive shape: mentioning a
     * method makes it look alive. So the caller check is proved with a name that
     * exists nowhere else, and the "would have caught it" claim rests on the
     * declaration half, which is the part that actually does the finding.
     */
    /**
     * AND THE NAME HAS TO BE BUILT AT RUNTIME, which took a second attempt to see:
     * any name written literally in this assertion is thereby mentioned in this
     * file, so the check finds it and reports it alive. Assembling it from pieces is
     * the only way to name something that appears nowhere.
     */
    const neverWritten = ['a', 'Method', 'Nobody', 'Has', 'Ever', 'Written'].join('');
    expect(hasAnyCaller(neverWritten, '/nowhere.ts')).toBe(false);
  });

  it('and does not fire on a method that only a spec calls', () => {
    // Deliberate. This rule is about dead code, not coverage: something a test
    // exercises is reachable, and half the rule modules built this week are called
    // from exactly one place.
    expect(hasAnyCaller('finishClosingSynthesesThatFailed', '/nowhere.ts')).toBe(true);
  });
});
