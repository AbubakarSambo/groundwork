import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * A LOCATION PIN, KEPT AS PROOF OF WHERE SOMEBODY WAS WHEN THEY SENT IT (Hafsah, 11 October 2026).
 *
 * Field teams send a pin to show they are on site. It is kept with their check-in like any other
 * proof, and it says only what the record holds: who shared it, when, the coordinates, and the name
 * or address only where WhatsApp sent one with the pin. A place name is never made up, and a pin
 * never says somebody did any work there.
 */
export interface ALocationPin { latitude: number; longitude: number; name?: string | null; address?: string | null }

/** "10:42 on Tuesday 13 October", in the zone the person is told times in. */
export function whenItWasShared(at: Date, zone?: string): string {
  return `${whenItWas(at, 'time', zone)} on ${whenItWas(at, 'weekdayAndDay', zone)}`;
}

const aSentenceEnd = (t: string) => t.trim().replace(/[.\s]+$/, '');

/** What the pin's own name and address are, only where WhatsApp sent them. */
function whatThePinSays(pin: ALocationPin): string {
  const name = (pin.name ?? '').trim();
  const address = (pin.address ?? '').trim();
  return `${name ? ` The pin is named ${aSentenceEnd(name)}.` : ''}${address ? ` The address on the pin is ${aSentenceEnd(address)}.` : ''}`;
}

/** The record, as everybody who may see the person's proof reads it. */
export function aLocationPinOnTheRecord(who: string, pin: ALocationPin, at: Date, zone?: string): string {
  return `${who} shared a location pin at ${whenItWasShared(at, zone)}.${whatThePinSays(pin)} The pin is at latitude ${pin.latitude}, longitude ${pin.longitude}.`;
}

/** What the file list calls it. */
export function aLocationPinsName(at: Date, zone?: string): string {
  return `Location pin shared at ${whenItWasShared(at, zone)}`;
}

/** What the person who shared it is told back. */
export function aLocationPinSaidBack(pin: ALocationPin, at: Date, zone?: string): string {
  return `Your location pin is on your check-in. You shared it at ${whenItWasShared(at, zone)}.${whatThePinSays(pin)}`;
}
