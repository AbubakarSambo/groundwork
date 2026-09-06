/**
 * THE DOOR THIS OPENS IS THE ONE THAT MATTERS MOST.
 *
 * Getting it right means somebody's first minute has their work in it. Getting it
 * wrong means a stranger inside a company, which is not a bug anybody can undo by
 * fixing the code afterwards — so every rule here is held twice: once for the
 * person who should get in, and once for the person who should not.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whereTheyBelong, ROLE_FOR_SOMEBODY_EXPECTED } from './they-are-already-on-somebodys-roster';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const row = (over: Partial<Parameters<typeof whereTheyBelong>[0][number]> = {}) => ({
  personId: 'p1',
  organizationId: 'northwind',
  email: 'grace@northwind.test',
  active: true,
  linkedUserId: null,
  ...over,
});

describe('somebody their company already listed', () => {
  it('joins the organisation that listed them', () => {
    expect(whereTheyBelong([row()])).toEqual({ join: true, organizationId: 'northwind', personId: 'p1' });
  });

  it('as a member, never an admin', () => {
    expect(ROLE_FOR_SOMEBODY_EXPECTED).toBe('MEMBER');
  });
});

describe('and everybody else gets their own workspace', () => {
  it('nobody listed that address', () => {
    expect(whereTheyBelong([]).join).toBe(false);
  });

  it('the roster row is somebody else’s seat already', () => {
    expect(whereTheyBelong([row({ linkedUserId: 'someone-else' })]).join).toBe(false);
  });

  it('they were switched off — a leaver does not let themselves back in', () => {
    expect(whereTheyBelong([row({ active: false })]).join).toBe(false);
  });

  it('two organisations list the address, so nothing is guessed', () => {
    const decided = whereTheyBelong([row(), row({ personId: 'p2', organizationId: 'meridian' })]);
    expect(decided.join).toBe(false);
    expect((decided as { because: string }).because).toContain('More than one organisation');
  });

  it('but the same organisation listing them twice is still them', () => {
    const decided = whereTheyBelong([row(), row({ personId: 'p2' })]);
    expect(decided.join).toBe(true);
  });
});

describe('the address is the only thing ever matched', () => {
  const service = withoutComments('auth.service.ts');
  const rule = withoutComments('they-are-already-on-somebodys-roster.ts');

  it('the decision never sees a domain', () => {
    expect(rule).not.toContain('@');
    expect(rule).not.toContain('split');
    expect(rule).not.toContain('endsWith');
  });

  it('and the query that feeds it matches a whole address', () => {
    const from = service.indexOf('const listedAs');
    const to = service.indexOf('whereTheyBelong(', from);
    const query = service.slice(from, to);
    expect(from).toBeGreaterThan(-1);
    expect(query).toContain('email: { equals: pending.email');
    expect(query).not.toContain('contains');
    expect(query).not.toContain('endsWith');
  });

  it('joins as the role the rule names rather than one written here', () => {
    const from = service.indexOf('if (belongs.join)');
    const to = service.indexOf('this.logger.log', from);
    const branch = service.slice(from, to);
    expect(from).toBeGreaterThan(-1);
    expect(branch).toContain('ROLE_FOR_SOMEBODY_EXPECTED');
    expect(branch).not.toContain("role: 'ADMIN'");
  });

  it('links the roster row to the account it just made', () => {
    const from = service.indexOf('if (belongs.join)');
    const to = service.indexOf('this.logger.log', from);
    expect(service.slice(from, to)).toContain('linkedUserId: u.id');
  });

  it('runs only where the address has been proved', () => {
    /* Inside the pending-signup branch, which exists because the link was opened.
       Deciding this at sign-up would join an organisation on an address typed by
       somebody who may not own it. */
    const pending = service.indexOf('const pending = await this.prisma.pendingSignup.findUnique');
    const decide = service.indexOf('const belongs = whereTheyBelong');
    expect(pending).toBeGreaterThan(-1);
    expect(decide).toBeGreaterThan(pending);
  });
});
