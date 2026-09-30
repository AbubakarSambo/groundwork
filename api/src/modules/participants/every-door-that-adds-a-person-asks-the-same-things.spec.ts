import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * EVERY DOOR THAT ADDS A PERSON ASKS THE SAME THINGS. Four doors (the directory sync and the panel
 * are two entry points into one SCIM writer): each takes an optional department beside the role, so
 * a fifth door cannot skip it without failing here.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (rel: string) => strip(readFileSync(join(__dirname, rel), 'utf8'));
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');

describe('the doors', () => {
  it('the directory sync reads department from the enterprise extension', () => {
    expect(read('../people/scim.service.ts')).toMatch(/department = dto\[ENTERPRISE\]\?\.department/);
  });
  it('the panel accepts it and hands it to the same writer on the same extension', () => {
    expect(read('../public-api/public-api.controller.ts')).toMatch(/addPersonFromPanel[\s\S]{0,300}department\?: string/);
    expect(read('../public-api/a-check-in-a-customer-can-run.service.ts')).toMatch(/urn:ietf:params:scim:schemas:extension:enterprise:2\.0:User': \{ department/);
  });
  it('adding a contributor in the app asks it beside the role', () => {
    expect(read('../grounds/dto/add-participant.dto.ts')).toMatch(/department\?: string/);
    const page = strip(readFileSync(join(CLIENT, 'pages', 'grounds', 'GroundAdminPage.tsx'), 'utf8'));
    /* The add-person form moved into "Who's in it" when People and setup was rebuilt from the
       shared parts (29 September); the page keeps the draft and sends it. */
    const form = strip(readFileSync(join(CLIENT, 'components', 'gw', 'WhosInItRoster.tsx'), 'utf8'));
    expect(form).toContain('placeholder="Their department (optional)"');
    expect(page).toMatch(/department: newParticipantDepartment\.trim\(\) \|\| undefined/);
  });
  it('the join page asks it beside "your part in this"', () => {
    /* The join body is a DTO class since B14 (the pipe could not see the inline type); the field is on it. */
    expect(read('../entry/entry.controller.ts')).toMatch(/class EntryJoinAcceptDto[\s\S]{0,900}department\?: string/);
    const page = strip(readFileSync(join(CLIENT, 'pages', 'join', 'JoinPage.tsx'), 'utf8'));
    expect(page).toContain('htmlFor="join-department"');
    expect(page).toMatch(/department: department\.trim\(\) \|\| undefined/);
  });
  it('and both participant-shaped rows have somewhere to put it', () => {
    const schema = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');
    expect(schema.match(/^\s+department\s+String\?/gm)?.length).toBeGreaterThanOrEqual(3);
  });
});
