import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { openDatabase } from './db.js';
import { hashPassword, passwordIsValid, saveAdminPassword } from './auth.js';

async function readPassword() {
  if (!process.stdin.isTTY) {
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk.toString();
      if (input.length > 1024) throw new Error('입력 데이터가 너무 큽니다.');
    }
    return input.replace(/\r?\n$/, '');
  }
  let muted = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    process.stdout.write('관리자 비밀번호 (12~128자, 입력 숨김): ');
    muted = true;
    const password = await rl.question('');
    process.stdout.write('\n비밀번호 다시 입력: ');
    const confirmation = await rl.question('');
    process.stdout.write('\n');
    if (password !== confirmation) throw new Error('비밀번호가 일치하지 않습니다.');
    return password;
  } finally { rl.close(); }
}

let db;
try {
  const password = await readPassword();
  if (!passwordIsValid(password)) throw new Error('비밀번호는 12자 이상, 128자 이하로 입력해 주세요.');
  const hash = await hashPassword(password);
  db = openDatabase();
  saveAdminPassword(db, hash);
  console.log('관리자 비밀번호를 저장하고 기존 로그인 세션을 만료했습니다.');
  if (process.env.ADMIN_PASSWORD) console.log('ADMIN_PASSWORD 환경변수가 설정되어 있어 서버에서는 그 비밀번호를 우선 사용합니다.');
} catch (error) {
  console.error('관리자 설정 실패:', error.message);
  process.exitCode = 1;
} finally { db?.close(); }
