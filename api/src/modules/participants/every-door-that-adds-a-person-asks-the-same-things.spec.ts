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
  /*
   * UPDATED (Hafsah, 31 October 2026: "Make adding a team the top pattern ... without repeating themselves"). The app's door is now the
   * one team box, the same one the organisation's invite box is: one person per line, a name, an email and a phone number, and
   * everybody on in one press. What somebody does (their role) is added after, on People and setup. The route still takes a
   * department, so a door that sends one keeps it.
   */
  it('adding people in the app is the one team box, and the route still takes a department', () => {
    expect(read('../grounds/dto/add-participant.dto.ts')).toMatch(/department\?: string/);
    const form = strip(readFileSync(join(CLIENT, 'components', 'gw', 'WhosInItRoster.tsx'), 'utf8'));
    expect(form).toContain('<TheTeamBox');
  });
  /* UPDATED 19 NOVEMBER (rest of the list): the open link asks for less since 719b9b897 (audit row 7: no department on the join page). The page no longer asks; the route still takes a department, so a door that sends one keeps it. */
  it('the join page no longer asks it, and the route still takes it', () => {
    /* The join body is a DTO class since B14 (the pipe could not see the inline type); the field is on it. */
    expect(read('../entry/entry.controller.ts')).toMatch(/class EntryJoinAcceptDto[\s\S]{0,900}department\?: string/);
    const page = strip(readFileSync(join(CLIENT, 'pages', 'join', 'JoinPage.tsx'), 'utf8'));
    expect(page).not.toContain('htmlFor="join-department"');
  });
  it('and both participant-shaped rows have somewhere to put it', () => {
    const schema = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');
    expect(schema.match(/^\s+department\s+String\?/gm)?.length).toBeGreaterThanOrEqual(3);
  });
});
