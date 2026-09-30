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
    /* The page was rebuilt from the shared parts (group 1, 30 September): each field now has a
       visible label tied to it by id, instead of an aria-label, and the secret box says in a full
       sentence that it is shown once. The three things asked are the same. */
    expect(page).toMatch(/<FieldLabel htmlFor="tools-embed-domains">Sites allowed to show it<\/FieldLabel>[\s\S]{0,200}id="tools-embed-domains"/);
    expect(page).toMatch(/<FieldLabel htmlFor="tools-embed-placement">Where it sits<\/FieldLabel>[\s\S]{0,200}id="tools-embed-placement"/);
    expect(page).toMatch(/<FieldLabel htmlFor="tools-embed-out">Departments that should see nothing at all<\/FieldLabel>[\s\S]{0,200}id="tools-embed-out"/);
    expect(page).toContain('Signing secret. Copy it now, because it is shown only once.');
    expect(page).toMatch(/<script src="\$\{API_ORIGIN\}\/embed\.js" data-mode=/);
  });
  it('the snippet uses the attributes the loader actually reads', () => {
    const loader = readFileSync(join(__dirname, 'static', 'embed.js'), 'utf8');
    for (const attr of ['data-mode', 'data-token', 'data-anchor']) expect(loader).toContain(`'${attr}'`);
  });
});
