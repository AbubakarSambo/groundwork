import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A KEY READS NO MORE THAN A PERSON. Two people-shaped routes passed only the organisation to their
 * service and never the fence the credential carries, so a key bound to three people read the
 * forecasts of anybody in the organisation. The guard's own comment predicted it: "a new endpoint
 * that simply forgets, and reads everything". Both hand `req.machine` - structurally a Fence - through.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const controller = strip(readFileSync(join(__dirname, 'public-api.controller.ts'), 'utf8'));
const service = strip(readFileSync(join(__dirname, 'grounds-by-api.service.ts'), 'utf8'));

describe('the two people-shaped reads', () => {
  it('pass the fence', () => {
    expect(controller).toMatch(/this\.groundsByApi\.howTheirForecastsHaveGone\(req\.machine\.organizationId, personExternalId, req\.machine\)/);
    expect(controller).toMatch(/this\.groundsByApi\.beforeAConversation\(req\.machine\.organizationId, personExternalId, req\.machine\)/);
  });
  it('and the service refuses outside it', () => {
    expect(service).toMatch(/async howTheirForecastsHaveGone\(organizationId: string, personExternalId: string, fence\?: Fence\)/);
    expect(service).toMatch(/async beforeAConversation\(organizationId: string, personExternalId: string, fence\?: Fence\)/);
    expect((service.match(/mayTouch\(fence, personExternalId\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
