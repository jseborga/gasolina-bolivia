import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { VendorRequestInput } from "@/lib/types";

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VendorRequestInput;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const category = body.category?.trim();

    if (!name || !email || !category) {
      return NextResponse.json(
        { error: "Nombre, correo y tipo de solicitud son obligatorios." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("vendor_requests")
      .insert({
        business_name: normalizeText(body.business_name),
        category,
        city: normalizeText(body.city) ?? "La Paz",
        email,
        name,
        notes: normalizeText(body.notes),
        phone: normalizeText(body.phone),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.code === "23505"
              ? "Ya existe una solicitud pendiente con ese correo para esta categoria."
              : error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, request: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la solicitud.",
      },
      { status: 500 }
    );
  }
}
