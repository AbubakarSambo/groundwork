import { isPublished } from '../published-surfaces';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { whatToSayAboutADatabaseError } from './a-database-error-is-not-a-message';
import { aPlainRefusal } from './a-refusal-is-plain';

/** What a person is told when the payment provider refuses, whatever it said. No key, no provider vocabulary, and the truth about the money. */
export const PAYMENTS_ARE_NOT_AVAILABLE = 'Payments are not available right now. Nothing has been charged. Please try again later.';

/** A request the body-parser could not read: not JSON, too large, or cut short. A 4xx from the sender's side, not a crash. */
export function theRequestCouldNotBeRead(e: unknown): boolean {
  const type = (e as { type?: unknown })?.type;
  const status = (e as { status?: unknown; statusCode?: unknown })?.status ?? (e as { statusCode?: unknown })?.statusCode;
  return typeof type === 'string' && /^(entity\.|request\.aborted|encoding\.unsupported|charset\.unsupported|stream\.)/.test(type) && typeof status === 'number' && status >= 400 && status < 500;
}

/** An error thrown by Stripe's library (its classes are all called Stripe...Error and carry a `type` of the same kind). */
export function isAStripeError(e: unknown): boolean {
  const t = (e as any)?.type;
  return e instanceof Error && ((typeof t === 'string' && /^Stripe/.test(t)) || /^Stripe/.test(e.constructor?.name ?? ''));
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;
    /* A machine-readable reason, where a route gives one (e.g. BACK_OFFICE_CODE_REQUIRED). */
    let code: string | null = null;
    /**
     * A REFUSAL THAT ASKS FOR MORE HAS TO SAY SO IN THE BODY THE CLIENT ACTUALLY READS.
     *
     * `conversation.service.ts`'s completion gate throws `BadRequestException({ message, canContinue:
     * true })` so the client can tell "answer more, then try again" apart from every other refusal
     * and re-open the composer instead of leaving it disabled. This filter used to rebuild the body
     * from `message`/`errors`/`code` alone and drop everything else on the thrown object - so the
     * live response never carried `canContinue`, the client fell back to its default refusal
     * handling, and the end card stayed up over a disabled box. Passed through explicitly, as a
     * boolean only, the same way `code` is: never the whole exception, never a class name or a stack.
     */
    let canContinue: boolean | null = null;
    /* How it failed, so the screens' own routes can be made plain (a-refusal-is-plain.ts). */
    let fromTheValidationList = false;
    let fromOurOwnCrash = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>;
        /*
         * `message` IS A STRING, ALWAYS. class-validator hands the pipe an array of sentences and
         * they landed here as `message`, so a caller got a string from every hand-thrown error and
         * an array from the pipe (fix plan F14). The array is what `errors` was for.
         */
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message;
          message = summariseValidation(responseObj.message);
          fromTheValidationList = !writtenForAPerson(responseObj.message);
        } else {
          message = responseObj.message || message;
          errors = responseObj.errors || null;
        }
        code = typeof responseObj.code === 'string' ? responseObj.code : null;
        canContinue = typeof responseObj.canContinue === 'boolean' ? responseObj.canContinue : null;
      }
    } else if (exception instanceof Error && theRequestCouldNotBeRead(exception)) {
      /* The body-parser's own errors (a body that is not JSON, or is too big) carry the right status on the error itself. They are the sender's, not a fault of ours. */
      status = (exception as { status?: number; statusCode?: number }).status ?? (exception as { statusCode?: number }).statusCode ?? HttpStatus.BAD_REQUEST;
      message = status === HttpStatus.PAYLOAD_TOO_LARGE ? 'Payload too large' : 'Bad Request';
    } else if (exception instanceof Error) {
      /**
       * A PRISMA ERROR IS NOT A MESSAGE, AND IT IS NOT SAFE EITHER.
       *
       * `exception.message` went straight into the response body. For a Prisma
       * failure that message is the whole invocation: the file path on our
       * server, the line number, the model, every field with its value, and any
       * internal id that happened to be in the arguments. Reproduced by posting
       * a roadmap item without `itemType` and reading back
       * `.../ops-build.service.ts:39:39` along with a person's UUID.
       *
       * Same fault as the ThrottlerException note below — the product answering
       * in the vocabulary of its own stack — except this one also hands out
       * information. The detail goes to the log, where it is useful; the caller
       * gets a sentence and a status that matches what actually went wrong.
       */
      const database = whatToSayAboutADatabaseError(exception, isPublished(request.url));
      if (isAStripeError(exception)) {
        /* Stripe's own words can carry the start of our key ("Invalid API Key provided: sk_test_..."). The detail goes to the log, trimmed of any key. */
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = PAYMENTS_ARE_NOT_AVAILABLE;
        this.logger.warn(`Stripe refused a request: ${exception.message.replace(/\b(sk|rk|pk)_(test|live)_\w*/g, '[a key]')}`);
      } else {
        if (database) {
          status = database.status;
          message = database.message;
        } else {
          message = exception.message;
          fromOurOwnCrash = true;
        }

        this.logger.error(
          `Unhandled exception: ${exception.message}`,
          exception.stack,
        );
      }
    }

    /**
     * A PERSON READ "ThrottlerException: Too Many Requests" ON THE SIGN-IN
     * SCREEN.
     *
     * Caught on a live run: the rate limiter fires, Nest puts its own exception
     * CLASS NAME in the message, the filter passes it through untouched and the
     * sign-in page renders whatever it is given. So the one moment somebody is
     * already stuck - they cannot get in - the product answers in the vocabulary
     * of its own stack trace.
     *
     * Rewritten here rather than on the screen, because every screen that shows
     * an error would otherwise need the same fix, and the next one added would
     * not have it.
     */
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      message = 'Too many tries in a short time. Wait about a minute and try again.';
    } else if (typeof message === 'string' && /^[A-Z]\w*(Exception|Error):\s/.test(message)) {
      // Anything else that leaks a class name. Same fault, different exception.
      message = message.replace(/^[A-Z]\w*(Exception|Error):\s*/, '');
    }

    /*
     * A PUBLISHED SURFACE GETS A RAW BODY ON FAILURE AS IT DOES ON SUCCESS. One shape: the machine
     * API's parser learns `{ error: { code, message, details } }` once. Same list the success
     * interceptor reads. (F14)
     */
    /* The screens' own routes read in plain sentences; a developer's code on the published API keeps the field names it sent. */
    if (!isPublished(request.url)) {
      message = aPlainRefusal(status, typeof message === 'string' ? message : String(message ?? ''), { fromTheValidationList, fromOurOwnCrash });
    }

    if (isPublished(request.url)) {
      response.status(status).json({
        error: { code: code ?? codeFor(status), message, details: errors },
      });
      return;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      ...(code ? { code } : {}),
      ...(canContinue !== null ? { canContinue } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

/** One sentence for a pipe failure; the sentences themselves travel as `errors` / `details`. */
/** Every message is a sentence somebody wrote to be read (a capital letter first, a full stop last). */
function writtenForAPerson(sentences: string[]): boolean {
  const written = sentences.map((s) => String(s).trim());
  return written.length > 0 && written.every((s) => /^[A-Z].*[.!?]$/.test(s));
}

export function summariseValidation(sentences: string[]): string {
  /*
   * A MESSAGE ALREADY WRITTEN FOR A PERSON IS PASSED ON AS IT IS. U.2 re-review.
   *
   * The pipe's own messages start with the field's name ("message must be a string") and read best
   * behind "The request did not validate:". A DTO that wrote its own sentence ("Your password needs a
   * number or a symbol.") was read to a person as "The request did not validate: Your password needs
   * a number or a symbol.", two pieces joined by a colon. A message that begins with a capital letter
   * and ends with a full stop is a sentence somebody wrote to be read; those are passed on alone, and
   * several of them are joined as sentences. Nothing else changes, and the full list still travels as
   * `errors` / `details`.
   */
  const written = [...new Set(sentences.map((s) => String(s).trim()))];
  if (written.length && written.every((s) => /^[A-Z].*[.!?]$/.test(s))) return written.join(' ');
  const fields = [...new Set(sentences.map((s) => String(s).split(' ')[0]).filter(Boolean))];
  if (!fields.length) return 'The request did not validate.';
  return fields.length === 1
    ? `The request did not validate: ${sentences[0]}`
    : `${fields.length} fields did not validate: ${fields.join(', ')}.`;
}

/** A stable word for the status when the exception carried no code of its own. */
export function codeFor(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 410: return 'gone';
    case 422: return 'unprocessable';
    case 429: return 'too_many_requests';
    default: return status >= 500 ? 'server_error' : 'error';
  }
}
