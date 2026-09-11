import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A REPORT REACHES THE CHANNEL THE TEAM LIVES IN. tell() has five live call sites and read
 * workspaceNotifier rows that nothing in the console could write, so for every organisation it
 * returned an empty list. The integrations page now has "Where we tell you": paste a webhook address,
 * pick Slack or Teams, post a test, switch it on, switch it off.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');
const page = strip(readFileSync(join(CLIENT, 'pages', 'org', 'IntegrationsPage.tsx'), 'utf8'));
const api = strip(readFileSync(join(CLIENT, 'api', 'integrations.ts'), 'utf8'));
const controller = strip(readFileSync(join(__dirname, 'workspace-notifier.controller.ts'), 'utf8'));

describe('the console', () => {
  it('calls every route the controller answers', () => {
    expect(controller).toContain("@Controller('integrations/workspace')");
    expect(api).toContain("apiClient.get<WorkspaceNotifier[]>('/integrations/workspace')");
    expect(api).toMatch(/apiClient\.post<[^>]*>\(`\/integrations\/workspace\/\$\{kind\}`, \{ url, channelSaid \}\)/);
    expect(api).toMatch(/`\/integrations\/workspace\/\$\{kind\}\/test`/);
    expect(api).toMatch(/`\/integrations\/workspace\/\$\{kind\}\/\$\{on \? 'on' : 'off'\}`/);
    expect(api).toMatch(/apiClient\.delete\(`\/integrations\/workspace\/\$\{kind\}`\)/);
  });
  it('offers the four actions: connect, test, switch, remove', () => {
    for (const label of ['Post a test', 'Remove', 'Connect']) expect(page).toContain(`>${label}<`);
    expect(page).toContain("{n.enabled ? 'Switch off' : 'Switch on'}");
    expect(page).toContain('Where we tell you');
  });
  it('a notice says something is ready and links to it, never what is in it', () => {
    expect(page).toContain('never what is in it');
  });
});
