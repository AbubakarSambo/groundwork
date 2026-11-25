/**
 * FOR SPECS ONLY: a Stripe test key for the whole file, so paying is possible here (`payingIsPossibleHere`) and the four weeks
 * after a trial, the pause and the "no plan" refusals apply as built. Restored after the file. Without a key, nobody is paused
 * and nobody is refused for having no plan (Hafsah, 23 November 2026).
 */
export const A_STRIPE_TEST_KEY = 'sk_test_51abcdefghijklmnopqrstuvwxyz0123456789';

export function whilePayingIsPossible(): void {
  let before: string | undefined;
  beforeAll(() => { before = process.env.STRIPE_SECRET_KEY; process.env.STRIPE_SECRET_KEY = A_STRIPE_TEST_KEY; });
  afterAll(() => { if (before === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = before; });
}
