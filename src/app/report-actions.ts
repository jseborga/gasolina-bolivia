"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";

export async function submitReport(formData: FormData) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Faltan variables de entorno de Supabase.",
    };
  }

  const station_id = Number(formData.get("station_id"));
  const fuel_type = String(formData.get("fuel_type") ?? "");
  const availability_status = String(formData.get("availability_status") ?? "");
  const queue_status = String(formData.get("queue_status") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  const { error } = await supabase.from("reports").insert({
    station_id,
    fuel_type,
    availability_status,
    queue_status,
    comment: comment.length > 0 ? comment : null,
  });

  if (error) {
    return {
      ok: false,
      message: `No se pudo guardar el reporte: ${error.message}`,
    };
  }

  revalidatePath("/");

  return {
    ok: true,
    message: "Reporte guardado correctamente.",
  };
}
