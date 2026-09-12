const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmac(value: string): Promise<string> {
  const secret = Netlify.env.get('PARENT_SESSION_SECRET');
  if (!secret) throw new Error('PARENT_SESSION_SECRET is not configured');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSession(): Promise<string> {
  const payload = `${Date.now() + 24 * 60 * 60 * 1000}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function validSession(request: Request): Promise<boolean> {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)aylan_parent_session=([^;]+)/);
  if (!match) return false;
  const [expires, signature] = match[1].split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = await hmac(expires);
  const a = base64UrlToBytes(signature);
  const b = base64UrlToBytes(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function sessionCookie(value: string): string {
  return `aylan_parent_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
}

export const clearSessionCookie = 'aylan_parent_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
