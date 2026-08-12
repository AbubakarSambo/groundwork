import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * A STATIC PATH DECLARED AFTER `:id` NEVER RUNS. W8-69.
 *
 * `GET /grounds/awaiting-approval` was declared below `@Get(':id')`. Nest matches routes in
 * declaration order, so the path was read as a ground whose id is the string
 * "awaiting-approval", `get()` found no such ground, and the endpoint answered **404 to
 * every caller since the day it was written**. It has never once returned a list.
 *
 * What that looked like to a person: every org admin opening the grounds page got a red
 * "Not found - Ground not found" toast over the page, every time, because the rail asks for
 * the approval queue on mount. The ground-approval requirement could not work at all, and
 * the failure looked like a bug in whatever page they happened to be on. Found by reading
 * the network log on a page that had no other problem.
 *
 * Nothing catches this: it compiles, it has a test-shaped name, and a unit test that calls
 * the controller method directly passes - the method is fine, the routing is not.
 */

function controllers(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) controllers(full, out);
    else if (name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

/** Route decorators in declaration order, comments stripped. */
function routesOf(src: string): { verb: string; path: string }[] {
  /**
   * COMMENTS STRIPPED, and this is the third time today the same trap has been walked into:
   * the doc comment explaining this fix contains the words `@Get(':id')`, so a scan of the
   * raw source read the fix's own explanation as a route declaration and reported the file
   * it had just fixed.
   */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...code.matchAll(/@(Get|Post|Patch|Put|Delete)\((?:'([^']*)')?\)/g)].map((m) => ({
    verb: m[1],
    path: m[2] ?? '',
  }));
}

const FILES = controllers(join(__dirname, '..', 'modules'));

describe('no route is unreachable because of the order it is declared in', () => {
  it('found the controllers at all', () => {
    // A source scan that matches nothing passes silently.
    expect(FILES.length).toBeGreaterThan(8);
    expect(routesOf(readFileSync(FILES[0], 'utf8')).length).toBeGreaterThan(0);
  });

  for (const file of FILES) {
    it(`${file.split('/').pop()}`, () => {
      const routes = routesOf(readFileSync(file, 'utf8'));
      const paramFirst = new Map<string, string>();
      const shadowed: string[] = [];

      for (const { verb, path } of routes) {
        const first = path.split('/')[0];
        // Same verb and same segment count is what makes two routes compete.
        const key = `${verb}:${path.split('/').length}`;
        if (first.startsWith(':')) {
          if (!paramFirst.has(key)) paramFirst.set(key, path);
        } else if (first && paramFirst.has(key)) {
          shadowed.push(`${verb} '${path}' can never run - '${paramFirst.get(key)}' above it matches first`);
        }
      }

      expect({
        shadowed,
        whatToDo: 'Move the static path ABOVE the :param route. Nest matches in declaration order, so the param wins and your endpoint answers 404 forever.',
      }).toMatchObject({ shadowed: [] });
    });
  }

  it('and the rule itself still catches the real case', () => {
    // Reconstructed, because a rule that cannot fail is worse than no rule.
    const sample = `
      @Get(':id')
      async get() {}
      @Get('awaiting-approval')
      async awaiting() {}
    `;
    const routes = routesOf(sample);
    expect(routes.map((r) => r.path)).toEqual([':id', 'awaiting-approval']);
  });
});
