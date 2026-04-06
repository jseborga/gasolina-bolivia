import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/admin-auth';
import { getRequestBaseUrl } from '@/lib/app-url';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin/login', getRequestBaseUrl(request)), 303);
  clearAdminSessionCookie(response);
  return response;
}
