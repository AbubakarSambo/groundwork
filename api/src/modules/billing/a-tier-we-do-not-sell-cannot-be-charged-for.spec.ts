import { readFileSync } from 'fs';
import { join } from 'path';
import { GoneException } from '@nestjs/common';
import { BillingController } from './billing.controller';

/**
 * A TIER WE DO NOT SELL CANNOT BE CHARGED FOR.
 *
 * POST /billing/purchase-session created a real $5 Checkout under a summary calling it legacy and
 * unreachable. The client had stopped offering it; the route had not stopped taking money. It is
 * gone - the product owner's word - and the method with it. The route stays registered so an old
 * caller gets a clear 410, and the webhook branch that reads a historical session_fee event stays,
 * because Stripe redelivers old events long after their writer is gone.
 */
describe('purchase-session', () => {
  it('is gone, with a sentence rather than a 404', () => {
    const c = new BillingController({} as any, {} as any, {} as any, { whatIsWaitingFor: async () => null } as any, {} as any);
    expect(() => c.purchaseSession()).toThrow(GoneException);
    expect(() => c.purchaseSession()).toThrow(/not sold one at a time/);
  });

  it('has no service method left to create a charge', () => {
    const src = readFileSync(join(__dirname, 'billing.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/async purchaseSession\(/);
    expect(src).not.toMatch(/unit_amount: 500/);
  });

  it('but the webhook still recognises a historical payment, so a redelivery is not a 500', () => {
    const src = readFileSync(join(__dirname, 'billing.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/session\.metadata\?\.type === 'session_fee'/);
  });
});
