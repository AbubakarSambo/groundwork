import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #2: several comments described ReportActivation as a mutual gate ("both
 * parties must activate", "neither party can see content before the other
 * has activated") when the actual code (ReportsService.get()) only ever
 * checks the CALLING participant's own row - one party's activation has no
 * effect on any other party's access. A separate comment on
 * GroundsService.getMediatorBrief claimed org admins access the mediator
 * brief "via the admin surface", but no such admin route exists
 * (admin.controller.ts has no mediator-brief endpoint) and the method itself
 * never grants org-admin access at all. These are locked here so the false
 * claims can't silently reappear.
 */

const ROOT = join(__dirname, '..', '..', '..');

describe('#2a ReportActivation comments describe the real (per-party, not mutual) mechanic', () => {
  const schema = readFileSync(join(ROOT, 'prisma/schema.prisma'), 'utf8');
  const reportsService = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
  const activationSpec = readFileSync(join(__dirname, 'report-activation.spec.ts'), 'utf8');

  it('schema.prisma no longer claims both parties must activate', () => {
    expect(schema).not.toMatch(/Both parties must activate/);
    const block = schema.slice(schema.indexOf('Report activation'), schema.indexOf('enum ReportActivationStatus'));
    expect(block).toMatch(/per-party/i);
  });

  it('reports.service.ts get() comments describe a per-party gate, not a mutual one', () => {
    expect(reportsService).not.toMatch(/\(mutual reveal gate\)/);
    const getDoc = reportsService.slice(reportsService.indexOf('/** Fetch the report'), reportsService.indexOf('async get('));
    expect(getDoc).toMatch(/not a mutual gate/);
  });

  it('report-activation.spec.ts class comment no longer claims "neither party can see content before the other"', () => {
    expect(activationSpec).not.toMatch(/Neither party can see content before\s*\n?\s*\* the other has also activated/);
  });
});

describe('#2b mediator-brief comments match reality (no admin-surface route exists)', () => {
  const groundsService = readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8');
  const adminController = readFileSync(join(__dirname, '..', 'admin', 'admin.controller.ts'), 'utf8');

  it('grounds.service.ts no longer claims org admins access the brief via a separate admin surface', () => {
    const doc = groundsService.slice(groundsService.indexOf('GET /grounds/:id/mediator-brief'), groundsService.indexOf('async getMediatorBrief'));
    expect(doc).not.toMatch(/via the admin surface/);
    expect(doc).toMatch(/no separate org-admin/i);
  });

  it('confirms the claim: admin.controller.ts genuinely has no mediator-brief route', () => {
    expect(adminController).not.toMatch(/mediator-brief|mediatorBrief|getMediatorBrief/);
  });
});
