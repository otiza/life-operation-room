import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const errors = exception.issues;
    const details = errors.map((issue) => {
      const path = issue.path.length ? issue.path.map(String).join('.') : '(root)';
      return `${path}: ${issue.message}`;
    });
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: details.join('; ') || 'Validation failed',
      errors,
    });
  }
}
