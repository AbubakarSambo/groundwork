import { readFileSync } from 'fs';
import { join } from 'path';
import { theCheckInToAddTo, WHAT_WOULD_YOU_LIKE_TO_ADD } from './add-something';

/** Hafsah, after polish round 3: people can add something any time, and it goes into the record the same way an answer does. */
describe('add something, any time', () => {
  it('goes into the check-in that is open, else the next one waiting', () => {
    expect(theCheckInToAddTo([{ id: 'a', status: 'COMPLETED', sessionNumber: 3 }, { id: 'b', status: 'IN_PROGRESS', sessionNumber: 4 }, { id: 'c', status: 'NOT_STARTED', sessionNumber: 5 }])?.id).toBe('b');
    expect(theCheckInToAddTo([{ id: 'c', status: 'NOT_STARTED', sessionNumber: 6 }, { id: 'd', status: 'NOT_STARTED', sessionNumber: 5 }])?.id).toBe('d');
    expect(theCheckInToAddTo([{ id: 'a', status: 'COMPLETED', sessionNumber: 3 }])).toBeNull();
  });
  it('opens a waiting one with "What would you like to add?", and sends what they added in as an answer', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const at = src.indexOf('async addSomething(');
    expect(at).toBeGreaterThan(-1);
    const body = src.slice(at, src.indexOf('async sendMessage(', at));
    expect(body).toContain('await this.open(target.id, userId, WHAT_WOULD_YOU_LIKE_TO_ADD)');
    expect(body).toContain('await this.sendMessage(target.id, userId, said)');
    expect(WHAT_WOULD_YOU_LIKE_TO_ADD).toBe('What would you like to add?');
  });
  it('is a route anyone in the check-in can use, for their own record only', () => {
    const ctl = readFileSync(join(__dirname, 'conversation.controller.ts'), 'utf8');
    expect(ctl).toContain("@Post('add-something/:groundId')");
    expect(ctl).toContain('this.conversation.addSomething(groundId, userId, dto.message)');
  });
});
