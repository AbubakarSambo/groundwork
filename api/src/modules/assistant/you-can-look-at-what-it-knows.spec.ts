/**
 * A CITATION NOBODY CAN GO AND LOOK AT IS A CITATION ON TRUST.
 *
 * These hold the two ways this page could quietly become a lie: by fetching its
 * own material, so it describes a different set of facts than the one being
 * answered from; and by showing a bounded list as though it were a whole one.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whatICanSee } from './what-i-can-see';
import { whatIsTrueFor, RawMaterial, MOST_OF_EACH } from './what-is-true-for-this-person';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const material = (over: Partial<RawMaterial> = {}): RawMaterial => ({
  person: { externalId: 'ada', displayName: 'Ada' },
  objectives: [],
  commitments: [],
  sessions: [],
  decisions: [],
  ...over,
});

const anObjective = (n: number) => ({
  title: `Objective ${n}`,
  measure: 'signed customers',
  target: '12',
  dueDate: new Date('2026-12-31T00:00:00Z'),
  justification: null,
  approach: null,
  theirs: true,
});

describe('what it can see, shown to the person it is about', () => {
  it('says where every group came from', () => {
    const seen = whatICanSee(whatIsTrueFor(material({ objectives: [anObjective(1)] })));
    expect(seen.groups.length).toBeGreaterThan(0);
    for (const g of seen.groups) expect(typeof g.from).toBe('string');
    for (const g of seen.groups) expect(g.from.length).toBeGreaterThan(0);
  });

  it('shows each item, because being able to look is the whole point', () => {
    const seen = whatICanSee(whatIsTrueFor(material({ objectives: [anObjective(1)] })));
    const objectives = seen.groups.find((g) => g.what.startsWith('Objectives'))!;
    expect(objectives.howMany).toBe(1);
    expect(objectives.each[0]).toContain('Objective 1');
    expect(objectives.each[0]).toContain('yours');
  });

  it('never shows a trimmed list as though it were whole', () => {
    const many = Array.from({ length: MOST_OF_EACH + 6 }, (_, i) => anObjective(i));
    const seen = whatICanSee(whatIsTrueFor(material({ objectives: many })));
    const objectives = seen.groups.find((g) => g.what.startsWith('Objectives'))!;

    expect(objectives.howMany).toBe(MOST_OF_EACH);
    expect(seen.leftOut).toContain('6 more objectives');
    expect(seen.mostOfEach).toBe(MOST_OF_EACH);
  });

  it('says nothing was left out when nothing was', () => {
    const seen = whatICanSee(whatIsTrueFor(material({ objectives: [anObjective(1)] })));
    expect(seen.leftOut).toEqual([]);
  });

  it('carries both halves: what it can do and what it still cannot', () => {
    const seen = whatICanSee(whatIsTrueFor(material()));
    expect(seen.canDo.length).toBeGreaterThan(0);
    expect(seen.cannotDo.length).toBeGreaterThan(0);
  });
});

describe('the page is not a second query', () => {
  const source = withoutComments('what-i-can-see.ts');
  const controller = withoutComments('what-i-can-see.controller.ts');

  it('assembles nothing of its own', () => {
    expect(source).not.toContain('prisma');
    expect(source).not.toContain('Prisma');
  });

  it('reads the one assembly the assistant reads', () => {
    expect(controller).toContain('WhatIsTrueService');
    expect(controller).toContain('forPerson');
    expect(controller).not.toContain('PrismaService');
  });
});

describe('it can only ever be pointed at yourself', () => {
  const controller = withoutComments('what-i-can-see.controller.ts');

  it('takes nothing from the caller about whose material to show', () => {
    expect(controller).not.toContain('@Param');
    expect(controller).not.toContain('@Query');
    expect(controller).not.toContain('@Body');
  });

  it('builds the answer for the person the token names', () => {
    expect(controller).toContain('req.panel.personId');
    expect(controller).toContain('req.panel.organizationId');
  });

  it('is guarded by the panel session', () => {
    expect(controller).toContain('UseGuards(EmbedSessionGuard)');
  });
});
