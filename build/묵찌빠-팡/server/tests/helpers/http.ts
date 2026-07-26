/**
 * Fastify inject / 라이브 서버 헬퍼.
 */
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

let sharedApp: FastifyInstance | null = null;
let listenPort: number | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!sharedApp) {
    sharedApp = await buildApp();
    await sharedApp.ready();
  }
  return sharedApp;
}

/** Socket.IO 가 필요하면 실제 listen */
export async function getListeningApp(): Promise<{ app: FastifyInstance; baseUrl: string }> {
  const app = await getApp();
  if (!listenPort) {
    await app.listen({ host: '127.0.0.1', port: 0 });
    const addr = app.server.address();
    if (!addr || typeof addr === 'string') throw new Error('failed to bind test server');
    listenPort = addr.port;
  }
  return { app, baseUrl: `http://127.0.0.1:${listenPort}` };
}

export async function closeApp() {
  if (sharedApp) {
    await sharedApp.close();
    sharedApp = null;
    listenPort = null;
  }
}

export async function api(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  opts?: { token?: string; body?: unknown; cookies?: string }
) {
  const app = await getApp();
  const headers: Record<string, string> = {};
  if (opts?.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts?.body !== undefined) headers['content-type'] = 'application/json';
  if (opts?.cookies) headers.cookie = opts.cookies;

  const res = await app.inject({
    method,
    url: url.startsWith('/api') ? url : `/api${url}`,
    headers,
    payload: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let json: any = null;
  try {
    json = res.json();
  } catch {
    json = null;
  }
  return { status: res.statusCode, json, headers: res.headers, cookies: res.cookies };
}

export async function signupAndLogin(input: {
  loginId: string;
  password: string;
  nickname: string;
}) {
  const signup = await api('POST', '/auth/signup', {
    body: {
      loginId: input.loginId,
      password: input.password,
      nickname: input.nickname,
      agreeTerms: true,
      agreePrivacy: true,
    },
  });
  if (signup.status >= 400 && signup.json?.error?.code !== 'CONFLICT') {
    // already exists → login
  }
  const login = await api('POST', '/auth/login', {
    body: { loginId: input.loginId, password: input.password },
  });
  if (!login.json?.success) {
    throw new Error(`login failed: ${JSON.stringify(login.json)}`);
  }
  return {
    accessToken: login.json.data.accessToken as string,
    user: login.json.data.user,
  };
}
