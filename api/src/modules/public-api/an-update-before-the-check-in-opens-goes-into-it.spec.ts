import * as fs from 'fs';
import * as path from 'path';

/**
 * Kevin, 13 October 2026 (polish round 1): his day's update, written before the 8am check-in opened, went to Ask and was lost. A message
 * that is not a request, a decision or a question, with nothing open and a check-in opening within eighteen hours, opens that one now.
 */
describe('an update sent before the check-in opens goes into it', () => {
  const door = fs.readFileSync(path.join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('the WhatsApp door brings the next one forward before it reads what is open', () => {
    const forward = door.indexOf("status: CheckInStatus.NOT_STARTED, availableFrom: { gt: new Date(), lte: new Date(Date.now() + 18 * 3_600_000) }");
    expect(forward).toBeGreaterThan(-1);
    expect(door.indexOf('data: { availableFrom: new Date() }')).toBeGreaterThan(forward);
    expect(door.indexOf('const open = everyOpen.filter')).toBeGreaterThan(forward);
  });
  it('never for a request, a decision or a question', () => {
    expect(door).toContain("!looksLikeARequest(arrived.text) && !aDecisionIn(arrived.text) && !/\\?\\s*$/.test(arrived.text.trim())");
  });
});
