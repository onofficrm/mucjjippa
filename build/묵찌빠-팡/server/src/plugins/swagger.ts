import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_NAME, APP_VERSION, env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadOpenApiDocument(): Record<string, unknown> {
  const candidates = [
    resolve(__dirname, '../../openapi/openapi.json'),
    resolve(process.cwd(), 'openapi/openapi.json'),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  return {
    openapi: '3.0.3',
    info: {
      title: APP_NAME,
      version: APP_VERSION,
      description: 'OpenAPI document missing — see server/openapi/openapi.json',
    },
    paths: {},
  };
}

/** Swagger UI — /api/docs (개발·스테이징 기본 노출, 프로덕션은 APP_ENV로 제어) */
export async function swaggerPlugin(app: FastifyInstance) {
  const exposeDocs = env.APP_ENV !== 'production' || process.env.EXPOSE_API_DOCS === 'true';
  if (!exposeDocs) {
    app.log.info('OpenAPI docs disabled (APP_ENV=production)');
    return;
  }

  const document = loadOpenApiDocument();

  await app.register(swagger, {
    mode: 'static',
    specification: {
      document: document as never,
    },
  });

  await app.register(swaggerUi, {
    routePrefix: `${env.API_PREFIX}/docs`,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  app.log.info({ path: `${env.API_PREFIX}/docs` }, 'OpenAPI docs registered');
}
