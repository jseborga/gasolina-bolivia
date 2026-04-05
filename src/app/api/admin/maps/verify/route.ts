import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { verifyStationLocation } from '@/lib/map-verify';

export async function POST(request: NextRequest) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesion en el admin.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const address = String(body.address ?? '').trim();
    const latitude =
      body.latitude === null || body.latitude === undefined || body.latitude === ''
        ? null
        : Number(body.latitude);
    const longitude =
      body.longitude === null || body.longitude === undefined || body.longitude === ''
        ? null
        : Number(body.longitude);

    const verification = await verifyStationLocation({
      address,
      latitude: Number.isFinite(latitude ?? Number.NaN) ? latitude : null,
      longitude: Number.isFinite(longitude ?? Number.NaN) ? longitude : null,
    });

    return NextResponse.json(verification);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo verificar la ubicacion.' },
      { status: 500 }
    );
  }
}
