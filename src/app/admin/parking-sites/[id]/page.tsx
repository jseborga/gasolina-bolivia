import { notFound } from "next/navigation";
import { ParkingSiteForm } from "@/components/admin/parking-site-form";
import { requireAdminSession } from "@/lib/admin-auth";
import type { AppProfileAdminRow, ParkingSiteAdminRow } from "@/lib/admin-parking-types";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function EditParkingSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession(`/admin/parking-sites/${id}`);

  const parkingSiteId = Number(id);
  if (!Number.isFinite(parkingSiteId)) {
    return notFound();
  }

  try {
    const supabase = getAdminSupabase();
    const [parkingSiteResult, profilesResult] = await Promise.all([
      supabase.from("parking_sites").select("*").eq("id", parkingSiteId).maybeSingle(),
      supabase
        .from("app_profiles")
        .select("id,full_name,role,is_active")
        .order("full_name", { ascending: true }),
    ]);

    if (isMissingTableError(parkingSiteResult.error, "parking_sites")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingParkingSitesMessage()}
        </div>
      );
    }

    if (parkingSiteResult.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar el parqueo: {parkingSiteResult.error.message}
        </div>
      );
    }

    if (!parkingSiteResult.data) {
      return notFound();
    }

    const warning = isMissingTableError(profilesResult.error, "app_profiles")
      ? getMissingAppProfilesMessage()
      : profilesResult.error?.message ?? null;
    const managerOptions = (profilesResult.data ??
      []) as Array<Pick<AppProfileAdminRow, "id" | "full_name" | "role" | "is_active">>;

    return (
      <div className="space-y-4">
        {warning ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {warning}
          </div>
        ) : null}

        <ParkingSiteForm
          initial={parkingSiteResult.data as ParkingSiteAdminRow}
          managerOptions={managerOptions}
          mode="edit"
          parkingSiteId={parkingSiteId}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar el parqueo: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
