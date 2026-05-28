const PBKDF2_ITERATIONS = 310_000;

export function buf2b64(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function b642buf(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportKeyBytes(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(raw));
}

export async function importKeyBytes(bytes) {
  return crypto.subtle.importKey(
    'raw', new Uint8Array(bytes),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(key, plaintext) {
  const iv  = randomBytes(12);
  const enc = new TextEncoder();
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { iv: buf2b64(iv), ct: buf2b64(ct) };
}

export async function decrypt(key, iv, ct) {
  const dec = new TextDecoder();
  const pt  = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642buf(iv) }, key, b642buf(ct),
  );
  return dec.decode(pt);
}
