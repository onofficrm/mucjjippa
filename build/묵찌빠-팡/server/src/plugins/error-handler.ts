import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { isDev } from '../config/env.js';

export async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn(
        { err: error, code: error.code, details: error.details },
        error.message
      );
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten(),
        },
      });
    }

    const statusCode =
      'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled server error');
      // 관리자 대시보드 "오류 수" / 모니터링 오류 로그
      void import('../modules/admin/monitoring.js').then(({ recordSystemError }) =>
        recordSystemError({
          code: 'INTERNAL_ERROR',
          message: error.message || 'Unhandled server error',
          scope: `${request.method} ${request.routeOptions?.url ?? request.url}`,
          requestId: request.id,
          context: { stack: isDev ? error.stack : undefined },
        })
      );
    } else {
      request.log.warn({ err: error }, error.message);
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message:
          statusCode >= 500 && !isDev
            ? 'Internal server error'
            : error.message || 'Unexpected error',
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}
