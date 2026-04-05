import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_SESSION_COOKIE = 'surtimapa_admin_session';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type AdminSession = {
  email: string;
  exp: number;
  iat: number;
  userId: string;
};

type SessionIdentity = {
  email: string;
  userId: string;
};

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error('Falta la variable ADMIN_SESSION_SECRET para proteger el admin.');
  }

  return secret;
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false;

  const allowedEmails = getAdminEmails();
  if (allowedEmails.length === 0) return false;

  return allowedEmails.includes(email.trim().toLowerCase());
}

export function sanitizeAdminNextPath(next?: string | null) {
  if (!next || !next.startsWith('/admin')) {
    return '/admin/stations';
  }

  return next;
}

function encode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getAdminSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createAdminSessionToken(identity: SessionIdentity) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    email: identity.email.trim().toLowerCase(),
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS,
    iat: now,
    userId: identity.userId,
  };

  const encodedPayload = encode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminSession | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as Partial<AdminSession>;
    const now = Math.floor(Date.now() / 1000);

    if (
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number' ||
      typeof payload.userId !== 'string'
    ) {
      return null;
    }

    if (payload.exp <= now) {
      return null;
    }

    if (!isAllowedAdminEmail(payload.email)) {
      return null;
    }

    return {
      email: payload.email,
      exp: payload.exp,
      iat: payload.iat,
      userId: payload.userId,
    };
  } catch {
    return null;
  }
}

export async function getOptionalAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminSession(nextPath?: string) {
  const session = await getOptionalAdminSession();

  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(sanitizeAdminNextPath(nextPath))}`);
  }

  return session;
}

export function setAdminSessionCookie(
  response: NextResponse,
  identity: SessionIdentity
) {
  response.cookies.set({
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    name: ADMIN_SESSION_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: createAdminSessionToken(identity),
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: ADMIN_SESSION_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: '',
  });
}
