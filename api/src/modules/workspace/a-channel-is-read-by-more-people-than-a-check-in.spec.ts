/**
 * AN EMAIL GOES TO ONE PERSON; A CHANNEL IS READ BY WHOEVER IS IN IT.
 *
 * Somebody wires a webhook into #general on a Friday and every notice after that
 * is a broadcast — to people not on the check-in, never invited to it, and in a
 * shared channel not employed here. So a notice says that something happened and
 * where to go, and the link is the wall.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whatItSays, asSlack, asTeams, isAWorkspaceAddress, Notice } from './what-a-channel-may-be-told';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const notice: Notice = {
  what: 'a round finished',
  about: 'Q4 delivery',
  link: 'https://app.groundwork.africa/grounds/g1',
};

describe('what a notice says', () => {
  it('says what happened and names the check-in', () => {
    expect(whatItSays(notice)).toBe('A round finished on “Q4 delivery”.');
  });

  it('counts people rather than naming them', () => {
    const said = whatItSays({ ...notice, what: 'a check-in is waiting', howMany: 3 });
    expect(said).toContain('3 people');
  });

  it('has nowhere to put what anybody wrote', () => {
    /* Structural rather than habitual: the composer is handed a Notice, and a
       Notice has no field that can hold what was said. No future edit can
       accidentally include it, because there is nothing to include. */
    const rule = withoutComments('what-a-channel-may-be-told.ts');
    const shape = rule.slice(rule.indexOf('export interface Notice'), rule.indexOf('const SAYS'));
    expect(shape).not.toMatch(/\b(body|content|text|said|answer|words|quote|excerpt)\s*[?:]/);
  });

  it('carries a link rather than the thing itself', () => {
    expect(asSlack(notice).text).not.toContain('http');
    expect(JSON.stringify(asSlack(notice))).toContain(notice.link);
  });
});

describe('the same notice, two envelopes', () => {
  it('slack gets blocks and a fallback every client can render', () => {
    const body = asSlack(notice) as any;
    expect(body.text).toBe(whatItSays(notice));
    expect(body.blocks[0].type).toBe('section');
  });

  it('teams gets a card saying exactly the same thing', () => {
    const body = asTeams(notice) as any;
    expect(body.text).toBe(whatItSays(notice));
    expect(body.potentialAction[0].targets[0].uri).toBe(notice.link);
  });
});

describe('where a notice may be posted', () => {
  it('slack, only slack’s own webhook host', () => {
    expect(isAWorkspaceAddress('SLACK', 'https://hooks.slack.com/services/T/B/x')).toBe(true);
    expect(isAWorkspaceAddress('SLACK', 'https://hooks.slack.com.evil.test/x')).toBe(false);
    expect(isAWorkspaceAddress('SLACK', 'https://example.com/webhook')).toBe(false);
  });

  it('never plain http, because the address is a secret', () => {
    expect(isAWorkspaceAddress('SLACK', 'http://hooks.slack.com/services/T/B/x')).toBe(false);
  });

  it('and never something inside our own network', () => {
    expect(isAWorkspaceAddress('SLACK', 'http://localhost:5432/')).toBe(false);
    expect(isAWorkspaceAddress('TEAMS', 'http://169.254.169.254/')).toBe(false);
  });

  it('unless a developer explicitly allowed one host, which production never does', () => {
    expect(isAWorkspaceAddress('SLACK', 'http://localhost:4599/hook', 'localhost')).toBe(true);
    const service = withoutComments('workspace-notifier.service.ts');
    const getter = service.slice(service.indexOf('private get alsoAllow'), service.indexOf('async connect'));
    expect(getter).toContain("'production'");
    expect(getter).toContain('return undefined');
  });
});

describe('the address itself', () => {
  const service = withoutComments('workspace-notifier.service.ts');
  const controller = withoutComments('workspace-notifier.controller.ts');

  it('is never returned by a read', () => {
    const read = service.slice(service.indexOf('async whatIsConnected'), service.indexOf('async turn'));
    expect(read).toContain('select:');
    expect(read).not.toMatch(/\burl:\s*true/);
  });

  it('and connecting one is admin-only, in a session, never a machine token', () => {
    expect(controller).toContain('@Roles(Role.ADMIN)');
    expect(controller).toContain('JwtAuthGuard');
  });
});

describe('posting', () => {
  const service = withoutComments('workspace-notifier.service.ts');

  it('arrives switched off, so nothing posts into a channel nobody has told', () => {
    const schema = fs.readFileSync(path.join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model WorkspaceNotifier'));
    expect(model.slice(0, model.indexOf('\n}'))).toContain('enabled Boolean @default(false)');
  });

  it('only posts where somebody turned it on', () => {
    const tell = service.slice(service.indexOf('async tell'), service.indexOf('async sayHello'));
    expect(tell).toContain('enabled: true');
  });

  it('records a failure rather than retrying it forever', () => {
    expect(service).toContain('lastError');
    expect(service).not.toContain('setTimeout');
    expect(service).not.toMatch(/for \(let attempt/);
  });

  it('never throws into the thing that asked', () => {
    const post = service.slice(service.indexOf('private async post'));
    expect(post).not.toMatch(/throw /);
  });

  it('gives up rather than hanging', () => {
    expect(service).toContain('AbortSignal.timeout');
  });
});
