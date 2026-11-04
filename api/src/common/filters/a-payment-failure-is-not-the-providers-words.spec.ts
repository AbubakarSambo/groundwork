import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter, PAYMENTS_ARE_NOT_AVAILABLE } from './http-exception.filter';

/**
 * B-006: choosing a plan when the payment provider refused answered 500 with the provider's own words,
 * "Invalid API Key provided: sk_test_...", the start of our key included, and an unhandled exception in the log.
 */
const respond = (exception: unknown) => {
  const json = jest.fn();
  const host = { switchToHttp: () => ({ getResponse: () => ({ status: () => ({ json }) }), getRequest: () => ({ url: '/api/v1/billing/subscription' }) }) } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return json.mock.calls[0][0];
};

class StripeAuthenticationError extends Error { type = 'StripeAuthenticationError'; }

describe('when the payment provider refuses', () => {
  it('says plainly that nothing was charged, with no key and no provider words', () => {
    const out = respond(new StripeAuthenticationError('Invalid API Key provided: sk_test_...'));
    expect(out.message).toBe('Payments are not available right now. Nothing has been charged. Please try again later.');
    expect(out.message).toBe(PAYMENTS_ARE_NOT_AVAILABLE);
    expect(out.statusCode).toBe(503);
    expect(JSON.stringify(out)).not.toMatch(/sk_|API Key|Stripe/);
  });
  it('answers every other crash with one plain sentence, not its own words', () => {
    expect(respond(new Error('Something else broke')).message).toBe('Something went wrong on my side. Please try again in a minute, and if it happens again, tell me.');
  });
});
