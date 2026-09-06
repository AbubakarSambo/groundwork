/**
 * The navigation hid a page and the server allowed it.
 *
 * /ops/approvals was gated in the menu on ceo:board and not gated at all on the
 * server. Adam got a 200 and an empty list. Nothing leaked — and it was still
 * wrong, because "may I see this" was being answered by the interface, and the
 * first person to type the address would have reached a page the navigation
 * says is not theirs.
 *
 * The spec asked for this sweep in exactly those words: RBAC is API-side, not
 * UI-side. I ran it late and it found this.
 *
 * So the two rules are asserted to agree, for every role, rather than being
 * kept in step by whoever remembers.
 */
import { DEFAULT_GRANTS } from './what-somebody-may-do';
import { decidesSomething, APPROVAL_CAPABILITIES } from './who-decides-anything';

describe('who the approvals queue is for', () => {
  it('is derived from the capability names, so a new approval is covered the day it is added', () => {
    expect(APPROVAL_CAPABILITIES.length).toBeGreaterThan(2);
    for (const c of APPROVAL_CAPABILITIES) expect(c).toMatch(/:approve$/);
  });

  it('lets in somebody who decides something', () => {
    expect(decidesSomething({ capabilities: DEFAULT_GRANTS.CEO })).toBe(true);
  });

  it('and refuses everybody who decides nothing', () => {
    for (const role of ['SALES_MARKETING', 'PRODUCT_TECH_LEAD', 'TECH', 'CONTRIBUTOR'] as const) {
      expect(decidesSomething({ capabilities: DEFAULT_GRANTS[role] })).toBe(false);
    }
  });

  it('and the menu rule and the server rule agree for every role', () => {
    /**
     * The menu offers /ops/approvals to anybody holding ceo:board. The server
     * lets in anybody who decides something. Those are two different sentences,
     * and this asserts they pick the same people — otherwise one of them is
     * lying to somebody, and it is always the menu.
     */
    const disagreements = Object.entries(DEFAULT_GRANTS)
      .filter(([, granted]) => {
        const menuWouldOffer = granted.includes('ceo:board');
        const serverWouldAllow = decidesSomething({ capabilities: granted });
        return menuWouldOffer !== serverWouldAllow;
      })
      .map(([role]) => role);

    expect(disagreements).toEqual([]);
  });
});
