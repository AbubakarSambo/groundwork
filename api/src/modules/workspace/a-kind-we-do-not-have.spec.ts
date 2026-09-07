/**
 * `/integrations/workspace/discord/on` reached Prisma as the enum value DISCORD and came back a
 * 500. A typo in a URL is a mistake, and the answer to a mistake names what was expected.
 */
import * as fs from 'fs';
import * as path from 'path';
import { theKind, KINDS_WE_HAVE } from './a-kind-we-do-not-have';

describe('a kind we do not have', () => {
  it('accepts the two we do, however they were typed', () => {
    expect(theKind('slack')).toBe('SLACK');
    expect(theKind('Teams')).toBe('TEAMS');
    expect(theKind(' SLACK ')).toBe('SLACK');
  });

  it('refuses anything else with a sentence that names both, not a 500', () => {
    for (const said of ['discord', 'email', 'SLACKK', '']) {
      let caught: any;
      try { theKind(said); } catch (e) { caught = e; }
      expect(caught?.getStatus?.()).toBe(400);
      expect(caught.message).toMatch(/Slack or Teams/);
    }
  });

  it('refuses an absent segment rather than reading undefined as a kind', () => {
    expect(() => theKind(undefined)).toThrow(/Slack or Teams/);
  });

  it('names exactly the kinds the database has', () => {
    expect(KINDS_WE_HAVE).toEqual(['SLACK', 'TEAMS']);
  });
});

describe('and no route upper-cases a path segment into the enum any more', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'workspace-notifier.controller.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('every route asks theKind', () => {
    expect(src).not.toMatch(/toUpperCase\(\) as WorkspaceKind/);
    /* Five routes take :kind — connect, test, on, off, disconnect. */
    expect((src.match(/theKind\(kind\)/g) ?? []).length).toBe(5);
  });
});

describe('and disconnecting says whether anything was connected', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'workspace-notifier.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('reads the delete count rather than reporting success either way', () => {
    const from = src.indexOf('async disconnect');
    const body = src.slice(from, src.indexOf('async tell', from));
    expect(body).toContain('const { count }');
    expect(body).toContain('wasConnected: count > 0');
  });
});
