import * as fs from 'fs';
import * as path from 'path';

/**
 * WHAT THE THREE USER JOURNEYS SHARE: the made-up people and the organisation the admin's journey
 * creates. The admin's spec writes it; the lead's and the participant's read it. One command runs the
 * three in order (see the header of journey-1-admin.spec.ts), because each picks up where the last left off.
 * Nothing here is real: the addresses end in .test and the mail never leaves this computer.
 */
const FILE = path.join(__dirname, '.user-journeys-world.json');

export interface World {
  stamp: number;
  organisation: string;
  grace: string;
  wairimu: string;
  amani: string;
  baraka: string;
  checkIn: string;
  /** The check-in's address in the app, once the lead has made it. */
  checkInPath?: string;
}

export function newWorld(): World {
  const stamp = Date.now();
  const w: World = {
    stamp,
    organisation: `Kito Foods ${stamp}`,
    grace: `grace.achieng@${stamp}.kito.test`,
    wairimu: `wairimu.njoroge@${stamp}.kito.test`,
    amani: `amani.wekesa@${stamp}.kito.test`,
    baraka: `baraka.mutua@${stamp}.kito.test`,
    checkIn: 'Sales team, last quarter',
  };
  fs.writeFileSync(FILE, JSON.stringify(w));
  return w;
}

export function theWorld(): World {
  if (!fs.existsSync(FILE)) throw new Error('Run journey-1-admin.spec.ts first: it makes the organisation the other two journeys use.');
  return JSON.parse(fs.readFileSync(FILE, 'utf8')) as World;
}

export function keepTheWorld(w: World) {
  fs.writeFileSync(FILE, JSON.stringify(w));
}

/** The lead's pasted plan: the same words the API journey pastes. */
export const THE_PLAN = `Sales team plan for the last quarter of the year.

We are at KES 9.6m for the quarter against KES 18m. Credit must stay under 35% of sales.

Amani Wekesa closed Harbor Foods this week, her biggest ever. I want Amani at KES 4.5m for the quarter. She told me she would send the Green Mart renewal proposal on Wednesday and it did not happen.

Baraka Mutua runs deliveries. He will confirm the Fresh Basket delivery date with the warehouse by Friday 16 October.

Dates: the quarter ends 31 December and the price list goes out on 1 November.`;
