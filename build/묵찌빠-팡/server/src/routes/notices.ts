import type { FastifyInstance } from 'fastify';
import { listActiveNotices } from '../modules/admin/notices.js';

/** 공개 공지 피드 — 로그인 없이도 티커에 노출 */
export async function noticeRoutes(app: FastifyInstance) {
  app.get('/notices', async () => ({ success: true, data: await listActiveNotices() }));
}
