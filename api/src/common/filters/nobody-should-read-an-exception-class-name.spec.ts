import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

/**
 * A PERSON READ "ThrottlerException: Too Many Requests" ON THE SIGN-IN SCREEN.
 *
 * Caught on a live twelve-session run, from the screenshot Playwright takes when
 * something fails. The rate limiter fires, Nest puts its own exception CLASS NAME
 * in the message, the filter passes it through untouched, and the sign-in page
 * renders whatever it is handed. So at the one moment somebody is already stuck -
 * they cannot get in - the product answers them in the vocabulary of its own
 * stack trace.
 *
 * Fixed in the filter rather than on the screen, because otherwise every screen
 * that shows an error needs the same fix and the next screen added will not have
 * it.
 */

const respond = (exception: unknown) => {
  const json = jest.fn();
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: () => ({ json }) }),
      getRequest: () => ({ url: '/api/v1/auth/login' }),
    }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return json.mock.calls[0][0];
};

describe('what a person reads when they are rate limited', () => {
  it('is plain English, and says what to do', () => {
    // THE REGRESSION, verbatim from the live screenshot.
    const out = respond(
      new HttpException('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
    );
    expect(out.message).toBe('Too many tries in a short time. Wait about a minute and try again.');
    expect(out.statusCode).toBe(429);
  });

  it('says it however the exception was phrased', () => {
    // The message is replaced rather than cleaned, because there is no wording of
    // "Too Many Requests" that tells somebody the wait is about a minute.
    for (const raw of ['Too Many Requests', 'ThrottlerException: Too Many Requests', '']) {
      expect(respond(new HttpException(raw, 429)).message).toMatch(/Wait about a minute/);
    }
  });
});

describe('any other exception class name that leaks', () => {
  it('loses the class name and keeps the sentence', () => {
    // Same fault, different exception, and there will be others - so the rule is
    // about the shape rather than about this one throttle.
    expect(respond(new HttpException('PayloadTooLargeError: File too large', 413)).message)
      .toBe('File too large');
  });

  it('leaves an ordinary message exactly alone', () => {
    // The check must not touch the messages this codebase writes on purpose, and
    // most of them start with a capital.
    for (const msg of [
      'Incorrect email or password.',
      'Report not found',
      'Session turn limit reached. Please complete your session.',
      'Ground: this person has already joined.',
    ]) {
      expect(respond(new HttpException(msg, 400)).message).toBe(msg);
    }
  });

  it('and still reports a plain crash as a server error rather than its message', () => {
    const out = respond(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
    expect(out.statusCode).toBe(500);
    // Not a rule this change touches, asserted because it is next door to it.
    expect(out.success).toBe(false);
  });
});
