import { GroundScenario } from '@prisma/client';
import { VOCABULARY } from './what-you-need-to-know-before-you-start';
import { readFileSync } from 'fs';
import { join } from 'path';

/** The developer API keeps working exactly as it did: the anchor's own situation starts from its link, so it is neither listed nor accepted here. */
describe('the developer API and the anchor situation', () => {
  it('does not list it among the situations a developer may send', () => {
    expect(VOCABULARY.scenario).not.toContain('HELP_TEAM_UNDERSTAND');
    expect(VOCABULARY.scenario).toContain(GroundScenario.NEW_PROJECT);
  });
  it('does not accept it, and does not name it in its refusal', () => {
    const src = readFileSync(join(__dirname, 'grounds-by-api.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toMatch(/const SCENARIOS = Object\.values\(GroundScenario\)\.filter\(\(s\) => s !== GroundScenario\.HELP_TEAM_UNDERSTAND\)/);
  });
});
