import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * RESEND REDELIVERS ON PURPOSE, AND A REDELIVERY IS NOT A SECOND EMAIL.
 *
 * If we are slow to answer the webhook, the same message arrives again. Inserting it twice puts one
 * person's email in the inbox twice, and the second copy is unread - so a message somebody has
 * already dealt with reappears as new, which is exactly how an inbox stops being trusted.
 *
 * Nothing is updated on the redelivery either: the first copy IS the message, and overwriting would
 * clear a `readAt` somebody had set.
 *
 * Comments stripped, and read by a path relative to this file. The first version of this spec was a
 * throwaway bite-check with my own home directory hardcoded in it, which passed here and could not
 * pass anywhere else - CI said so within two minutes.
 */
const SRC = readFileSync(join(__dirname, 'delivery.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

describe('a redelivered webhook is not a second copy of somebody\'s email', () => {
  it('keys the upsert on the provider\'s own id', () => {
    expect(SRC).toContain('where: { providerId: arrived.providerId }');
  });

  it('changes nothing on the second arrival', () => {
    expect(SRC).toContain('update: {},');
  });

  it('still stores a message that arrived without an id', () => {
    /* Rare, and losing it would be worse than the duplicate this is protecting against. */
    expect(SRC).toContain('inboundMessage.create({ data: arrived as any })');
  });

  it('never costs the webhook its answer when storing fails', () => {
    /* A 500 here makes Resend retry, which is how one failure becomes many. */
    const block = SRC.slice(SRC.indexOf('isSomethingSentToUs(event?.type)'));
    expect(block.slice(0, 1200)).toContain('.catch(');
  });
});
