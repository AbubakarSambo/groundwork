/**
 * Writes docs/use-cases/what-ask-does.md from the one description of what Groundwork can do (THE_GUIDE). Run from api/:
 *   npx ts-node -T scripts/write-what-ask-does.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { whatAskDoesDocument } from '../src/modules/assistant/what-the-assistant-can-do';

export const WHAT_ASK_DOES_PATH = path.join(__dirname, '..', '..', 'docs', 'use-cases', 'what-ask-does.md');

if (require.main === module) {
  fs.writeFileSync(WHAT_ASK_DOES_PATH, whatAskDoesDocument());
  console.log(`Wrote ${WHAT_ASK_DOES_PATH}`);
}
