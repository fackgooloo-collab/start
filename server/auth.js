import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const passwordIsValid = (password) => typeof password === 'string' && password.length >= 12 && password.length <= 128;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [scheme, salt, saved] = encoded.split(':');
  if (scheme !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(saved || '')) return false;
  const hash = await scrypt(password, salt, 64);
  return timingSafeEqual(hash, Buffer.from(saved, 'hex'));
}

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

export function saveAdminPassword(db, hash) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO admin (id,password_hash) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash').run(hash);
    db.prepare('DELETE FROM sessions').run();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
