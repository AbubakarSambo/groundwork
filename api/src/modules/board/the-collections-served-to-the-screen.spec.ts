import { readFileSync } from 'fs';
import { join } from 'path';
import { theCollectionsServedToTheScreen } from './__fixtures__/the-collections-served-to-the-screen';

/**
 * THE SCREENS' TESTS DRAW WHAT THE SERVER SERVES (Release 2, pull request 2 of 3). The collections board and reports the client's
 * tests render are the server's own output for Muchemi & Co (test) and the small lender (test), each reader's copy, kept as JSON
 * beside those tests. If the server's words change, this fails until the JSON is written again from the server.
 */
it('the JSON the screens are tested with is exactly what the server serves each reader', async () => {
  const kept = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'board', 'pictured', '__fixtures__', 'collections-served.json'), 'utf8'));
  expect(JSON.parse(JSON.stringify(await theCollectionsServedToTheScreen()))).toEqual(kept);
});
