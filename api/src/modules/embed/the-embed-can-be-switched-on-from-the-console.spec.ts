import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE EMBED CAN BE SWITCHED ON FROM THE CONSOLE. Over 1,300 lines of served loader, panel page and
 * signing scheme, reachable only by a database row written by hand, while the integrations page's own
 * copy promised the panel. The page now has the section: domains, placement, out-of-scope departments,
 * the secret shown once, and the snippet to paste.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');
const page = strip(readFileSync(join(CLIENT, 'pages', 'org', 'IntegrationsPage.tsx'), 'utf8'));
const api = strip(readFileSync(join(CLIENT, 'api', 'integrations.ts'), 'utf8'));

describe('the console', () => {
  it('reads and writes the embed configuration through the routes that existed', () => {
    expect(api).toContain("apiClient.get<EmbedConfig | null>('/integrations/embed')");
    expect(api).toContain("apiClient.post<EmbedConfig & { signingSecret: string }>('/integrations/embed', body)");
    expect(page).toMatch(/queryFn: integrationsApi\.embedConfig/);
    expect(page).toMatch(/integrationsApi\.setUpEmbed\(\{/);
  });
  it('asks the three things the server takes, shows the secret once, and hands over the snippet', () => {
    expect(page).toContain('aria-label="Allowed domains"');
    expect(page).toContain('aria-label="Placement"');
    expect(page).toContain('aria-label="Out-of-scope departments"');
    expect(page).toContain('Signing secret - shown once');
    expect(page).toMatch(/<script src="\$\{API_ORIGIN\}\/embed\.js" data-mode=/);
  });
  it('the snippet uses the attributes the loader actually reads', () => {
    const loader = readFileSync(join(__dirname, 'static', 'embed.js'), 'utf8');
    for (const attr of ['data-mode', 'data-token', 'data-anchor']) expect(loader).toContain(`'${attr}'`);
  });
});
