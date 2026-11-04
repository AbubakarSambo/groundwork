/**
 * A LINK IN AN EMAIL IS THE ONLY THING SOME PEOPLE EVER SEE OF THIS PRODUCT.
 *
 * Four of them pointed at routes the client does not have. Every scheduled nudge in the
 * product — day 3, day 7, day 14 — built `/check-ins/:id` while the route is `/checkin/:id`,
 * so the reminder whose entire job is to bring somebody back landed them on the not-found
 * page. Nobody noticed because nothing here fails when it happens: the mail sends, the
 * server logs a success, and the person quietly does not come back.
 *
 * This reads every URL the API builds out of the frontend base and checks the path against
 * the client's own route table. Nothing else in the repo can catch this: the API has no idea
 * what the client's routes are, and the string always looks perfectly reasonable.
 *
 * IT READS THE CLIENT'S SOURCE, which is unusual and is the point — the two packages ship
 * together and the thing that must agree is exactly the thing neither one can see.
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * COMMENTS COME OUT FIRST.
 *
 * This matches on source, so a URL written in a comment — including the ones in this repo
 * explaining a path that USED to be wrong — would be read as a link somebody sends. A guard a
 * comment can satisfy, or break, is not a guard.
 */
const withoutComments = (file: string) =>
  fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const API_SRC = path.join(__dirname, '..', '..');
const CLIENT_APP = path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'App.tsx');

/** Every route the client declares, as a shape with its params flattened. */
function everyClientRoute(): string[] {
  const src = withoutComments(CLIENT_APP);
  return [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
}

/** Every file under api/src, so a new sender cannot be added outside the sweep. */
function everyApiFile(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) everyApiFile(full, found);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) found.push(full);
  }
  return found;
}

/** `${frontendUrl}/x/${id}/y` and `${frontend}/x` → `/x/:p/y`. */
const asShape = (built: string) =>
  built
    .replace(/\$\{[^}]*\}/g, ':p')
    .replace(/\/+$/, '')
    .replace(/\?.*$/, '');

const routeShape = (route: string) => route.replace(/:[A-Za-z]+/g, ':p').replace(/\/+$/, '');

/**
 * Paths that are deliberately not client routes.
 *
 * Kept short and reasoned. An exemption is how a link stops being checked, so each one says
 * what opens it instead.
 */
const NOT_A_CLIENT_ROUTE = new Set<string>([
  /* Empty, and that is the honest state: every link the API builds off the frontend base is
     meant for a person in the client. If something one day is not — a file the API serves
     itself, say — name it here with what opens it instead. */
]);

describe('every link the API puts in an email', () => {
  const routes = everyClientRoute().map(routeShape);
  const files = everyApiFile(API_SRC);

  it('found the client routes and the API files, so an empty sweep cannot pass', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(routes).toContain('/checkin/:p');
    expect(files.length).toBeGreaterThan(100);
  });

  it('resolves to a route the client actually has', () => {
    const dead: string[] = [];

    for (const file of files) {
      const src = withoutComments(file);
      /* Any template string built off the frontend base, however it was named locally:
         `frontendUrl`, `frontend`, `this.frontendUrl`. */
      for (const m of src.matchAll(/\$\{(?:this\.)?(?:frontendUrl|frontend|FRONTEND_URL)\}([^`"']*)/g)) {
        const built = m[1];
        if (!built.startsWith('/')) continue;
        const shape = asShape(built);
        if (shape === '' || NOT_A_CLIENT_ROUTE.has(shape)) continue;
        if (!routes.includes(shape)) {
          dead.push(`${path.relative(API_SRC, file)}: ${built} → no client route "${shape}"`);
        }
      }
    }

    if (dead.length) {
      throw new Error(
        'These emails point at pages the client does not have. The person clicking gets the '
          + 'not-found page, and nothing anywhere reports it. Use EmailService.buildCheckInUrl '
          + `or point at a route that exists.\n\n${dead.join('\n')}`,
      );
    }
    expect(dead).toEqual([]);
  });

  it('and an email handed a link actually renders it', () => {
    /*
     * THE OTHER HALF, AND THE ABSENCE REMINDER IS WHY.
     *
     * It said "sign in to Groundwork to add your version" and carried no anchor at all —
     * sent, after three missed rounds, to the person least likely to go looking. A link that
     * resolves is no use if the email forgot to include it, so: any sender given a URL has
     * to put it in front of somebody.
     */
    const src = withoutComments(path.join(__dirname, 'email.service.ts'));
    const words = withoutComments(path.join(__dirname, 'the-direct-words.ts'));
    const DIRECT_WORDS = new Map([...words.matchAll(/export function (\w+Directly)\(([\s\S]*?)\n\}/g)].map((m) => [m[1], m[2]] as [string, string]));
    expect(DIRECT_WORDS.size).toBeGreaterThan(2);
    const methods = [...src.matchAll(/async (send[A-Za-z]+)\(([\s\S]*?)\): Promise<[^>]*> \{([\s\S]*?)\n  \}/g)];
    expect(methods.length).toBeGreaterThan(20);

    const silent: string[] = [];
    for (const [, name, args, body] of methods) {
      const takesAUrl = /\b(\w*[Uu]rl)\s*[:?]/.test(args);
      if (!takesAUrl) continue;
      const urlNames = [...args.matchAll(/\b(\w*[Uu]rl)\s*[:?]/g)].map((m) => m[1]);
      /* Rendered here, or handed to one of the direct words (the-direct-words.ts) that renders a link with it. Changed 4 November 2026:
         since the direct morning's switch went, these mails are written only there. */
      const handedOn = (u: string) => [...body.matchAll(new RegExp(`\\b(\\w+Directly)\\(([^;]*?\\b${u}\\b[^;]*?)\\)`, 'g'))]
        .some(([, helper]) => DIRECT_WORDS.has(helper) && /button\(|href="/.test(DIRECT_WORDS.get(helper)!));
      const usesOne = urlNames.some((u) => new RegExp(`href="\\$\\{${u}`).test(body) || handedOn(u));
      if (!usesOne) silent.push(`${name} takes ${urlNames.join(', ')} and renders no link with it`);
    }

    if (silent.length) {
      throw new Error(
        `An email was handed somewhere to go and did not offer it:\n${silent.join('\n')}`,
      );
    }
    expect(silent).toEqual([]);
  });

  it('and the exemptions still name something real', () => {
    /* A stale exemption is how a link quietly stops being checked. */
    for (const exempt of NOT_A_CLIENT_ROUTE) {
      const anywhere = files.some((f) => withoutComments(f).includes(exempt.replace('/:p', '')));
      /* A stale exemption is how a link quietly stops being checked. */
      if (!anywhere) throw new Error(`Nothing builds "${exempt}" any more — drop the exemption.`);
      expect(anywhere).toBe(true);
    }
  });
});
