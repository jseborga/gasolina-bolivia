import { requireAdminSession } from "@/lib/admin-auth";
import ContributionReviewTable from "@/components/admin/contribution-review-table";
import {
  getMissingAppProfilesMessage,
  getMissingContributionModerationMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfile, CommunityContribution } from "@/lib/types";

export const dynamic = "force-dynamic";

const sourceLabels: Record<string, string> = {
  fuel_report: "Reporte de combustible",
  parking_update: "Actualizacion de parqueo",
  place_report: "Denuncia de lugar",
  traffic_incident: "Incidente vial",
};

function formatContributionSummary(item: CommunityContribution) {
  const metadata = item.metadata ?? {};

  switch (item.source_type) {
    case "fuel_report":
      return [
        metadata.fuel_type,
        metadata.availability_status,
        metadata.queue_status,
      ]
        .filter(Boolean)
        .join(" | ");
    case "traffic_incident":
      return [metadata.incident_type, metadata.radius_meters && `${metadata.radius_meters} m`]
        .filter(Boolean)
        .join(" | ");
    case "parking_update":
      return [
        metadata.status,
        metadata.available_spots != null ? `${metadata.available_spots} libres` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    case "place_report":
      return [metadata.target_type, metadata.target_name, metadata.reason]
        .filter(Boolean)
        .join(" | ");
    default:
      return "-";
  }
}

export default async function AdminContributionsPage() {
  await requireAdminSession("/admin/contributions");

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("community_contributions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (isMissingTableError(error, "community_contributions")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingContributionModerationMessage()}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar contribuciones: {error.message}
        </div>
      );
    }

    const contributions = ((data ?? []) as CommunityContribution[]).map((item) => ({
      ...item,
      risk_flags: Array.isArray(item.risk_flags)
        ? item.risk_flags.filter((flag): flag is string => typeof flag === "string")
        : [],
    }));
    const profileIds = Array.from(
      new Set(
        contributions
          .map((item) => item.app_profile_id)
          .filter((value): value is number => typeof value === "number")
      )
    );
    const { data: profilesData, error: profilesError } =
      profileIds.length > 0
        ? await supabase
            .from("app_profiles")
            .select("id,full_name,role,credit_balance")
            .in("id", profileIds)
        : { data: [], error: null };

    if (isMissingTableError(profilesError, "app_profiles")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingAppProfilesMessage()}
        </div>
      );
    }

    if (profilesError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar perfiles: {profilesError.message}
        </div>
      );
    }

    const profiles = new Map<number, AppProfile>(
      ((profilesData ?? []) as AppProfile[]).map((profile) => [profile.id, profile])
    );
    const pendingCount = contributions.filter((item) => item.status === "pending").length;
    const flaggedCount = contributions.filter((item) => item.status === "auto_flagged").length;
    const approvedCount = contributions.filter((item) => item.status === "approved").length;
    const awardedPoints = contributions.reduce((sum, item) => sum + (item.points_awarded ?? 0), 0);
    const rows = contributions.map((item) => {
      const contributor =
        item.app_profile_id != null ? profiles.get(item.app_profile_id) ?? null : null;

      return {
        contributorCredits: contributor?.credit_balance ?? null,
        contributorName: contributor?.full_name ?? null,
        contributorRole: contributor?.role ?? null,
        createdAt: item.created_at,
        id: item.id,
        ipAddress: item.ip_address,
        pointsAwarded: item.points_awarded ?? 0,
        pointsSuggested: item.points_suggested ?? 0,
        reviewNotes: item.review_notes ?? null,
        reviewedAt: item.reviewed_at ?? null,
        reviewedByEmail: item.reviewer_email ?? null,
        riskFlags: item.risk_flags ?? [],
        sourceId: item.source_id,
        sourceLabel: sourceLabels[item.source_type] || item.source_type,
        status: item.status,
        summary: formatContributionSummary(item),
        visitorId: item.visitor_id,
      };
    });

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Auto-flagged</p>
            <p className="mt-2 text-3xl font-semibold text-rose-700">{flaggedCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Aprobadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{approvedCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Puntos acreditados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{awardedPoints}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h1 className="text-lg font-semibold text-slate-900">Contribuciones de registradores</h1>
            <p className="text-sm text-slate-500">
              Revisa aportes de combustible, incidentes, parqueos y denuncias antes de acreditar
              creditos que luego podran liquidarse por lotes con QR.
            </p>
          </div>
          <div className="p-5">
            <ContributionReviewTable rows={rows} />
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar contribuciones: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
