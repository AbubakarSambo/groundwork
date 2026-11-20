import type { WhatSheMeans } from './the-draft-request';

/**
 * STANDS IN FOR THE MODEL'S READING OF WHAT SHE MEANS, FOR A SPEC (fix plan 16 November, group 4). The year-end handler asks the model whether a message is an approval, a decline,
 * a request for the draft or none of them; a spec has no model, so it says what the model would read for the messages it sends. What the spec proves is what the code does with
 * the reading (who may approve, which version, what is said). That the model reads each phrasing so is proved in a run on the real model, not here.
 */
export const aReadingOfHerWords = (readings: Record<string, WhatSheMeans['asks'] | { asks: WhatSheMeans['asks']; version: number }>) =>
  async (message: string): Promise<WhatSheMeans> => {
    const r = readings[message];
    return typeof r === 'string' ? { asks: r, version: null } : r ? { asks: r.asks, version: r.version } : { asks: 'none', version: null };
  };
