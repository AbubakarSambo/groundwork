import { readFileSync } from 'fs';
import { join } from 'path';
import { theMatterServedToTheScreen } from './__fixtures__/the-matter-served-to-the-screen';

/**
 * THE SCREENS' TESTS DRAW WHAT THE SERVER SERVES (Release 2, pull request 3 of 3). The matter board and the fee notes board the
 * client's tests render are the server's own output for Muchemi & Co (test), each reader's copy, kept as JSON beside those tests.
 * If the server's words change, this fails until the JSON is written again from the server.
 */
it('the JSON the screens are tested with is exactly what the server serves each reader', async () => {
  const kept = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'board', 'pictured', '__fixtures__', 'matter-served.json'), 'utf8'));
  expect(JSON.parse(JSON.stringify(await theMatterServedToTheScreen()))).toEqual(kept);
});
