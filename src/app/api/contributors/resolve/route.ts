import { NextResponse } from "next/server";
import { resolveContributorProfileByToken } from "@/lib/contributor-rewards";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const profile = await resolveContributorProfileByToken(body.token ?? null);

    if (!profile) {
      return NextResponse.json({ error: "Token de colaborador invalido." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        credit_balance: profile.credit_balance ?? 0,
        full_name: profile.full_name,
        id: profile.id,
        reliability_score: profile.reliability_score ?? 0,
        role: profile.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo validar el token." },
      { status: 500 }
    );
  }
}
