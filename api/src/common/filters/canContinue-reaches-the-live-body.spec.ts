import { BadRequestException, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

/**
 * THE THIN-RECORD REFUSAL NEVER REACHED THE CLIENT (U.8 third review).
 *
 * `conversation.service.ts`'s completion gate throws
 * `new BadRequestException({ message: '...', canContinue: true })` so the client can re-open the
 * composer instead of leaving it disabled under a stale end card. But this filter rebuilt the
 * response body from `message` / `errors` / `code` alone and dropped `canContinue` on the floor, so
 * the LIVE 400 body was `{"success":false,"statusCode":400,"message":"...","errors":null,...}` with
 * no `canContinue` anywhere - the client's `err?.response?.data?.canContinue` read `undefined`,
 * fell through to the generic refusal, and the end card stayed up.
 *
 * This runs the REAL filter on the REAL exception shape the completion gate throws (copied here,
 * not imported from conversation.service.ts, since the filter must not depend on engine code to be
 * tested) and reads the actual JSON body it produces - not a client test faking the response.
 */
const respond = (exception: unknown, url = '/api/v1/check-ins/ci1/complete') => {
  const json = jest.fn();
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: () => ({ json }) }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return json.mock.calls[0][0];
};

describe('the completion gate\'s refusal, as the filter actually serves it', () => {
  it('carries canContinue through to the live response body', () => {
    const out = respond(new BadRequestException({
      message: 'There is almost nothing here yet. Answer a couple of the questions properly, then complete.',
      canContinue: true,
    }));
    expect(out.statusCode).toBe(400);
    expect(out.message).toBe('There is almost nothing here yet. Answer a couple of the questions properly, then complete.');
    expect(out.canContinue).toBe(true);
  });

  it('carries it through false as well as true - a real boolean, not just truthiness', () => {
    const out = respond(new BadRequestException({ message: 'Refused for an unrelated reason.', canContinue: false }));
    expect(out.canContinue).toBe(false);
  });

  it('never invents the field for a refusal that never said it', () => {
    const out = respond(new BadRequestException('You have already finished this check-in, so there is nothing more to add.'));
    expect(out).not.toHaveProperty('canContinue');
  });

  it('never passes through anything other than a boolean, even if something sends one', () => {
    const out = respond(new BadRequestException({ message: 'x', canContinue: 'true' as any }));
    expect(out).not.toHaveProperty('canContinue');
  });

  it('is a small, explicit field, never the whole exception object', () => {
    const out = respond(new BadRequestException({
      message: 'There is almost nothing here yet. Answer a couple of the questions properly, then complete.',
      canContinue: true,
      somePrivateInternalDetail: 'never meant to leave the server',
    }));
    expect(out).not.toHaveProperty('somePrivateInternalDetail');
    expect(JSON.stringify(out)).not.toMatch(/somePrivateInternalDetail/);
  });
});
