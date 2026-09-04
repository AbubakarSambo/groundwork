/**
 * todos:assign was unbounded, and unbounded was wrong.
 *
 * It meant "may add a row to anybody's list". The product and tech lead holds
 * it so he can give work to the person who builds with him — but as written he
 * could put a task on the sales lead's list about sales, which is not what
 * leading product and tech buys you. Nobody would have noticed in code review;
 * it would have shown up months later as friction between two people.
 *
 * The bound is the org chart that already exists, so nothing new has to be
 * maintained: you reach the people in a workstream you own.
 */
import { mayPutAToDoOn } from './whose-list-you-may-write-on';

const productAndTech = {
  ownerPersonId: 'james',
  oversightPersonId: 'hafsah',
  technicalPartnerPersonId: 'abubakar',
};
const sales = { ownerPersonId: 'sahar', oversightPersonId: 'hafsah', technicalPartnerPersonId: null };
const WORKSTREAMS = [productAndTech, sales];

const lead = { personId: 'james', capabilities: ['todos:assign', 'product:write'] };
const salesLead = { personId: 'sahar', capabilities: ['sales:write'] };
const ceo = { personId: 'hafsah', capabilities: ['ceo:board'] };
const contributor = { personId: 'adam', capabilities: ['contributor:self'] };

describe('who may put a to-do on somebody else', () => {
  it('lets the product lead assign to the person who builds with him', () => {
    expect(mayPutAToDoOn(lead, 'abubakar', WORKSTREAMS).allowed).toBe(true);
  });

  it('but not to the sales lead, which is the whole reason for the bound', () => {
    const gate = mayPutAToDoOn(lead, 'sahar', WORKSTREAMS);
    expect(gate.allowed).toBe(false);
    expect(gate.because).toMatch(/do not work in a workstream you own/);
  });

  it('and not to a contributor who is in nobody’s workstream', () => {
    expect(mayPutAToDoOn(lead, 'adam', WORKSTREAMS).allowed).toBe(false);
  });

  it('lets the CEO reach everybody, through running the company rather than a bigger grant', () => {
    for (const target of ['james', 'sahar', 'abubakar', 'adam']) {
      expect(mayPutAToDoOn(ceo, target, WORKSTREAMS).allowed).toBe(true);
    }
  });

  it('and she does not need todos:assign to do it', () => {
    expect(ceo.capabilities).not.toContain('todos:assign');
  });

  it('refuses somebody who owns a workstream but holds no assign grant', () => {
    const gate = mayPutAToDoOn(salesLead, 'hafsah', WORKSTREAMS);
    expect(gate.allowed).toBe(false);
    expect(gate.because).toMatch(/needs todos:assign/);
  });

  it('and always lets anybody write on their own list', () => {
    for (const person of [lead, salesLead, contributor]) {
      expect(mayPutAToDoOn(person, person.personId, WORKSTREAMS).allowed).toBe(true);
    }
  });

  it('and says something useful when you own no workstream at all', () => {
    const orphan = { personId: 'nate', capabilities: ['todos:assign'] };
    expect(mayPutAToDoOn(orphan, 'adam', WORKSTREAMS).because).toMatch(/you do not own one/);
  });
});
