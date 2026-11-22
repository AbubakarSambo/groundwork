import { canTheyCheckInOnWhatsApp, theirPhoneLine, itAsksOnWhatsApp } from './can-they-check-in-on-whatsapp';

/**
 * WHETHER A PERSON CAN CHECK IN ON WHATSAPP, FROM THE RECORD (Hafsah, 21 November 2026; corrected the same day after a browser
 * test). "Checks in" only once they have written from that number; before that, "Can check in". And their row's number, connection
 * and WhatsApp read as one plain line, every fact kept.
 */
describe('can they check in on WhatsApp', () => {
  const ON = { organisationName: 'Msingi Foods', whatsappIsOn: true, phone: '+254700100008', where: 'connected' as const, checkInsOnWhatsApp: ['Sales team, Q4'] };
  it('"Checks in" once they have written from the number', () => {
    expect(canTheyCheckInOnWhatsApp(ON)).toBe('Checks in on WhatsApp in Sales team, Q4.');
    expect(canTheyCheckInOnWhatsApp({ ...ON, checkInsOnWhatsApp: ['Sales team, Q4', 'Deliveries', 'Stock'] })).toBe('Checks in on WhatsApp in Sales team, Q4, Deliveries and Stock.');
  });
  it('"Can check in" while nothing has come from the number yet, never that it has happened', () => {
    for (const where of ['not-connected', 'waiting'] as const) {
      expect(canTheyCheckInOnWhatsApp({ ...ON, where })).toBe('Can check in on WhatsApp in Sales team, Q4.');
      expect(canTheyCheckInOnWhatsApp({ ...ON, where })).not.toMatch(/^Checks/);
    }
  });
  it('not while the organisation\'s WhatsApp is off, whatever else is true', () => {
    expect(canTheyCheckInOnWhatsApp({ ...ON, whatsappIsOn: false })).toBe('Can’t check in on WhatsApp yet, because WhatsApp is off for Msingi Foods.');
  });
  it('not without a number, nor when none of their check-ins asks on WhatsApp', () => {
    expect(canTheyCheckInOnWhatsApp({ ...ON, phone: null, where: 'no-number' })).toBe('Can’t check in on WhatsApp yet, because no phone number is saved for them.');
    expect(canTheyCheckInOnWhatsApp({ ...ON, checkInsOnWhatsApp: [] })).toBe('Can’t check in on WhatsApp yet, because none of their check-ins asks on WhatsApp.');
  });
  it('a check-in asks on WhatsApp while it runs, unless its lead kept it in the app', () => {
    expect(itAsksOnWhatsApp({ status: 'ACTIVE', overWhatsApp: null })).toBe(true);
    expect(itAsksOnWhatsApp({ status: 'ACTIVE', overWhatsApp: false })).toBe(false);
    expect(itAsksOnWhatsApp({ status: 'COMPLETED', overWhatsApp: true })).toBe(false);
  });
});

describe('their row\'s phone line, as one line', () => {
  const ON = { organisationName: 'Msingi Foods', whatsappIsOn: true, phone: '+254700100008', where: 'connected' as const, checkInsOnWhatsApp: ['Sales team, Q4'] };
  it('the number, whether it is connected, and WhatsApp', () => {
    expect(theirPhoneLine(ON)).toBe('+254700100008, connected. Checks in on WhatsApp in Sales team, Q4.');
    expect(theirPhoneLine({ ...ON, where: 'not-connected' })).toBe('+254700100008, not connected yet. Can check in on WhatsApp in Sales team, Q4.');
    expect(theirPhoneLine({ ...ON, where: 'waiting' })).toBe('+254700100008, waiting for their first message on WhatsApp. Can check in on WhatsApp in Sales team, Q4.');
  });
  it('no number', () => {
    expect(theirPhoneLine({ ...ON, phone: null, where: 'no-number' })).toBe('No phone number yet, so they can’t check in on WhatsApp.');
  });
  it('while WhatsApp is off, nothing about a connection, only the number and why', () => {
    expect(theirPhoneLine({ ...ON, whatsappIsOn: false })).toBe('+254700100008. Can’t check in on WhatsApp yet, because WhatsApp is off for Msingi Foods.');
    expect(theirPhoneLine({ ...ON, whatsappIsOn: false, phone: null, where: 'no-number' })).toBe('No phone number yet.');
  });
  it('no colon joins the pieces', () => {
    for (const r of [ON, { ...ON, whatsappIsOn: false }, { ...ON, where: 'waiting' as const }]) expect(theirPhoneLine(r)).not.toMatch(/:/);
  });
});
