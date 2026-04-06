import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
import { getAppBaseUrl } from "@/lib/app-url";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import {
  getMissingSupportServicesMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase-server";
import {
  SUPPORT_SERVICE_BASE_SELECT,
  SUPPORT_SERVICE_OPTIONAL_COLUMNS,
  SUPPORT_SERVICE_SELECT,
  withSupportServiceDefaults,
} from "@/lib/support-services-compat";
import { Report, Station, StationWithLatest, SupportService, TrafficIncident } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa de gasolina, talleres, gruas y aditivos en Bolivia",
  description:
    "Ubica surtidores activos, reporta estado de gasolina y encuentra talleres, gruas, auxilio mecanico y aditivos cerca de tu ubicacion.",
};

export default async function HomePage() {
  const adminSession = await getOptionalAdminSession();

  try {
    const supabase = adminSession ? getAdminSupabase() : getServerSupabase();
    const stationsQuery = supabase.from("stations").select("*").order("name");
    const reportsQuery = supabase.from("reports").select("*").order("created_at", {
      ascending: false,
    });

    if (!adminSession) {
      stationsQuery.eq("is_active", true);
    }

    const [{ data: stationsData, error: stationsError }, { data: reportsData, error: reportsError }] =
      await Promise.all([stationsQuery, reportsQuery]);

    const incidentsQuery = supabase
      .from("traffic_incidents")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(150);

    const initialServicesQuery = supabase
      .from("support_services")
      .select(SUPPORT_SERVICE_SELECT)
      .order("category")
      .order("name");

    if (!adminSession) {
      initialServicesQuery.eq("is_active", true).eq("is_published", true);
    }

    const [initialServicesResult, incidentsResult] = await Promise.all([
      initialServicesQuery,
      incidentsQuery,
    ]);
    let servicesData: SupportService[] = [];
    let servicesError = initialServicesResult.error;
    let incidentsData: TrafficIncident[] = [];
    let incidentsError = incidentsResult.error;

    if (!servicesError && initialServicesResult.data) {
      servicesData = initialServicesResult.data as unknown as SupportService[];
    }

    if (!incidentsError && incidentsResult.data) {
      incidentsData = incidentsResult.data as TrafficIncident[];
    }

    if (isMissingColumnError(servicesError, "support_services", SUPPORT_SERVICE_OPTIONAL_COLUMNS)) {
      const legacyQuery = supabase
        .from("support_services")
        .select(SUPPORT_SERVICE_BASE_SELECT)
        .order("category")
        .order("name");

      if (!adminSession) {
        legacyQuery.eq("is_active", true);
      }

      const legacyResult = await legacyQuery;

      servicesData = (legacyResult.data ?? []).map((service) =>
        withSupportServiceDefaults(service as Partial<SupportService>)
      );
      servicesError = legacyResult.error;
    }

    const servicesTableMissing = isMissingTableError(servicesError, "support_services");
    const incidentsTableMissing = isMissingTableError(incidentsError, "traffic_incidents");

    if (
      stationsError ||
      reportsError ||
      (servicesError && !servicesTableMissing) ||
      (incidentsError && !incidentsTableMissing)
    ) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            Error al leer Supabase.{" "}
            {stationsError?.message ||
              reportsError?.message ||
              servicesError?.message ||
              incidentsError?.message}
          </div>
        </main>
      );
    }

    const stations = (stationsData ?? []) as Station[];
    const reports = (reportsData ?? []) as Report[];
    const services = (servicesTableMissing ? [] : servicesData ?? []) as SupportService[];
    const incidents = (incidentsTableMissing ? [] : incidentsData ?? []) as TrafficIncident[];

    const latestByStation = new Map<number, Report>();
    for (const report of reports) {
      if (!latestByStation.has(report.station_id)) latestByStation.set(report.station_id, report);
    }

    const stationsWithLatest: StationWithLatest[] = stations.map((station) => ({
      ...station,
      latestReport: latestByStation.get(station.id) ?? null,
    }));

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      description:
        "Mapa colaborativo para encontrar gasolina, estaciones de servicio, talleres, gruas y aditivos en Bolivia.",
      inLanguage: "es-BO",
      name: "SurtiMapa Bolivia",
      potentialAction: {
        "@type": "SearchAction",
        query: "required name=search_term_string",
        target: `${getAppBaseUrl()}/?q={search_term_string}`,
      },
      url: getAppBaseUrl(),
    };

    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {servicesTableMissing ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {getMissingSupportServicesMessage()}
          </div>
        ) : null}
        {incidentsTableMissing ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Falta la tabla <code>traffic_incidents</code>. Ejecuta la migracion
            <code> supabase/009_traffic_incidents.sql</code>.
          </div>
        ) : null}

        <Dashboard
          adminSession={adminSession ? { email: adminSession.email } : null}
          initialTrafficIncidents={incidents}
          initialStations={stationsWithLatest}
          initialServices={services}
          reportCount={reports.length}
        />
      </main>
    );
  } catch (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Error al leer Supabase. {error instanceof Error ? error.message : "Error inesperado"}
        </div>
      </main>
    );
  }
}
