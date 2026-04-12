import { notFound } from "next/navigation";
import { ParkingManagerPanel } from "@/components/parking-manager-panel";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfile, ParkingSite } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ParkingManagerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const supabase = getAdminSupabase();
    const profileResult = await supabase
      .from("app_profiles")
      .select("*")
      .eq("manager_access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (isMissingTableError(profileResult.error, "app_profiles")) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            {getMissingAppProfilesMessage()}
          </div>
        </main>
      );
    }

    if (profileResult.error || !profileResult.data) {
      return notFound();
    }

    const profile = profileResult.data as AppProfile;
    const parkingSitesResult = await supabase
      .from("parking_sites")
      .select("*")
      .eq("manager_profile_id", profile.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (isMissingTableError(parkingSitesResult.error, "parking_sites")) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            {getMissingParkingSitesMessage()}
          </div>
        </main>
      );
    }

    if (parkingSitesResult.error) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            Error al cargar parqueos: {parkingSitesResult.error.message}
          </div>
        </main>
      );
    }

    const sites = (parkingSitesResult.data ?? []) as ParkingSite[];
    if (sites.length === 0) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Portal sin parqueos asignados</h1>
            <p className="mt-3 text-sm text-slate-600">
              El perfil existe, pero todavia no tiene parqueos activos asignados. Pide al admin
              vincular al menos un parqueo para usar este portal.
            </p>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <ParkingManagerPanel appBaseUrl={getAppBaseUrl()} profile={profile} sites={sites} />
      </main>
    );
  } catch (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Error al abrir el portal: {error instanceof Error ? error.message : "Error inesperado"}
        </div>
      </main>
    );
  }
}
