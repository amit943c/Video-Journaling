import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SESSION_COOKIE = 'vj_session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET env var is required');
  return new TextEncoder().encode(secret);
}

export function getAdminEmail(): string {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error('ADMIN_EMAIL env var is required');
  return email;
}

export function validateCredentials(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD env vars are required');
  }
  return username === adminUser && password === adminPass;
}

export async function createSession(): Promise<string> {
  const email = getAdminEmail();
  const token = await new SignJWT({ role: 'admin', email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function verifyRequestSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export async function getSessionFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export async function getSessionEmail(request: NextRequest): Promise<string> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('Not authenticated');

  const { payload } = await jwtVerify(token, getSecret());
  const email = payload.email as string | undefined;
  if (!email) throw new Error('Session missing email');
  return email;
}

export async function getEmailFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('Not authenticated');

  const { payload } = await jwtVerify(token, getSecret());
  const email = payload.email as string | undefined;
  if (!email) throw new Error('Session missing email');
  return email;
}

export function buildSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION,
  };
}

export function buildLogoutCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}
