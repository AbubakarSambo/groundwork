import * as fs from 'fs';
import * as path from 'path';
import { aNameHasNoSpaceAtItsEnds } from './a-name-has-no-space-at-its-ends';

/** Hafsah's screenshot of 19 November 2026: "We save this for you, Clinton ." See the file under test. */
describe('a name has no space at its ends', () => {
  const through = (action: string, args: any, model = 'User') => aNameHasNoSpaceAtItsEnds({ model, action, args }).args;

  it('on every way a user row is written', () => {
    expect(through('create', { data: { firstName: 'Clinton ', lastName: ' Okoro' } }).data).toEqual({ firstName: 'Clinton', lastName: 'Okoro' });
    expect(through('update', { where: { id: 'u' }, data: { firstName: { set: ' Clinton ' } } }).data).toEqual({ firstName: { set: 'Clinton' } });
    expect(through('updateMany', { data: { lastName: 'Okoro  ' } }).data).toEqual({ lastName: 'Okoro' });
    expect(through('createMany', { data: [{ firstName: 'Ada ', lastName: 'Eze' }, { firstName: ' Bola', lastName: 'Ige ' }] }).data).toEqual([{ firstName: 'Ada', lastName: 'Eze' }, { firstName: 'Bola', lastName: 'Ige' }]);
    expect(through('upsert', { create: { firstName: 'Ada ' }, update: { firstName: 'Ada ' } })).toEqual({ create: { firstName: 'Ada' }, update: { firstName: 'Ada' } });
  });

  it('touches only the ends, and only a user', () => {
    expect(through('create', { data: { firstName: 'Mary Jane', lastName: "O'Neil" } }).data).toEqual({ firstName: 'Mary Jane', lastName: "O'Neil" });
    expect(through('create', { data: { firstName: 'Clinton ' } }, 'Colleague').data).toEqual({ firstName: 'Clinton ' });
    expect(through('findMany', { where: { firstName: 'Clinton ' } }).where).toEqual({ firstName: 'Clinton ' });
  });

  it('runs on every write the database client makes', () => {
    const service = fs.readFileSync(path.join(__dirname, 'prisma.service.ts'), 'utf8');
    expect(service).toMatch(/this\.\$use\(async \(params, next\) => next\(aNameHasNoSpaceAtItsEnds\(params\)\)\)/);
  });

  it('and the names already stored with one are put right once', () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'prisma', 'migrations', '20261119180000_a_name_has_no_space_at_its_ends', 'migration.sql'), 'utf8');
    expect(sql).toMatch(/UPDATE "users"[\s\S]*btrim\("first_name"\)[\s\S]*btrim\("last_name"\)/);
  });
});
