import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>;
        message = responseObj.message || message;
        errors = responseObj.errors || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
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

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
