import { readFileSync } from 'fs';
import { join } from 'path';
import { forbiddenNames, namesAnyone } from '../reports/guide-sanitiser';
import { IntelligenceService } from './intelligence.service';

/**
 * THE ONE RECORD THAT PROMISES THERE ARE NO NAMES IN IT.
 *
 * `OrgIntelligence` is org-wide and stored with `anonymised: true`. The whole of what kept a name
 * out of it was a line in the prompt saying "No names" - and this codebase has twice written down
 * what a prompt is worth: the post-report guide named a participant despite being told not to, and
 * `atStake` was only fixed by never handing the model the names at all.
 *
 * So the flag would have been false the first time a name came through, with nothing checking it.
 */
const SRC = readFileSync(join(__dirname, 'intelligence.service.ts'), 'utf8');

describe('the anonymised flag is checked, not asserted', () => {
  it('drops a narrative that names somebody', () => {
    const names = forbiddenNames([{ firstName: 'Eric', lastName: 'Abbott', email: 'eric.abbott@x.com' }]);
    expect(namesAnyone('Eric has been carrying the integration work.', names)).toBe(true);
    expect(namesAnyone('One person has been carrying the integration work.', names)).toBe(false);
  });

  /*
   * BEHAVIOURAL, BECAUSE THE SOURCE CHECK PASSED FOR THE WRONG REASON.
   *
   * The first version of this asserted the file contained `namesAnyone(narrative, names)`. Breaking
   * the guard to `if (false && namesAnyone(narrative, names))` left that string exactly where it
   * was and the test went on passing - a guard that cannot be made to fail is not a guard.
   */
  const run = async (narrative: string) => {
    const created: any[] = [];
    const prisma: any = {
      patternDetection: { findMany: async () => [{ observationText: 'somebody is carrying the work' }] },
      user: { findMany: async () => [{ firstName: 'Eric', lastName: 'Abbott', email: 'eric.abbott@x.com' }] },
      orgIntelligence: { create: async (a: any) => { created.push(a); return {}; } },
    };
    const anthropic: any = { respond: async () => narrative };
    const svc: any = new IntelligenceService(prisma, anthropic);
    await svc.synthesiseOrgNarrative('org-a');
    return created;
  };

  it('writes nothing at all when the narrative names somebody', async () => {
    expect(await run('Eric has been carrying the integration work.')).toEqual([]);
  });

  it('and writes it when it does not', async () => {
    const created = await run('One person has been carrying the integration work.');
    expect(created).toHaveLength(1);
    expect(created[0].data.anonymised).toBe(true);
  });

  it('and never redacts, because a name cut out still says somebody was discussed', () => {
    const body = SRC.slice(SRC.indexOf('const narrative'));
    expect(body).not.toMatch(/replace\(.*names/);
  });
});
