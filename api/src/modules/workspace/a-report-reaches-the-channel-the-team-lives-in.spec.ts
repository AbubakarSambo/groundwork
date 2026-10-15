import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A REPORT REACHES THE CHANNEL THE TEAM LIVES IN. tell() has five live call sites and read
 * workspaceNotifier rows that nothing in the console could write, so for every organisation it
 * returned an empty list. The Connections page now has "Notices in Slack or Teams" (U.18, moved there
 * from the Connect page, as the prototype draws it): paste a webhook address, add it switched off,
 * post a test, switch it on, switch it off, remove it. Slack or Teams is read from the address.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');
const page = strip(readFileSync(join(CLIENT, 'pages', 'connections', 'ConnectionsPage.tsx'), 'utf8'));
const told = strip(readFileSync(join(__dirname, 'what-a-channel-may-be-told.ts'), 'utf8'));
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
    for (const label of ['Post a test', 'Remove', 'Add it, switched off']) expect(page).toContain(`>${label}<`);
    expect(page).toContain("{n.enabled ? 'Switch off' : 'Switch on'}");
    expect(page).toContain('Notices in Slack or Teams');
    /* Both kinds can still be added: the kind is read from the address. */
    expect(page).toMatch(/hooks\\.slack\\.com[\s\S]{0,40}'slack' : 'teams'/);
  });
  it('a notice says something is ready and links to it, never what is in it', () => {
    /* Group 1's wording review (1 October) split the prototype's semicolon-joined line into two
       plain sentences. The promise is the same: a notice links, and never carries what anyone said. */
    expect(page).toContain('A notice says something is ready and links to it. It never includes what anyone said, because more people read a channel than a check-in.');
  });
  it('and the server can only send that: a sentence and a link, with nowhere to put what anyone said', () => {
    const notice = told.slice(told.indexOf('export interface Notice {'), told.indexOf('}', told.indexOf('export interface Notice {')) + 1);
    const fields = [...notice.matchAll(/^\s*(\w+)\??:/gm)].map(m => m[1]);
    expect(fields).toEqual(['what', 'about', 'howMany', 'link']);
    expect(told).toMatch(/export function asSlack[\s\S]*?Open it in Groundwork/);
  });
});
