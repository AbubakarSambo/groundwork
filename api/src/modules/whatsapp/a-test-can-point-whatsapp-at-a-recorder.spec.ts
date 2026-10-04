import { WhatsAppService } from './whatsapp.service';

/**
 * The only way a local run of the WhatsApp journeys can send nothing to anyone: Meta's address is a setting that
 * only a test changes, and unset it is Meta's own.
 */
function aService(base: string | undefined) {
  const config: any = { get: (k: string) => ({ 'whatsapp.graphBaseUrl': base, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '555', 'whatsapp.enabled': true })[k] };
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppSend: { create: jest.fn(async () => ({})), findFirst: jest.fn(async () => null) },
    notification: { create: jest.fn(async () => ({})) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    organization: { findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
  };
  const service = new WhatsAppService(config, prisma);
  (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return service;
}

describe('where a WhatsApp message is posted', () => {
  const real = global.fetch;
  afterEach(() => { global.fetch = real; });

  it('goes to the address a test set, never to Meta', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (u: any) => { urls.push(String(u)); return { ok: true, status: 200, text: async () => '' } as any; }) as any;
    await (aService('http://127.0.0.1:3999/graph/') as any).post('555', 'test-token', '+2348012345678', 'Hello');
    expect(urls).toEqual(['http://127.0.0.1:3999/graph/555/messages']);
  });

  it('goes to Meta when nothing is set', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (u: any) => { urls.push(String(u)); return { ok: true, status: 200, text: async () => '' } as any; }) as any;
    await (aService(undefined) as any).post('555', 'test-token', '+2348012345678', 'Hello');
    expect(urls).toEqual(['https://graph.facebook.com/v20.0/555/messages']);
  });
});
