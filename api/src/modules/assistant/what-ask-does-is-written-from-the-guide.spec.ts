import * as fs from 'fs';
import * as path from 'path';
import { whatAskDoesDocument } from './what-the-assistant-can-do';

/** api/src/modules/assistant/what-ask-does.md is written from the guide (api/scripts/write-what-ask-does.ts) and never by hand, so the two cannot disagree. */
describe('what Ask does, as the document says it', () => {
  it('is exactly what the script writes from the guide', () => {
    const committed = fs.readFileSync(path.join(__dirname, 'what-ask-does.md'), 'utf8');
    expect(committed).toBe(whatAskDoesDocument());
  });
});
