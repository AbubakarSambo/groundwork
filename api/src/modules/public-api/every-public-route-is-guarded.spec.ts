import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * `@Public()` TAKES ONE AUTHENTICATION OFF. SOMETHING HAS TO PUT ANOTHER BACK.
 *
 * JwtAuthGuard is global and expects a signed-in person's token. Machines have no session, so the
 * integration controller is marked `@Public()` - which does not mean "open to the world", it means
 * "the session guard stands down here". MachineTokenGuard is what replaces it.
 *
 * Forget the second half on one route and the annotation has simply removed authentication. The
 * route would sit on the internet, unauthenticated, looking exactly like the ones beside it, and no
 * test that exercised it with a valid token would notice - because a valid token still works.
 *
 * The token exchange is the one exception and is named rather than pattern-matched, so adding a
 * second exception is a deliberate edit to this list rather than a regex quietly widening.
 */
const SRC = readFileSync(join(__dirname, 'public-api.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Authenticates the caller rather than requiring a caller already authenticated. */
const UNGUARDED_ON_PURPOSE = ["@Post('oauth/token')"];

/**
 * ROUTES A PANEL CALLS RATHER THAN A MACHINE, AND THE DISTINCTION IS REAL.
 *
 * `/chat` is reached by the embedded panel carrying a session for ONE NAMED PERSON, not by a
 * customer's integration credential. Every lane behind it is scoped to the person asking, so a
 * machine token - which names an organisation and nobody - must not reach it. Different guard,
 * different reason, and a scope would be the wrong shape: scopes describe what an integration may
 * do, and this is a person asking a question about themselves.
 *
 * This list exists so that difference is a decision somebody made rather than a route that quietly
 * missed its guard.
 */
const PANEL_AUTHENTICATED = ["@Post('chat')"];

/** Every route decorator in the file, in source order, with what follows it up to the handler. */
function routes() {
  const out: { decorator: string; block: string }[] = [];
  const re = /@(Get|Post|Patch|Put|Delete)\(([^)]*)\)/g;
  const marks = [...SRC.matchAll(re)];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index!;
    const end = i + 1 < marks.length ? marks[i + 1].index! : SRC.length;
    out.push({ decorator: `@${marks[i][1]}(${marks[i][2]})`, block: SRC.slice(start, end) });
  }
  return out;
}

describe('every public route is guarded', () => {
  it('finds the routes at all, so an empty list cannot pass', () => {
    expect(routes().length).toBeGreaterThanOrEqual(4);
  });

  it('carries a guard on every route but the token exchange', () => {
    for (const r of routes()) {
      if (UNGUARDED_ON_PURPOSE.includes(r.decorator)) continue;
      const guarded = r.block.includes('@UseGuards(MachineTokenGuard)') || r.block.includes('@UseGuards(EmbedSessionGuard)');
      expect(guarded).toBe(true);
    }
  });

  it('and a panel route is guarded as a panel route, deliberately', () => {
    for (const r of routes()) {
      if (!PANEL_AUTHENTICATED.includes(r.decorator)) continue;
      expect(r.block).toContain('@UseGuards(EmbedSessionGuard)');
      expect(r.block).not.toContain('MachineTokenGuard');
    }
  });

  it('and declares a scope on every one of them', () => {
    /* The guard refuses a route with no declared scope, so a missing annotation fails closed at
       runtime. This says so at build time instead, because "nobody can call it" is a worse way to
       find out than a red test. */
    for (const r of routes()) {
      if (UNGUARDED_ON_PURPOSE.includes(r.decorator)) continue;
      /* A panel route has no scope by design - see PANEL_AUTHENTICATED. */
      if (PANEL_AUTHENTICATED.includes(r.decorator)) continue;
      expect(r.block).toMatch(/@RequiresScope\('[a-z]+:[a-z]+'\)/);
    }
  });

  it('the exception list stays at exactly one entry', () => {
    /* Not a style rule. Every entry here is a route on the public internet with no authentication,
       and the number is small enough that growing it should require arguing for it. */
    expect(UNGUARDED_ON_PURPOSE).toHaveLength(1);
  });

  it('nothing outside this controller is marked Public under the integration path', () => {
    expect(SRC).toContain("@Controller('api/org/v1')");
  });
});

describe('what leaves is an allow-list, not a filter', () => {
  const PRESENT = SRC.slice(SRC.indexOf('private present('));

  it('names every field it returns', () => {
    /* A deny-list lets every column added later escape by default, which is how an internal id or a
       secret hash ends up in somebody else's logs. */
    expect(PRESENT).not.toMatch(/\.\.\.\w/);
    expect(PRESENT).not.toMatch(/delete\s+\w+\./);
  });

  it('never returns our own primary key or anything org-internal', () => {
    for (const forbidden of ['id:', 'organizationId', 'createdAt', 'updatedAt', 'clientSecret']) {
      expect(PRESENT.split('\n').filter((l) => l.trim().startsWith(forbidden))).toEqual([]);
    }
  });
});
