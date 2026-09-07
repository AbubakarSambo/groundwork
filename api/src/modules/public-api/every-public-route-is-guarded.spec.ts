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

/**
 * ROUTES THAT AUTHENTICATE THE CALLER RATHER THAN REQUIRING AN AUTHENTICATED ONE.
 *
 * Both are arguable and both were argued for. Every entry here is a route on the public internet
 * with no guard, so the number is small enough that growing it should cost somebody a paragraph.
 */
const UNGUARDED_ON_PURPOSE = [
  /* Where a credential becomes a token. Requiring a token would be circular. */
  "@Post('oauth/token')",
  /*
   * Called by a BROWSER on a page in the customer's application, which holds no credential of ours
   * and must not - a machine secret in a widget is a machine secret in developer tools. The
   * identity token their server signed IS the authentication, and it is verified against the key of
   * whichever organisation it claims: claiming somebody else's means being checked against their
   * secret, which the caller does not have.
   */
  "@Post('embed/session')",
  /*
   * A DESCRIPTION OF THE API, containing nothing that is not already in an
   * error message somebody would get by guessing.
   *
   * Behind a token it would be useless: the person who needs it is holding a
   * client id they are about to use for the first time, and putting the answer
   * behind the exchange they are trying to get right is how a six-call
   * integration becomes an afternoon. There is no customer data here and no
   * organisation is named - it is the six calls, three closed sets of enum
   * values, and the four places people trip.
   */
  "@Get('how-to-connect')",
];

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
const PANEL_AUTHENTICATED = [
  "@Post('chat')",
  "@Get('embed/opening')",
  /*
   * A CHECK-IN IS ONE PERSON'S CONVERSATION, so it is a panel route for exactly the reason `/chat`
   * is - and more strongly. A machine credential naming an organisation and nobody in particular
   * must never open, answer in, finish or read a session: what is said in one is private until the
   * round is released, and a scope granting an integration "check-ins" would be a scope granting it
   * everybody's, which is the one thing this product promises it does not do.
   */
  /*
   * STARTING A CHECK-IN SOMEBODY SET UP FOR YOU is a personal act, and the whole point of the step:
   * the named lead reads the context and says yes. A machine credential doing it would be a
   * customer's server deciding on somebody's behalf that they have read something and agree with it.
   */
  "@Get('grounds/awaiting-me')",
  "@Post('grounds/:id/confirm-lead')",
  "@Get('check-ins/mine')",
  "@Post('check-ins/:id/open')",
  "@Post('check-ins/:id/messages')",
  /*
   * ATTACHING A DOCUMENT IS THE SAME ACT AS ANSWERING, and belongs on the same side of this line.
   * A document here is one party's evidence for one record - read against what is being discussed
   * and visible under that record's rules - so a machine credential naming an organisation and
   * nobody in particular must not be able to put one into somebody's check-in. There is also no
   * scope that could express it honestly: "documents:write" for an integration would mean writing
   * into everybody's, which is the thing the check-in routes above are kept off for.
   */
  "@Post('check-ins/:id/documents')",
  "@Post('check-ins/:id/complete')",
  "@Get('check-ins/:id/transcript')",
  /*
   * A DOCUMENT IS ONE PERSON PUTTING SOMETHING INTO THEIR OWN CHECK-IN, and it arrives visible to
   * them alone. A machine credential doing it would be an organisation's server adding evidence in
   * somebody's name to a session that is theirs.
   */
  "@Post('grounds/:groundId/documents')",
  /* A question about somebody's OWN people, answered for the person asking. A machine credential
     names an organisation and nobody in particular, so it has no reporting line to read. */
  "@Get('reports/my-people')",
  /*
   * Deciding a suggested conversation is the one thing in this product that a machine must NOT be
   * able to do. "Detection is a proposal, never a launch" is only true while the acceptance needs a
   * person, and a machine token carries an organisation and nobody in particular - so a server-to-
   * server call accepting a performance conversation would satisfy every check and none of the rule.
   */
  "@Get('suggestions')",
  "@Post('suggestions/:id')",
];

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

  it('the unguarded list stays very short', () => {
    /*
     * Not a style rule. Every entry is a route on the public internet with no guard.
     *
     * One, then two, and now three. The third is `how-to-connect`, which returns
     * the six calls, three enum lists and the four places people trip - all of
     * it already reachable by guessing wrong once, none of it about any
     * organisation. It was asked for by the ratchet doing exactly what it says:
     * the number did not move until somebody wrote the paragraph.
     *
     * The bar for a fourth is unchanged. It is not "the third one was fine".
     */
    expect(UNGUARDED_ON_PURPOSE.length).toBeLessThanOrEqual(3);
  });

  it('and an unguarded route that describes the API touches no data at all', () => {
    /**
     * The cap counts entries; this reads what they do. A short list of routes
     * that each leak something is worse than a long list of harmless ones, and
     * only one of those is checked by counting.
     *
     * The distinction is what the route is FOR. Two of the three authenticate
     * the caller, so they necessarily read a credential and the organisation
     * behind it - my first version of this test asserted they touched neither
     * and failed on the token exchange, which was the test being wrong rather
     * than the route. The third describes the API and should reach nothing.
     */
    const describesTheApi = ["@Get('how-to-connect')"];

    for (const r of routes()) {
      if (!describesTheApi.includes(r.decorator)) continue;
      for (const forbidden of ['organizationId', 'req.machine', 'this.prisma', 'this.credentials']) {
        expect(r.block).not.toContain(forbidden);
      }
    }

    /* And every unguarded route is one of the two kinds, rather than a third
       nobody has thought about. */
    for (const decorator of UNGUARDED_ON_PURPOSE) {
      const authenticatesTheCaller = ["@Post('oauth/token')", "@Post('embed/session')"];
      expect([...describesTheApi, ...authenticatesTheCaller]).toContain(decorator);
    }
  });

  it('every scope it declares is a scope that exists', () => {
    /*
     * A route can declare `subjects:read`, pass every check here, and be unreachable for everybody
     * - the guard refuses a scope the credential cannot hold, so an invented one fails closed and
     * silently. I shipped exactly that on an acceptance-criteria route and only the runtime would
     * ever have said so.
     */
    const known = new Set(
      [...readFileSync(join(__dirname, 'scopes.ts'), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .matchAll(/'([a-z]+:[a-z]+)'/g)].map((m) => m[1]),
    );
    expect(known.size).toBeGreaterThan(5);
    for (const m of SRC.matchAll(/@RequiresScope\('([^']+)'\)/g)) {
      expect(known).toContain(m[1]);
    }
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
