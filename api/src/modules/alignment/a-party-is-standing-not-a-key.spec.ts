/**
 * THE TENANT BOUNDARY IS WHAT EVERYTHING ELSE RESTS ON.
 *
 * Naming an organisation as a party is the one change in this programme that could
 * weaken it — a party row that grants access anywhere beyond the check-in it names
 * is a key to somebody else's tenancy. These hold that it grants standing on one
 * check-in and nothing else.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  Party,
  mayActFor,
  whatThisPartyMayDo,
  howTheSidesRead,
  aReleasedReportOutlivesTheSubscription,
} from './a-party-is-an-organisation';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const A_LIVES_IN = 'org-a';

const theirs = (over: Partial<Party> = {}): Party => ({
  id: 'p2',
  groundId: 'g1',
  side: 'the other side',
  name: 'Meridian Health',
  organizationId: 'org-b',
  ...over,
});

const ours = (over: Partial<Party> = {}): Party => ({
  id: 'p1',
  groundId: 'g1',
  side: 'the side that set it up',
  name: 'Northwind',
  organizationId: A_LIVES_IN,
  ...over,
});

describe('who may act for a party', () => {
  it('B’s own people say who takes part for B', () => {
    expect(mayActFor(theirs(), { organizationId: 'org-b' }, A_LIVES_IN)).toEqual({ may: true });
  });

  it('A cannot designate B’s people any more', () => {
    const out = mayActFor(theirs(), { organizationId: A_LIVES_IN }, A_LIVES_IN) as { because: string };
    expect(out).toHaveProperty('may', false);
    expect(out.because).toContain('Meridian Health');
  });

  it('and a third organisation may not act for either', () => {
    expect(mayActFor(theirs(), { organizationId: 'org-c' }, A_LIVES_IN)).toHaveProperty('may', false);
    expect(mayActFor(ours(), { organizationId: 'org-c' }, A_LIVES_IN)).toHaveProperty('may', false);
  });

  it('the side that set it up is acted for from the organisation the check-in lives in', () => {
    expect(mayActFor(ours(), { organizationId: A_LIVES_IN }, A_LIVES_IN)).toEqual({ may: true });
  });

  it('a party with no account here cannot be acted for, and says why', () => {
    const out = mayActFor(theirs({ organizationId: null }), { organizationId: A_LIVES_IN }, A_LIVES_IN) as { because: string };
    expect(out).toHaveProperty('may', false);
    expect(out.because).toContain('invited by address');
  });

  it('a party is about ONE check-in, so nothing can be granted beyond it', () => {
    /* Structural: the decision takes a party, and a party carries the groundId it
       is about. There is no shape of this function that answers about a ground it
       was not given. */
    const source = withoutComments('a-party-is-an-organisation.ts');
    const shape = source.slice(source.indexOf('export interface Party'), source.indexOf('export type WhatAPartyMayDo'));
    expect(shape).toContain('groundId');
  });
});

describe('neither side is the owner', () => {
  it('both sides may do exactly the same things', () => {
    expect(whatThisPartyMayDo()).toEqual(['designate its own people', 'read a released report', 'speak for its side']);
  });

  it('and nothing anywhere gives the paying side more', () => {
    const source = withoutComments('a-party-is-an-organisation.ts');
    const fn = source.slice(source.indexOf('export function whatThisPartyMayDo'));
    expect(fn.slice(0, fn.indexOf('\n}'))).not.toContain('side ===');
  });

  it('a released report outlives whoever stops paying', () => {
    const said = aReleasedReportOutlivesTheSubscription();
    expect(said).toContain('both sides');
    expect(said).toContain('does not decide who may read');
  });

  it('and the sides are said without either being called the owner', () => {
    const said = howTheSidesRead([ours(), theirs()]);
    expect(said).toContain('Northwind and Meridian Health are the sides');
    expect(said.toLowerCase()).not.toContain('owner');
    expect(said.toLowerCase()).not.toContain('belongs to');
  });
});

describe('the service adds no new way to reach data', () => {
  const service = withoutComments('parties.service.ts');

  it('every read starts from the check-in, never from the party', () => {
    /* A query that returned rows because of who a party IS would be the thing that
       turns a party row into a key. */
    expect(service).not.toMatch(/findMany\(\{\s*where:\s*\{\s*organizationId: caller/);
    for (const read of ['groundParty.findFirst', 'ground.findFirst']) expect(service).toContain(read);
  });

  it('designating goes through the invitation that already exists', () => {
    const fn = service.slice(service.indexOf('async designate('), service.indexOf('async sides('));
    expect(fn).toContain('this.grounds.addParticipant');
    expect(fn).not.toContain('groundParticipant.create');
  });

  it('and the standing is checked before anything is called', () => {
    const fn = service.slice(service.indexOf('async designate('), service.indexOf('async sides('));
    const check = fn.indexOf('mayActFor');
    const invite = fn.indexOf('addParticipant');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(invite);
  });

  it('the sides are readable by either side and by nobody else', () => {
    const fn = service.slice(service.indexOf('async sides('));
    expect(fn).toContain('isASide');
    /* Not Forbidden: telling a stranger a check-in exists is telling them
       something. The same answer as for one that does not. */
    expect(fn).toContain('NotFoundException');
  });

  it('and a side cannot name itself into somebody else’s check-in', () => {
    const fn = service.slice(service.indexOf('async name('), service.indexOf('async designate('));
    expect(fn).toContain('organizationId: callerOrganizationId');
    expect(fn).toContain('NotFoundException');
  });
});
