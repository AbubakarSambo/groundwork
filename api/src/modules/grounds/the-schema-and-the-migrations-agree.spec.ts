import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * EVERY COLUMN THE CLIENT SELECTS HAS TO EXIST IN THE DATABASE.
 *
 * A field added to schema.prisma with no migration behind it is invisible to every test in this
 * repo, because they all mock Prisma - so the generated client happily SELECTs a column, the mock
 * happily returns a row, and the suite is green while the real query throws
 * `The column deliveries.groundBaselineEntryId does not exist`.
 *
 * IT DOES NOT NEED ANYBODY TO BE CARELESS. I hand-edited a back-relation onto the wrong model, and
 * `prisma format` did exactly what it is supposed to: invented the scalar and the relation needed to
 * make that valid. Two defensible steps, a phantom column, and every write to that table dead. I
 * only found it because I tried to create a row for a screenshot.
 *
 * So: read the column names out of the schema, read the migrations as text, and require each one to
 * appear. Approximate on purpose - it does not parse SQL, it asks whether the migrations have ever
 * heard of the column - which is precisely the failure above and needs no database to run.
 */
/**
 * Comments stripped before anything is matched. A schema comment naming a column - and the one that
 * caused this spec to exist names several - would otherwise let prose stand in for a real field, and
 * the check would pass on a sentence. Both comment forms, since Prisma has `///` as well as `//`.
 */
const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const MIGRATIONS_DIR = join(__dirname, '../../../prisma/migrations');

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .map((d) => join(MIGRATIONS_DIR, d))
    .filter((p) => statSync(p).isDirectory())
    .map((p) => {
      try {
        return readFileSync(join(p, 'migration.sql'), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
}

interface Column {
  model: string;
  field: string;
  column: string;
}

function columnsInSchema(): Column[] {
  const out: Column[] = [];
  const body = SCHEMA;
  for (const m of body.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const [, model, block] = m;
    for (const line of block.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('@@') || t.startsWith('//')) continue;
      const f = t.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
      if (!f) continue;
      const [, field, type, isList] = f;
      // Relation fields carry no column of their own; the scalar beside them does.
      if (isList) continue;
      if (/^[A-Z]/.test(type) && !['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Json', 'Decimal', 'BigInt', 'Bytes'].includes(type)) {
        // An enum is a real column; a model reference is not.
        if (new RegExp(`^model\\s+${type}\\b`, 'm').test(body)) continue;
      }
      const mapped = t.match(/@map\("([^"]+)"\)/);
      // Without @map the column IS the field name. Prisma does not snake-case anything for you -
      // assuming it did made this look for "party_type" while the table has "partyType".
      out.push({ model, field, column: mapped ? mapped[1] : field });
    }
  }
  return out;
}

describe('the schema and the migrations agree', () => {
  const sql = allMigrationSql();
  const columns = columnsInSchema();

  it('reads a real schema', () => {
    expect(columns.length).toBeGreaterThan(200);
    expect(sql.length).toBeGreaterThan(10_000);
  });

  it('every column in the schema has been created by a migration', () => {
    const missing = columns.filter((c) => !new RegExp(`"${c.column}"`).test(sql) && !sql.includes(c.column));
    expect(missing.map((c) => `${c.model}.${c.field} -> ${c.column}`)).toEqual([]);
  });
});
