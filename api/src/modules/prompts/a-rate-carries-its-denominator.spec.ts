import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A RATE CARRIES ITS DENOMINATOR. Five places on the panel rendered percentages and one-decimal
 * means with no sample size and no date range anywhere. Every percentage now travels with its
 * `of`, every mean with its `n`, and one range control governs the lot.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'prompts.service.ts'), 'utf8'));
const controller = strip(readFileSync(join(__dirname, 'prompts.controller.ts'), 'utf8'));
const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'admin', 'AdminPage.tsx'), 'utf8'));

describe('on the server', () => {
  it('every breakdown carries its total, and both breakdowns compute their share in the same place', () => {
    expect(service).toMatch(/byScenario = .*of: scenarios\.total/);
    expect(service).toMatch(/byStatus = .*of: statuses\.total/);
    expect(service).toContain('byStatusOf: statusTotal');
    expect(service).toMatch(/of: idx === 0 \? null : sessionCounts\[idx - 1\]\.completed/);
  });

  it('means travel with their sample size', () => {
    expect(service).toMatch(/aMean\(/);
    expect(service).toMatch(/COUNT\(\*\)::int as n/);
  });

  it('the three platform reads take the one range', () => {
    expect(controller.match(/@Query\('range'\) range\?: string/g)?.length).toBe(3);
    expect(service).toMatch(/async usageFunnel\(range\?: string\)/);
    expect(service).toMatch(/async platformDashboard\(range\?: string\)/);
    expect(service).toMatch(/async usageStats\(range\?: string\)/);
  });
});

describe('on the panel', () => {
  it('no percentage is computed on the client from a total the client summed', () => {
    expect(page).not.toMatch(/reduce\(\(a, s\) => a \+ s\.count, 0\)/);
    expect(page).not.toMatch(/Object\.values\(dash\.grounds\.byStatus\)\.reduce/);
  });

  it('every percentage prints its denominator and no mean prints a decimal the server did not give it', () => {
    expect(page.match(/% of \{/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(page).not.toMatch(/avgMinutes\.toFixed/);
    expect(page).not.toMatch(/avgDaysToFirstCheckin\?\.toFixed/);
  });

  it('one range control, and every platform query keys on it', () => {
    expect(page).toContain('PANEL_RANGES.map');
    expect(page).toContain("queryKey: ['platform-dashboard', range]");
    expect(page).toContain("queryKey: ['platform-funnel', range]");
    expect(page).toContain("queryKey: ['platform-usage', range]");
  });
});
