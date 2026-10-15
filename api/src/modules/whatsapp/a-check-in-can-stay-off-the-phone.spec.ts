import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LISTENER = strip(readFileSync(join(__dirname, '../webhooks/webhooks.listener.ts'), 'utf8'));
const SERVICE = strip(readFileSync(join(__dirname, '../grounds/grounds.service.ts'), 'utf8'));
const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');

/**
 * A CHECK-IN CAN STAY OFF SOMEBODY'S PHONE, AND SAYING SO HAD NOWHERE TO LIVE.
 *
 * Connecting a WhatsApp number turned it on for the whole organisation: every check-in opened went
 * to everyone's phone who had a number on their profile. A lead setting up a performance plan, or a
 * conversation about somebody's role, had no way to keep that one in the app - and nowhere to look
 * for one, because the setting did not exist at any level below the organisation.
 *
 * THREE STATES, AND THE THIRD IS THE POINT. Null means "whatever the organisation does", which is
 * exactly what every ground did before the column existed. A two-state boolean with a default would
 * have answered the question for every ground in the database on the day it was added, and the
 * answer would have been one somebody had to discover by watching messages arrive.
 */
describe('a check-in can stay off the phone', () => {
  it('the column is nullable, so nothing that already runs was decided for', () => {
    /* `Boolean?` and no @default. Both halves matter: a default makes the null state unreachable. */
    expect(SCHEMA).toMatch(/overWhatsApp Boolean\? @map\("over_whatsapp"\)/);
    expect(SCHEMA).not.toMatch(/overWhatsApp Boolean\?[^\n]*@default/);
  });

  it('the sender asks the ground, and only null and true send', () => {
    /*
      `!== false` rather than `=== true`: null is "follow the organisation", and the organisation's
      behaviour is what the two conditions beside it already test. Written as `=== true` this would
      have silently switched WhatsApp OFF for every existing check-in.
    */
    expect(LISTENER).toMatch(/if \(ground\.overWhatsApp === false\) return;/);
    expect(LISTENER).not.toMatch(/overWhatsApp === true/);
    /* And it still needs a number to send to. Changed 2 October (survey item 7): it no longer needs
       the organisation's own number connected, because Groundwork's number announces too. */
    expect(LISTENER).toMatch(/if \(!phone\) return;/);
  });

  it('the ground has to be loaded with the field, or the check above is always undefined', () => {
    /*
      The failure this catches is silent and total: `select` without the column leaves it undefined,
      `undefined !== false` is true, and every check-in goes to WhatsApp again with the setting
      appearing to work on screen.
    */
    const at = LISTENER.indexOf('onCheckInOpened');
    expect(LISTENER.slice(at, at + 600)).toMatch(/select: \{[^}]*overWhatsApp: true/);
  });

  it('turning it on is refused where there is no number to answer on', () => {
    /* A control that can be switched on with nothing behind it is a door into a wall - the pattern
       this codebase has now caught three times. */
    const at = SERVICE.indexOf('async setOverWhatsApp');
    expect(at).toBeGreaterThan(-1);
    const body = SERVICE.slice(at, at + 900);
    expect(body).toMatch(/over === true/);
    expect(body).toMatch(/whatsAppConnection/);
    expect(body).toMatch(/BadRequestException/);
  });

  it('and the setting is only a setting the lead may change', () => {
    const at = SERVICE.indexOf('async setOverWhatsApp');
    expect(SERVICE.slice(at, at + 300)).toMatch(/aSettingOnlyTheLeadMayChange/);
  });
});
