import { BadRequestException, HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter, summariseValidation, codeFor } from './http-exception.filter';
import { isPublished } from '../published-surfaces';

/**
 * ONE ERROR SHAPE FOR A MACHINE.
 *
 * The success interceptor exempted the published API from the envelope; the failure filter did not,
 * so an integrator got a raw body on success and `{success:false, statusCode, ...}` on failure. And
 * inside that, `message` was a string from every hand-thrown error and an array from the validation
 * pipe (fix plan F14). One shape, and message is a string, everywhere.
 */
const respond = (exception: unknown, url: string) => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ url }) }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return { status: (status.mock.calls[0] as any)[0] as number, body: json.mock.calls[0][0] };
};
const PIPE = new BadRequestException(['message must be a string', 'message should not be empty']);
const HAND = new HttpException({ message: 'This token does not hold the subjects:write scope.', code: 'scope' }, HttpStatus.FORBIDDEN);

describe('on the published API', () => {
  it('a validation failure and a hand-thrown failure have the same keys, and message is a string in both', () => {
    const a = respond(PIPE, '/api/org/v1/subjects');
    const b = respond(HAND, '/api/org/v1/subjects');
    expect(Object.keys(a.body)).toEqual(['error']);
    expect(Object.keys(a.body.error).sort()).toEqual(['code', 'details', 'message']);
    expect(Object.keys(b.body.error).sort()).toEqual(['code', 'details', 'message']);
    expect(typeof a.body.error.message).toBe('string');
    expect(typeof b.body.error.message).toBe('string');
    expect(a.body.error.details).toEqual(['message must be a string', 'message should not be empty']);
    expect(a.body.error.code).toBe('bad_request');
    expect(b.body.error.code).toBe('scope');
    expect(a.status).toBe(400);
    expect(b.status).toBe(403);
  });

  it('while the app keeps its envelope, with message a string there too', () => {
    const { body } = respond(PIPE, '/api/v1/auth/login');
    expect(body.success).toBe(false);
    expect(typeof body.message).toBe('string');
    expect(body.errors).toHaveLength(2);
  });

  it('reads the same list the success interceptor reads', () => {
    expect(isPublished('/api/org/v1/grounds')).toBe(true);
    expect(isPublished('/embed.js')).toBe(true);
    expect(isPublished('/embed/panel')).toBe(true);
    expect(isPublished('/api/v1/grounds')).toBe(false);
    expect(isPublished(undefined)).toBe(false);
  });

  it('summarises the pipe in one sentence and names a status in one word', () => {
    expect(summariseValidation(['message must be a string'])).toBe('The request did not validate: message must be a string');
    expect(summariseValidation(['a must be x', 'b must be y'])).toBe('2 fields did not validate: a, b.');
    expect(codeFor(404)).toBe('not_found');
  });

  it('passes on a message a DTO wrote as a sentence for a person, without the colon (U.2 re-review)', () => {
    expect(summariseValidation(['Your password needs a number or a symbol.'])).toBe('Your password needs a number or a symbol.');
    expect(summariseValidation(['Your password needs at least 8 characters.', 'Your password needs a number or a symbol.']))
      .toBe('Your password needs at least 8 characters. Your password needs a number or a symbol.');
    /* A mix keeps the old summary: not every message is a sentence written for a person. */
    expect(summariseValidation(['Your password needs a number or a symbol.', 'token must be a string'])).toBe('2 fields did not validate: Your, token.');
    expect(codeFor(503)).toBe('server_error');
  });
});
