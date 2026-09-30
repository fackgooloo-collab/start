import { createApp } from './app.js';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535 사이 숫자로 설정해 주세요.');
const app = await createApp();
const server = app.listen(port, host, () => console.log(`찌릿찌릿 API: http://${host}:${port}`));
server.on('error', (error) => { console.error('서버를 시작하지 못했습니다:', error.message); app.locals.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => { app.locals.close(); process.exit(0); }));
