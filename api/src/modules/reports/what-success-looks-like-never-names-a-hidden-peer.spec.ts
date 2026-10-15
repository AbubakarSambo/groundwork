import { PartyType, RecordEntryType } from '@prisma/client';
import { ReportsService } from './reports.service';

/**
 * RE-REVIEW PRIVACY BUG: "WHAT SUCCESS LOOKS LIKE" NAMED A HIDDEN PEER.
 *
 * My work's "What success looks like" (WhatSuccessLooksLike.tsx, served by
 * `GET /reports/:groundId/against-success` / `ReportsService.whereAgainstSuccess`) shows each
 * person's own words about success, word for word - allowed, because check-in words may be shown
 * to the people in that check-in. But on a check-in that hides its people from each other (an
 * evaluation or a cohort, by default, or any check-in with `peersVisibleToEachOther: false`), a
 * participant must not see a colleague named or their words attributed to them.
 *
 * `whereAgainstSuccessAsBuilt`'s own `ground.findUnique` never selected `scenario` or
 * `peersVisibleToEachOther` - the two fields `peersAreNamedOn` needs to tell a hidden check-in
 * from an open one. Both came back `undefined`, which `peersAreNamedOn` reads as "not evaluative"
 * and "nobody has said", defaulting to TRUE - so every check-in read as though peers were named,
 * whatever the truth. These tests pin the fix: the two fields are now selected, and a hidden
 * peer's real name never reaches a participant through this endpoint.
 */

const LEAD = {
  id: 'p-lead', userId: 'u-lead', partyType: PartyType.INITIATOR, managingOnly: false,
  roleAsDescribed: 'Manager', createdAt: new Date('2026-01-01'), email: 'lead@test.com',
  nameGiven: null, organisationGiven: null,
  user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
const SUBJECT = {
  id: 'p-subject', userId: 'u-subject', partyType: PartyType.PARTICIPANT, managingOnly: false,
  roleAsDescribed: 'Sales rep', createdAt: new Date('2026-01-02'), email: 'subject@test.com',
  nameGiven: null, organisationGiven: null,
  user: { firstName: 'Daniel', lastName: 'Otieno' },
};
const PEER = {
  id: 'p-peer', userId: 'u-peer', partyType: PartyType.PARTICIPANT, managingOnly: false,
  roleAsDescribed: 'Sales rep', createdAt: new Date('2026-01-03'), email: 'peer@test.com',
  nameGiven: null, organisationGiven: null,
  user: { firstName: 'Zawadi', lastName: 'Njoroge' },
};

function makeGround(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'u-lead',
    scenario: 'PIP', // EVALUATION family: peers hidden from each other by default
    peersVisibleToEachOther: null, // nobody has overridden the default
    whoSeesTargets: null,
    participants: [LEAD, SUBJECT, PEER],
    objectives: [],
    report: { releasedAt: null },
    ...overrides,
  };
}

/**
 * A REAL PRISMA `select` OMITS THE KEYS NOT ASKED FOR - a plain `jest.fn(async () => groundRow)`
 * does not, so a mock that always hands back the full row would pass this file even with the bug
 * back in place (the select would be wrong, but the mock would not notice). This shapes the
 * response the way Prisma actually would: only the top-level keys the call's own `select` names.
 */
function selectFrom(row: any, select: Record<string, unknown> | undefined) {
  if (!select) return row;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(select)) out[key] = row[key];
  return out;
}

function makeService(groundRow: any, entries: any[]) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async (args: any) => selectFrom(groundRow, args?.select)) },
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false, role: 'MEMBER', organizationId: 'org-1' })) },
    groundBaseline: {
      findFirst: jest.fn(async () => ({ successLooksLike: 'Close 12 shops by December.', version: 1, conditions: [] })),
    },
    recordEntry: { findMany: jest.fn(async () => entries) },
    groundDocument: { findMany: jest.fn(async () => []) },
  };
  const grounds: any = {};
  return new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => undefined } as any, {} as any, grounds, {} as any);
}

describe('what success looks like never names a hidden peer', () => {
  it('a participant on a hidden (evaluation) check-in reads a colleague\'s definition with no real name attached', async () => {
    const entries = [
      { type: RecordEntryType.SUCCESS_DEFINITION, text: 'Twelve signed supply contracts by December.', participantId: 'p-peer' },
    ];
    const service = makeService(makeGround(), entries);
    const result: any = await service.whereAgainstSuccess('g1', 'u-subject', 'org-1');

    const definitionText = JSON.stringify(result.definitions);
    expect(definitionText).not.toContain('Zawadi');
    expect(definitionText).not.toContain('Njoroge');
  });

  it('the lead still reads everybody\'s real name, hidden or not - she runs the check-in', async () => {
    const entries = [
      { type: RecordEntryType.SUCCESS_DEFINITION, text: 'Twelve signed supply contracts by December.', participantId: 'p-peer' },
    ];
    const service = makeService(makeGround(), entries);
    const result: any = await service.whereAgainstSuccess('g1', 'u-lead', 'org-1');

    const definitionText = JSON.stringify(result.definitions);
    expect(definitionText).toContain('Zawadi');
  });

  /*
   * CHANGED 1 OCTOBER, DECISION 17 OVER THE LEAD'S SWITCH. This used to assert that on a PIP with the
   * switch on, the person reviewed read the colleague's real name. Decision 17 says the person reviewed
   * is never told a colleague's name, whatever the switch. So the switch is now proved on an ordinary
   * check-in, and the PIP case proves the name stays hidden from the person reviewed.
   */
  it('when the lead has explicitly turned peer names ON on an ordinary check-in, a participant reads the real name', async () => {
    const entries = [
      { type: RecordEntryType.SUCCESS_DEFINITION, text: 'Twelve signed supply contracts by December.', participantId: 'p-peer' },
    ];
    const service = makeService(makeGround({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true }), entries);
    const result: any = await service.whereAgainstSuccess('g1', 'u-subject', 'org-1');

    const definitionText = JSON.stringify(result.definitions);
    expect(definitionText).toContain('Zawadi');
  });

  it('on a PIP, the person reviewed is never told the colleague\'s name, even with peer names switched ON (decision 17)', async () => {
    const entries = [
      { type: RecordEntryType.SUCCESS_DEFINITION, text: 'Twelve signed supply contracts by December.', participantId: 'p-peer' },
    ];
    const service = makeService(makeGround({ peersVisibleToEachOther: true }), entries);
    const result: any = await service.whereAgainstSuccess('g1', 'u-subject', 'org-1');

    const definitionText = JSON.stringify(result.definitions);
    expect(definitionText).not.toContain('Zawadi');
    expect(definitionText).toContain('A colleague');
  });

  it('the ground select this endpoint reads from includes the two fields peersAreNamedOn needs', () => {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const src: string = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ');
    const start = src.indexOf('private async whereAgainstSuccessAsBuilt(');
    const end = src.indexOf('if (!ground) throw new NotFoundException', start);
    const body = src.slice(start, end);
    expect(body).toMatch(/scenario:\s*true/);
    expect(body).toMatch(/peersVisibleToEachOther:\s*true/);
  });
});
