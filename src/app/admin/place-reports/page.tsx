import { requireAdminSession } from "@/lib/admin-auth";
import PlaceReportReviewTable from "@/components/admin/place-report-review-table";
import {
  getMissingContributionModerationMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfile, CommunityContribution, PlaceReport } from "@/lib/types";

export const dynamic = "force-dynamic";

const reasonLabels: Record<string, string> = {
  not_exists: "No existe",
  wrong_location: "Ubicacion incorrecta",
  duplicate: "Duplicado",
  closed: "Cerrado",
  other: "Otro",
};

export default async function AdminPlaceReportsPage() {
  await requireAdminSession("/admin/place-reports");

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("place_reports")
      .select(
        "id,target_type,target_id,target_name,reason,notes,status,review_notes,reviewed_at,reviewed_by_email,visitor_id,ip_address,latitude_bucket,longitude_bucket,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (isMissingTableError(error, "place_reports")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Falta la tabla <code>place_reports</code>. Ejecuta la migracion
          <code> supabase/008_place_reports.sql</code>.
        </div>
      );
    }

    if (
      isMissingColumnError(error, "place_reports", [
        "status",
        "review_notes",
        "reviewed_at",
        "reviewed_by_email",
      ])
    ) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {getMissingContributionModerationMessage()}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar denuncias: {error.message}
        </div>
      );
    }

    const reports = (data ?? []) as PlaceReport[];
    const { data: contributionsData, error: contributionsError } = await supabase
      .from("community_contributions")
      .select("id,source_id,app_profile_id,status,points_suggested,risk_flags")
      .eq("source_type", "place_report");
    const contributionRows =
      !contributionsError && contributionsData
        ? ((contributionsData ?? []) as CommunityContribution[])
        : [];
    const profileIds = Array.from(
      new Set(
        contributionRows
          .map((item) => item.app_profile_id)
          .filter((value): value is number => typeof value === "number")
      )
    );
    const { data: profilesData } =
      profileIds.length > 0
        ? await supabase
            .from("app_profiles")
            .select("id,full_name,role,credit_balance")
            .in("id", profileIds)
        : { data: [] };
    const profiles = new Map<number, AppProfile>(
      ((profilesData ?? []) as AppProfile[]).map((profile) => [profile.id, profile])
    );
    const contributionByReportId = new Map<number, CommunityContribution>(
      contributionRows.map((item) => [
        item.source_id,
        {
          ...item,
          risk_flags: Array.isArray(item.risk_flags)
            ? item.risk_flags.filter((flag): flag is string => typeof flag === "string")
            : [],
        },
      ])
    );
    const stationCount = reports.filter((item) => item.target_type === "station").length;
    const serviceCount = reports.filter((item) => item.target_type === "service").length;
    const pendingCount = reports.filter((item) => item.status === "pending").length;
    const approvedCount = reports.filter((item) => item.status === "approved").length;
    const rejectedCount = reports.filter((item) => item.status === "rejected").length;
    const rows = reports.map((item) => {
      const contribution = contributionByReportId.get(item.id);
      const contributor =
        contribution?.app_profile_id != null
          ? profiles.get(contribution.app_profile_id)
          : null;

      return {
        contributionId: contribution?.id ?? null,
        contributorCredits: contributor?.credit_balance ?? null,
        contributorName: contributor?.full_name ?? null,
        contributorRole: contributor?.role ?? null,
        createdAt: item.created_at,
        id: item.id,
        ipAddress: item.ip_address,
        notes: item.notes,
        pointsSuggested: contribution?.points_suggested ?? null,
        reasonLabel: reasonLabels[item.reason] || item.reason,
        reviewNotes: item.review_notes ?? null,
        reviewedAt: item.reviewed_at ?? null,
        reviewedByEmail: item.reviewed_by_email ?? null,
        riskFlags: contribution?.risk_flags ?? [],
        status: item.status,
        targetId: item.target_id,
        targetLabel: item.target_name || `ID ${item.target_id}`,
        targetTypeLabel: item.target_type === "station" ? "EESS" : "Servicio",
        visitorId: item.visitor_id,
      };
    });

    return (
      <div className="space-y-6">
        {contributionsError && !isMissingTableError(contributionsError, "community_contributions") ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No se pudo leer la tabla de contribuciones: {contributionsError.message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Denuncias</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{reports.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">EESS</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stationCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Servicios</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{serviceCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Aprobadas / rechazadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {approvedCount} / {rejectedCount}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Ultimas denuncias</h2>
            <p className="text-sm text-slate-500">
              Valida o rechaza denuncias, deja notas internas y, si corresponde, acredita
              puntos al registrador vinculado.
            </p>
          </div>

          <div className="p-5">
            <PlaceReportReviewTable rows={rows} />
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar denuncias: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
