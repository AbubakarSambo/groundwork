import { WhatsAppService } from './whatsapp.service';

/** B-107: a number in two organisations was offered the one where WhatsApp is off, and what she wrote there was never answered. */
function service(held: string[]) {
  const people = [
    { phone: '+254700000001', organization: { id: 'lakeview', name: 'Lakeview Clinic' } },
    { phone: '+254700000001', organization: { id: 'msingi', name: 'Msingi Foods' } },
  ];
  const prisma: any = { person: { findMany: jest.fn(async () => people) }, user: { findMany: jest.fn(async () => []) } };
  const addOn: any = { mayWeSend: jest.fn(async (id: string) => (held.includes(id) ? { send: false, why: 'not turned on', saying: 'x' } : { send: true })) };
  const wa = new WhatsAppService({ get: () => undefined } as any, prisma, addOn);
  (wa as any).theSameNumber = async () => true;
  return wa;
}

describe('which organisations a number is offered', () => {
  it('leaves out the one where WhatsApp is off', async () => {
    expect((await service(['lakeview']).whichOrganisationsWhereItWorks('+254700000001')).map((o) => o.name)).toEqual(['Msingi Foods']);
  });
  it('offers both when WhatsApp works in both, and keeps all when it is off in all', async () => {
    expect((await service([]).whichOrganisationsWhereItWorks('+254700000001')).length).toBe(2);
    expect((await service(['lakeview', 'msingi']).whichOrganisationsWhereItWorks('+254700000001')).length).toBe(2);
  });
});
