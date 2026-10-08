import { BadRequestException, ForbiddenException, HttpException, NotFoundException, UnauthorizedException, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';
import { aPlainRefusal, asASentence, SOMETHING_WENT_WRONG } from './a-refusal-is-plain';

/**
 * PIECE 6: WHAT A PERSON READS WHEN THE PRODUCT REFUSES, CANNOT FIND, OR FAILS, READ AS EACH PERSON IS SERVED IT.
 *
 * Every error passes the global filter, so what the framework says by default (and what a crash says in its own words) is made
 * plain there, once. Each sentence says what happened and what to do next, with no code, no role in capitals, no class name, no
 * stack, no field list. The developer API keeps the field names it was sent.
 */
const respond = (exception: unknown, url = '/api/v1/grounds') => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ url }) }) } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return { status: (status.mock.calls[0] as any)[0] as number, body: json.mock.calls[0][0] };
};
const readAsAPerson = (m: string) => {
  expect(m).toMatch(/^[A-Z]/);
  expect(m).toMatch(/[.!?]$/);
  expect(m).not.toMatch(/\b(ADMIN|LEAD|MEMBER|GUEST|Exception|Error|undefined|null|Cannot (GET|POST)|Prisma|stack|at \w+\.)\b/);
  expect(m).not.toMatch(/\.ts:|node_modules|\/Users\/|Unauthorized|Forbidden resource|Bad Request|Not Found/);
  expect(m).not.toMatch(/ -> | => /);
};

describe('what the framework says by default is said as a sentence for a person', () => {
  const cases: [string, HttpException][] = [
    ['an unsigned request', new UnauthorizedException()],
    ['a refused request', new ForbiddenException()],
    ['a page that is not there', new NotFoundException('Cannot GET /api/v1/nothing-here')],
    ['a plain not found', new NotFoundException()],
    ['a plain bad request', new BadRequestException()],
  ];
  it.each(cases)('%s', (_n, e) => {
    const { body } = respond(e);
    readAsAPerson(body.message);
    expect(body.message).toMatch(/\b(sign in|ask|go back|check|try again|refresh)\b/);
  });

  it('keeps the status each one has', () => {
    expect(respond(new UnauthorizedException()).status).toBe(401);
    expect(respond(new ForbiddenException()).status).toBe(403);
    expect(respond(new NotFoundException('Cannot GET /x')).status).toBe(404);
  });
});

describe('a crash is never read in its own words', () => {
  it.each([
    "Cannot read properties of undefined (reading 'id')",
    'connect ECONNREFUSED 127.0.0.1:5432',
    'ENOENT: no such file or directory, open /srv/app/dist/x.js',
    'x is not a function',
  ])('%s', (raw) => {
    const out = respond(new Error(raw));
    expect(out.status).toBe(500);
    expect(out.body.message).toBe(SOMETHING_WENT_WRONG);
    expect(JSON.stringify(out.body)).not.toContain(raw);
    readAsAPerson(out.body.message);
  });
  it('a thrown string or object is the same sentence', () => {
    expect(respond('boom').body.message).toBe(SOMETHING_WENT_WRONG);
    expect(respond({ odd: true }).body.message).toBe(SOMETHING_WENT_WRONG);
  });
});

describe('a list of fields that did not validate is one sentence for a person, and the list still travels for a machine', () => {
  it('on the screens\' routes', () => {
    const out = respond(new BadRequestException(['name must be a string', 'name should not be empty']));
    expect(out.body.message).toBe('Something you sent could not be used, so check what you typed and try again.');
    expect(out.body.errors).toEqual(['name must be a string', 'name should not be empty']);
    expect(out.status).toBe(400);
  });
  it('but a sentence written for a person is passed on', () => {
    expect(respond(new BadRequestException(['Your password needs a number or a symbol.'])).body.message).toBe('Your password needs a number or a symbol.');
  });
  it('and the developer API keeps the field names it was sent', () => {
    const out = respond(new BadRequestException(['name must be a string']), '/api/org/v1/subjects');
    expect(out.body.error.message).toBe('The request did not validate: name must be a string');
  });
});

describe('a message somebody wrote is made into a sentence, and not otherwise changed', () => {
  it('capital and full stop', () => {
    expect(asASentence('email is required')).toBe('Email is required.');
    expect(asASentence('Check-in not found')).toBe('Check-in not found.');
  });
  it('leaves a finished sentence alone, quotes and brackets included', () => {
    for (const m of ['You are not in this check-in, so ask whoever runs it to add you.', 'Choose one (any).', 'They said "yes."', 'Is that right?']) {
      expect(asASentence(m)).toBe(m);
    }
  });
  it('is applied to what a controller threw on a screen\'s route, and not on the developer API', () => {
    expect(respond(new NotFoundException('Document not found')).body.message).toBe('Document not found.');
    expect(respond(new NotFoundException('Credential not found'), '/api/org/v1/credentials').body.error.message).toBe('Credential not found');
  });
  it('an empty message gets the default for its status', () => {
    readAsAPerson(aPlainRefusal(404, ''));
    readAsAPerson(aPlainRefusal(500, ''));
  });
});
