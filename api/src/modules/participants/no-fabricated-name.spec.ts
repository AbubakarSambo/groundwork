import { ParticipantsService } from './participants.service';

/**
 * NO-FABRICATED-NAME tripwire. When a participant accepts (or joins) without
 * giving a name, the server used to store a capitalized email local-part
 * ("Hjumare" from hjumare@x.test) as their firstName - a name that was never
 * given, permanently persisted, and later rendered everywhere as if real.
 * The correct "no name given" value is an empty string: participantLabel()
 * (client/src/lib/utils.ts) and every display surface already fall back to
 * roleAsDescribed / "a teammate" for an empty name - they were just never
 * getting the chance to, because firstName was never actually empty.
 */
describe('participants.resolveName never fabricates a name from the email', () => {
  const service = Object.create(ParticipantsService.prototype) as any;

  it('uses the given name when provided', () => {
    expect(service.resolveName('kwame@acme.test', { firstName: 'Kwame', lastName: 'Boateng' }))
      .toEqual(['Kwame', 'Boateng']);
  });

  it('returns an EMPTY name (not the email local-part) when no name is given', () => {
    expect(service.resolveName('hjumare@acme.test', undefined)).toEqual(['', '']);
    expect(service.resolveName('hjumare@acme.test', {})).toEqual(['', '']);
  });
});
