import { BadRequestException } from '@nestjs/common';
import { ScimService } from '../people/scim.service';
import { WRITE_THE_FULL_NUMBER } from './a-number-whatsapp-can-reach';

/**
 * THE ROSTER IMPORT KEEPS NUMBERS THE SAME WAY (decision 82, item 8).
 *
 * An organisation's roster arrives by SCIM (and the people route, which goes through it). It took
 * out spaces and dashes only, so a local "0801 234 5678" was kept as "+08012345678" and never
 * matched the number WhatsApp sends. It now uses the one function Settings and an admin's roster
 * entry use.
 */
function aRoster(opts: { theirPeopleAreNigerian: boolean }) {
  const created: any[] = [];
  const prisma: any = {
    person: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => (opts.theirPeopleAreNigerian ? [{ phone: '+2348011111111' }] : [])),
      create: jest.fn(async (q: any) => { created.push(q.data); return { id: 'p-1', ...q.data }; }),
    },
    user: { findMany: jest.fn(async () => []) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
  };
  return { scim: new ScimService(prisma), created };
}
const push = (phone: string) => ({ externalId: 'emp-7', userName: 'amina@example.com', phoneNumbers: [{ value: phone, primary: true }] });

describe('a number in an organisation’s roster import', () => {
  it('written with spaces is kept the way WhatsApp sends it', async () => {
    const { scim, created } = aRoster({ theirPeopleAreNigerian: false });
    await scim.upsert('org-1', 'hr', push('+234 801 234 5678'));
    expect(created[0].phone).toBe('+2348012345678');
  });

  it("written as a local number takes the organisation's country", async () => {
    const { scim, created } = aRoster({ theirPeopleAreNigerian: true });
    await scim.upsert('org-1', 'hr', push('0801 234 5678'));
    expect(created[0].phone).toBe('+2348012345678');
  });

  it('written as a local number with no country known is refused, with a sentence saying what to send', async () => {
    const { scim, created } = aRoster({ theirPeopleAreNigerian: false });
    const p = scim.upsert('org-1', 'hr', push('0801 234 5678'));
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow(WRITE_THE_FULL_NUMBER);
    expect(created).toEqual([]);
  });
});
