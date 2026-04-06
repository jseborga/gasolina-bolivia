import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedAdminEmail,
  sanitizeAdminNextPath,
  setAdminSessionCookie,
} from '@/lib/admin-auth';
import { getRequestBaseUrl } from '@/lib/app-url';
import { getServerSupabase } from '@/lib/supabase-server';

function buildErrorRedirect(request: NextRequest, nextPath: string, message: string) {
  const url = new URL('/admin/login', getRequestBaseUrl(request));
  url.searchParams.set('error', message);
  url.searchParams.set('next', nextPath);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const nextPath = sanitizeAdminNextPath(String(formData.get('next') ?? ''));

  if (!email || !password) {
    return buildErrorRedirect(request, nextPath, 'Completa correo y contraseña.');
  }

  if (!isAllowedAdminEmail(email)) {
    return buildErrorRedirect(
      request,
      nextPath,
      'Este usuario no está habilitado en ADMIN_EMAILS.'
    );
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return buildErrorRedirect(request, nextPath, 'Credenciales inválidas.');
    }

    const sessionEmail = (data.user.email ?? email).toLowerCase();
    if (!isAllowedAdminEmail(sessionEmail)) {
      return buildErrorRedirect(
        request,
        nextPath,
        'El usuario autenticado no tiene acceso al admin.'
      );
    }

    const response = NextResponse.redirect(new URL(nextPath, getRequestBaseUrl(request)), 303);
    setAdminSessionCookie(response, {
      email: sessionEmail,
      userId: data.user.id,
    });

    return response;
  } catch (error) {
    return buildErrorRedirect(
      request,
      nextPath,
      error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
    );
  }
}
