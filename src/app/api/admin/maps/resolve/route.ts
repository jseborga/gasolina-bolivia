import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { resolveMapsInput } from '@/lib/google-maps';

export async function POST(request: NextRequest) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión en el admin.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const input = String(body.input ?? '').trim();

    if (!input) {
      return NextResponse.json({ error: 'Pega una URL, dirección o coordenadas.' }, { status: 400 });
    }

    const parsed = await resolveMapsInput(input);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo analizar la ubicación.' },
      { status: 500 }
    );
  }
}
