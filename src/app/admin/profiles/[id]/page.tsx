import { notFound } from "next/navigation";
import { ParkingProfileForm } from "@/components/admin/parking-profile-form";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAppBaseUrl } from "@/lib/app-url";
import type { AppProfileAdminRow } from "@/lib/admin-parking-types";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdminSession(`/admin/profiles/${id}`);

  const profileId = Number(id);
  if (!Number.isFinite(profileId)) {
    return notFound();
  }

  try {
    const supabase = getAdminSupabase();
    const [profileResult, parkingSitesResult] = await Promise.all([
      supabase.from("app_profiles").select("*").eq("id", profileId).maybeSingle(),
      supabase
        .from("parking_sites")
        .select("id,code,name")
        .eq("manager_profile_id", profileId)
        .order("name", { ascending: true }),
    ]);

    if (isMissingTableError(profileResult.error, "app_profiles")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingAppProfilesMessage()}
        </div>
      );
    }

    if (profileResult.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar el perfil: {profileResult.error.message}
        </div>
      );
    }

    if (!profileResult.data) {
      return notFound();
    }

    const warning = isMissingTableError(parkingSitesResult.error, "parking_sites")
      ? getMissingParkingSitesMessage()
      : parkingSitesResult.error?.message ?? null;
    const assignedParkings = (parkingSitesResult.data ??
      []) as Array<{ id: number; code: string; name: string }>;

    return (
      <div className="space-y-4">
        {query.created === "1" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Perfil creado. Ya puedes copiar o abrir el enlace privado de gestion.
          </div>
        ) : null}

        {warning ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {warning}
          </div>
        ) : null}

        <ParkingProfileForm
          assignedParkings={assignedParkings}
          initial={profileResult.data as AppProfileAdminRow}
          mode="edit"
          portalBaseUrl={getAppBaseUrl()}
          profileId={profileId}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar el perfil: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
