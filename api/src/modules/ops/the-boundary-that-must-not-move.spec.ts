/**
 * The ops system is a SEPARATE SYSTEM that happens to share a deployment.
 *
 * Two tests decide whether that is true, and both of them are structural:
 *
 *   1. Swap the ops system for somebody else's ERP and every check-in still works.
 *   2. Turn check-ins off and we can still run the company.
 *
 * Neither survives a single import across the line, because an import is how one
 * system starts assuming the other's shape. So this spec holds the line in the
 * only two places it can be crossed: the schema, and the import graph.
 *
 * The one permitted link is `OpsPerson.userId`. It is a plain column with no
 * foreign key, and it exists so somebody can sign in with the account they
 * already have. Nothing in the ops system reads through it for anything else.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const API_SRC = join(__dirname, '..', '..');
const OPS_DIR = __dirname;
const SCHEMA = join(API_SRC, '..', 'prisma', 'schema.prisma');

const withoutComments = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(e)) out.push(p);
  }
  return out;
}

const opsFiles = walk(OPS_DIR);

/** Infrastructure both systems sit on. Sharing Nest and Prisma is not a boundary crossing. */
const SHARED_PLUMBING = ['/prisma/', '/common/', '/config/'];

describe('the ops system does not reach into the Groundwork product', () => {
  it('has at least one file to check, so an empty directory cannot pass this', () => {
    expect(opsFiles.length).toBeGreaterThan(0);
  });

  it('imports no product module', () => {
    const crossings: string[] = [];

    for (const file of opsFiles) {
      /*
       * A SPEC MAY REACH ACROSS. THE SYSTEM MAY NOT.
       *
       * The boundary is about what SHIPS depending on what. A test asserting
       * that the two halves actually agree is the opposite of a dependency —
       * `a-token-a-customer-would-mint.spec.ts` verifies our token against the
       * product's own verifier, the one a customer's token meets, because a
       * mint checked only against itself proves the two halves agree with
       * themselves and nothing else.
       *
       * The narrowness matters: the minting code has its own guard saying it
       * imports `crypto` and nothing else, so the crossing cannot migrate out
       * of the spec and into the thing that runs.
       */
      if (file.endsWith('.spec.ts')) continue;
      const source = withoutComments(readFileSync(file, 'utf8'));
      const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);

      for (const spec of imports) {
        if (!spec.startsWith('.')) continue; // a package, not our code
        const resolved = join(file, '..', spec);
        if (resolved.startsWith(OPS_DIR)) continue; // inside the ops system
        if (SHARED_PLUMBING.some((p) => resolved.includes(p))) continue;
        crossings.push(`${file.replace(API_SRC, '')} imports ${spec}`);
      }
    }

    expect(crossings).toEqual([]);
  });

  it('and the exemption is only for specs, not for anything that runs', () => {
    /* If the crossing ever moves out of a spec and into the code, the guard
       above must fail. Asserted here so the exemption cannot quietly widen. */
    const minting = withoutComments(
      readFileSync(join(OPS_DIR, 'a-token-a-customer-would-mint.ts'), 'utf8'),
    );
    const imports = [...minting.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual(['crypto']);
  });

  it('is imported by no product module', () => {
    const crossings: string[] = [];

    for (const file of walk(API_SRC)) {
      if (file.startsWith(OPS_DIR)) continue;
      if (file.endsWith('app.module.ts')) continue; // wiring is allowed to know both exist
      const source = withoutComments(readFileSync(file, 'utf8'));
      if (/from\s+'[^']*\/ops\//.test(source)) {
        crossings.push(file.replace(API_SRC, ''));
      }
    }

    expect(crossings).toEqual([]);
  });
});

describe('no ops table holds a foreign key into a product table', () => {
  const schema = readFileSync(SCHEMA, 'utf8');
  const opsBlocks = [...schema.matchAll(/^model (Ops\w+) \{([\s\S]*?)^\}/gm)];

  it('found the ops models, so a renamed prefix cannot make this pass on nothing', () => {
    expect(opsBlocks.length).toBeGreaterThan(0);
  });

  it('and every relation an ops model declares points at another ops model', () => {
    const offenders: string[] = [];

    for (const [, modelName, body] of opsBlocks) {
      for (const line of withoutComments(body).split('\n')) {
        if (!line.includes('@relation(')) continue;
        const target = line.trim().split(/\s+/)[1]?.replace(/[?[\]]/g, '');
        if (target && !target.startsWith('Ops')) {
          offenders.push(`${modelName} -> ${target}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('and userId is the only field naming a product concept, without a foreign key', () => {
    const opsSource = opsBlocks.map(([block]) => block).join('\n');
    expect(opsSource).toContain('userId String? @unique @map("user_id")');
    expect(opsSource).not.toMatch(/user\s+User\s/);
  });
});
