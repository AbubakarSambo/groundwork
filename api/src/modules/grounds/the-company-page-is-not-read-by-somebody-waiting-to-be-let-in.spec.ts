import { ForbiddenException } from '@nestjs/common';
import { CompanyService, NOT_YOUR_COMPANY } from './company.service';

/**
 * RELEASE CHECK, 7 OCTOBER 2026. Tomas Noaccount opened Wairimu's invitation to "Sales team, Q4" with no account anywhere, so his
 * account was made in Msingi Foods and waits for an admin there. The board and the report refused him; GET /company served him
 * "16 people work here." and the four priorities with their owners ("Get 40 more shops buying from us every week", Wairimu Njoroge,
 * and so on). A guest from another company is refused the same page. Somebody waiting to be let in is not in the organisation yet.
 */
const ORG = 'org-msingi';
function setup(awaitingOrgApproval: boolean) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval })) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Msingi Foods' })) },
    subject: { findMany: jest.fn(async () => [{ id: 's1', organizationId: ORG, type: 'OBJECTIVE', title: 'Get 40 more shops buying from us every week', ownerExternalId: 'wairimu' }]) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    organizationMembership: { findMany: jest.fn(async () => []), count: jest.fn(async () => 16), findUnique: jest.fn(async () => ({ role: 'MEMBER' })) },
    ground: { findMany: jest.fn(async () => []) },
    companyPicture: { findUnique: jest.fn(async () => null) },
    organizationMemory: { findMany: jest.fn(async () => []) },
  };
  const grounds: any = { list: jest.fn(async () => []) };
  return { svc: new CompanyService(prisma, grounds), prisma };
}

describe('the company page and somebody waiting to be let in', () => {
  it('Tomas, waiting for an admin of Msingi Foods, is refused, and no priority is looked up', async () => {
    const { svc, prisma } = setup(true);
    await expect(svc.forReader({ userId: 'tomas', email: 'tomas@elsewhere.test', organizationId: ORG, role: 'MEMBER' })).rejects.toThrow(new ForbiddenException(NOT_YOUR_COMPANY));
    expect(prisma.subject.findMany).not.toHaveBeenCalled();
  });
});
