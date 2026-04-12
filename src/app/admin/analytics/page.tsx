import { AdminAnalyticsMap } from "@/components/admin/admin-analytics-map";
import { requireAdminSession } from "@/lib/admin-auth";
import { getTrafficIncidentLabel, getTrafficIncidentRadiusLabel } from "@/lib/traffic-incidents";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

type StationAnalyticsRow = {
  city: string | null;
  id: number;
  is_active: boolean;
  is_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  name: string;
  zone: string | null;
};

type ReportAnalyticsRow = {
  availability_status: "no_hay" | "si_hay" | "sin_dato";
  created_at: string;
  fuel_type: "diesel" | "especial" | "premium";
  queue_status: "corta" | "larga" | "media" | "sin_dato";
  station_id: number;
};

type PlaceReportAnalyticsRow = {
  created_at: string;
  id: number;
  ip_address: string | null;
  latitude_bucket: number | null;
  longitude_bucket: number | null;
  reason: string;
  target_id: number;
  target_name: string | null;
  target_type: "service" | "station";
  visitor_id: string | null;
};

type StationReviewAnalyticsRow = {
  comment: string | null;
  created_at: string;
  id: number;
  ip_address: string | null;
  latitude_bucket: number | null;
  longitude_bucket: number | null;
  score: number;
  station_id: number;
  visitor_id: string | null;
};

type ServiceReviewAnalyticsRow = {
  comment: string | null;
  created_at: string;
  id: number;
  ip_address: string | null;
  latitude_bucket: number | null;
  longitude_bucket: number | null;
  score: number;
  service_id: number;
  visitor_id: string | null;
};

type TrafficIncidentAnalyticsRow = {
  confirmation_count: number;
  created_at: string;
  description: string | null;
  id: number;
  incident_type: string;
  ip_address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  rejection_count: number;
  status: string;
  visitor_id: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getAvailabilityLabel(value: ReportAnalyticsRow["availability_status"] | null) {
  switch (value) {
    case "si_hay":
      return "Disponible";
    case "no_hay":
      return "Sin combustible";
    case "sin_dato":
    default:
      return "Sin dato";
  }
}

function getAvailabilityClass(value: ReportAnalyticsRow["availability_status"] | null) {
  switch (value) {
    case "si_hay":
      return "bg-emerald-100 text-emerald-700";
    case "no_hay":
      return "bg-rose-100 text-rose-700";
    case "sin_dato":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getQueueLabel(value: ReportAnalyticsRow["queue_status"] | null) {
  switch (value) {
    case "corta":
      return "Fila corta";
    case "media":
      return "Fila media";
    case "larga":
      return "Fila larga";
    case "sin_dato":
    default:
      return "Fila sin dato";
  }
}

type RecentIpRow = {
  count: number;
  eventType: string;
  ipAddress: string;
  lastSeenAt: string;
  path: string | null;
  targetName: string | null;
  targetType: string;
};

export default async function AdminAnalyticsPage() {
  await requireAdminSession("/admin/analytics");

  try {
    const supabase = getAdminSupabase();
    const [
      appEventsResult,
      appEventsCountResult,
      stationsResult,
      reportsResult,
      reportsCountResult,
      activeIncidentsCountResult,
      incidentsResult,
      placeReportsResult,
      stationReviewsResult,
      serviceReviewsResult,
    ] = await Promise.all([
      supabase.from("app_events").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("app_events").select("*", { count: "exact", head: true }),
      supabase
        .from("stations")
        .select("id,name,zone,city,latitude,longitude,is_active,is_verified")
        .order("name", { ascending: true }),
      supabase
        .from("reports")
        .select("station_id,fuel_type,availability_status,queue_status,created_at")
        .order("created_at", { ascending: false })
        .limit(2500),
      supabase.from("reports").select("*", { count: "exact", head: true }),
      supabase
        .from("traffic_incidents")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("traffic_incidents")
        .select(
          "id,incident_type,description,latitude,longitude,radius_meters,confirmation_count,rejection_count,status,created_at,visitor_id,ip_address"
        )
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("place_reports")
        .select(
          "id,target_type,target_id,target_name,reason,visitor_id,ip_address,latitude_bucket,longitude_bucket,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(160),
      supabase
        .from("station_reviews")
        .select(
          "id,station_id,score,comment,visitor_id,ip_address,latitude_bucket,longitude_bucket,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(160),
      supabase
        .from("support_service_reviews")
        .select(
          "id,service_id,score,comment,visitor_id,ip_address,latitude_bucket,longitude_bucket,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(160),
    ]);

    if (stationsResult.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar estaciones: {stationsResult.error.message}
        </div>
      );
    }

    if (reportsResult.error || reportsCountResult.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar reportes de combustible:{" "}
          {reportsResult.error?.message || reportsCountResult.error?.message}
        </div>
      );
    }

    const warnings: string[] = [];
    if (isMissingTableError(appEventsResult.error, "app_events")) {
      warnings.push(
        "Falta la tabla app_events. Ejecuta la migracion supabase/005_publish_analytics_vendor_requests.sql."
      );
    } else if (appEventsResult.error) {
      warnings.push(`No se pudo leer app_events: ${appEventsResult.error.message}`);
    }

    if (isMissingTableError(incidentsResult.error, "traffic_incidents")) {
      warnings.push(
        "Falta la tabla traffic_incidents. Ejecuta la migracion supabase/009_traffic_incidents.sql."
      );
    } else if (incidentsResult.error) {
      warnings.push(`No se pudieron leer incidentes: ${incidentsResult.error.message}`);
    }

    if (isMissingTableError(placeReportsResult.error, "place_reports")) {
      warnings.push(
        "Falta la tabla place_reports. Ejecuta la migracion supabase/008_place_reports.sql."
      );
    } else if (placeReportsResult.error) {
      warnings.push(`No se pudieron leer denuncias: ${placeReportsResult.error.message}`);
    }

    if (isMissingTableError(stationReviewsResult.error, "station_reviews")) {
      warnings.push(
        "Falta la tabla station_reviews. Ejecuta la migracion supabase/007_station_reviews.sql."
      );
    } else if (stationReviewsResult.error) {
      warnings.push(`No se pudieron leer reviews de estaciones: ${stationReviewsResult.error.message}`);
    }

    if (isMissingTableError(serviceReviewsResult.error, "support_service_reviews")) {
      warnings.push(
        "Falta la tabla support_service_reviews. Ejecuta la migracion supabase/006_support_service_reviews.sql."
      );
    } else if (serviceReviewsResult.error) {
      warnings.push(`No se pudieron leer reviews de servicios: ${serviceReviewsResult.error.message}`);
    }

    const events = (isMissingTableError(appEventsResult.error, "app_events")
      ? []
      : appEventsResult.data ?? []) as AppEvent[];
    const stations = (stationsResult.data ?? []) as StationAnalyticsRow[];
    const reports = (reportsResult.data ?? []) as ReportAnalyticsRow[];
    const incidents = (isMissingTableError(incidentsResult.error, "traffic_incidents")
      ? []
      : incidentsResult.data ?? []) as TrafficIncidentAnalyticsRow[];
    const placeReports = (isMissingTableError(placeReportsResult.error, "place_reports")
      ? []
      : placeReportsResult.data ?? []) as PlaceReportAnalyticsRow[];
    const stationReviews = (isMissingTableError(stationReviewsResult.error, "station_reviews")
      ? []
      : stationReviewsResult.data ?? []) as StationReviewAnalyticsRow[];
    const serviceReviews = (isMissingTableError(serviceReviewsResult.error, "support_service_reviews")
      ? []
      : serviceReviewsResult.data ?? []) as ServiceReviewAnalyticsRow[];

    const totalEvents =
      isMissingTableError(appEventsCountResult.error, "app_events") || appEventsCountResult.error
        ? events.length
        : appEventsCountResult.count ?? events.length;
    const totalReports = reportsCountResult.count ?? reports.length;
    const activeIncidents =
      isMissingTableError(activeIncidentsCountResult.error, "traffic_incidents") ||
      activeIncidentsCountResult.error
        ? incidents.filter((item) => item.status === "active").length
        : activeIncidentsCountResult.count ?? 0;

    const stationMap = new Map(stations.map((station) => [station.id, station]));
    const latestReportByStation = new Map<number, ReportAnalyticsRow>();
    const reportCountByStation = new Map<number, number>();

    for (const report of reports) {
      if (!latestReportByStation.has(report.station_id)) {
        latestReportByStation.set(report.station_id, report);
      }
      reportCountByStation.set(
        report.station_id,
        (reportCountByStation.get(report.station_id) ?? 0) + 1
      );
    }

    const reportWindowStart = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentReports = reports.filter((report) => {
      const timestamp = new Date(report.created_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= reportWindowStart;
    });
    const heatmapReports = recentReports.length > 0 ? recentReports : reports;
    const heatCountByStation = new Map<number, number>();

    for (const report of heatmapReports) {
      heatCountByStation.set(report.station_id, (heatCountByStation.get(report.station_id) ?? 0) + 1);
    }

    const stationPoints = stations
      .filter(
        (station) => typeof station.latitude === "number" && typeof station.longitude === "number"
      )
      .map((station) => {
        const latest = latestReportByStation.get(station.id) ?? null;
        return {
          availabilityStatus: latest?.availability_status ?? null,
          fuelType: latest?.fuel_type ?? null,
          id: station.id,
          isActive: station.is_active,
          isVerified: station.is_verified,
          label: station.name,
          latitude: station.latitude as number,
          longitude: station.longitude as number,
          queueStatus: latest?.queue_status ?? null,
          reportCount: reportCountByStation.get(station.id) ?? 0,
          updatedAt: latest?.created_at ?? null,
          zone: station.zone || station.city || "Sin zona",
        };
      });

    const heatPoints = stationPoints
      .filter((station) => (heatCountByStation.get(station.id) ?? 0) > 0)
      .map((station) => ({
        id: `heat-${station.id}`,
        intensity: heatCountByStation.get(station.id) ?? 0,
        label: station.label,
        latitude: station.latitude,
        latestAt: station.updatedAt,
        longitude: station.longitude,
        reportCount: heatCountByStation.get(station.id) ?? 0,
      }))
      .sort((left, right) => right.reportCount - left.reportCount);

    const incidentPoints = incidents
      .filter(
        (incident) =>
          typeof incident.latitude === "number" && typeof incident.longitude === "number"
      )
      .map((incident) => ({
        confirmationCount: incident.confirmation_count,
        createdAt: incident.created_at,
        description: incident.description,
        id: incident.id,
        incidentType: incident.incident_type,
        latitude: incident.latitude,
        longitude: incident.longitude,
        radiusMeters: incident.radius_meters,
        rejectionCount: incident.rejection_count,
        status: incident.status,
      }));

    const activityPoints = [
      ...placeReports
        .filter(
          (item) =>
            typeof item.latitude_bucket === "number" &&
            typeof item.longitude_bucket === "number"
        )
        .map((item) => ({
          createdAt: item.created_at,
          id: `place-report-${item.id}`,
          ipAddress: item.ip_address,
          latitude: item.latitude_bucket as number,
          longitude: item.longitude_bucket as number,
          source: "place_report" as const,
          subtitle: `${item.target_type} | motivo: ${item.reason}`,
          title: item.target_name || `${item.target_type} #${item.target_id}`,
          visitorId: item.visitor_id,
        })),
      ...stationReviews
        .filter(
          (item) =>
            typeof item.latitude_bucket === "number" &&
            typeof item.longitude_bucket === "number"
        )
        .map((item) => ({
          createdAt: item.created_at,
          id: `station-review-${item.id}`,
          ipAddress: item.ip_address,
          latitude: item.latitude_bucket as number,
          longitude: item.longitude_bucket as number,
          source: "station_review" as const,
          subtitle: `Score ${item.score}/5`,
          title: stationMap.get(item.station_id)?.name || `Estacion #${item.station_id}`,
          visitorId: item.visitor_id,
        })),
      ...serviceReviews
        .filter(
          (item) =>
            typeof item.latitude_bucket === "number" &&
            typeof item.longitude_bucket === "number"
        )
        .map((item) => ({
          createdAt: item.created_at,
          id: `service-review-${item.id}`,
          ipAddress: item.ip_address,
          latitude: item.latitude_bucket as number,
          longitude: item.longitude_bucket as number,
          source: "service_review" as const,
          subtitle: `Score ${item.score}/5`,
          title: `Servicio #${item.service_id}`,
          visitorId: item.visitor_id,
        })),
      ...incidents.map((incident) => ({
        createdAt: incident.created_at,
        id: `traffic-incident-${incident.id}`,
        ipAddress: incident.ip_address,
        latitude: incident.latitude,
        longitude: incident.longitude,
        source: "traffic_incident" as const,
        subtitle: getTrafficIncidentLabel(incident.incident_type as never),
        title: incident.description || `Incidente #${incident.id}`,
        visitorId: incident.visitor_id,
      })),
    ]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
      .slice(0, 160);

    const uniqueIps = new Set(
      [...events.map((item) => item.ip_address), ...activityPoints.map((item) => item.ipAddress)].filter(
        Boolean
      )
    ).size;
    const uniqueVisitors = new Set(
      [...events.map((item) => item.visitor_id), ...activityPoints.map((item) => item.visitorId)].filter(
        Boolean
      )
    ).size;

    const recentIpMap = new Map<string, RecentIpRow>();
    for (const event of events) {
      if (!event.ip_address) continue;

      const current = recentIpMap.get(event.ip_address);
      if (!current) {
        recentIpMap.set(event.ip_address, {
          count: 1,
          eventType: event.event_type,
          ipAddress: event.ip_address,
          lastSeenAt: event.created_at,
          path: event.path,
          targetName: event.target_name,
          targetType: event.target_type,
        });
        continue;
      }

      current.count += 1;
      if (new Date(event.created_at).getTime() > new Date(current.lastSeenAt).getTime()) {
        current.eventType = event.event_type;
        current.lastSeenAt = event.created_at;
        current.path = event.path;
        current.targetName = event.target_name;
        current.targetType = event.target_type;
      }
    }

    const recentIps = Array.from(recentIpMap.values())
      .sort(
        (left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime()
      )
      .slice(0, 18);

    const eventTypeCounts = events.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.event_type] = (accumulator[item.event_type] ?? 0) + 1;
      return accumulator;
    }, {});
    const topEvents = Object.entries(eventTypeCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);

    const topStations = [...stationPoints]
      .filter((station) => station.reportCount > 0)
      .sort((left, right) => right.reportCount - left.reportCount)
      .slice(0, 10);

    const recentIncidents = incidents.slice(0, 10);

    return (
      <div className="space-y-6">
        {warnings.map((warning) => (
          <div
            key={warning}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {warning}
          </div>
        ))}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Eventos totales</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalEvents}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Reportes combustibles</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalReports}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Incidentes activos</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{activeIncidents}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Nodos observados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{activityPoints.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">IPs unicas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{uniqueIps}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Visitantes unicos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{uniqueVisitors}</p>
          </div>
        </section>

        <AdminAnalyticsMap
          activityPoints={activityPoints}
          heatPoints={heatPoints}
          incidentPoints={incidentPoints}
          stationPoints={stationPoints}
        />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Top eventos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Basado en los ultimos eventos guardados en <code>app_events</code>.
            </p>
            <div className="mt-4 space-y-3">
              {topEvents.map(([eventType, count]) => (
                <div
                  key={eventType}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <span className="text-slate-700">{eventType}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
              {topEvents.length === 0 ? (
                <p className="text-sm text-slate-500">Todavia no hay eventos suficientes.</p>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Ultimas IPs observadas</h2>
              <p className="text-sm text-slate-500">
                Vista operativa de IPs recientes. La ubicacion en mapa depende de puntos reportados,
                no de geolocalizacion IP.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Ultimo evento</th>
                    <th className="px-4 py-3">Objetivo</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Veces</th>
                    <th className="px-4 py-3">Ultima vez</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIps.map((item) => (
                    <tr key={item.ipAddress} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4 font-mono text-xs text-slate-700">{item.ipAddress}</td>
                      <td className="px-4 py-4 text-slate-700">{item.eventType}</td>
                      <td className="px-4 py-4 text-slate-700">
                        <div className="font-medium text-slate-900">{item.targetName || "-"}</div>
                        <div className="text-xs text-slate-500">{item.targetType}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.path || "-"}</td>
                      <td className="px-4 py-4 text-slate-700">{item.count}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(item.lastSeenAt)}</td>
                    </tr>
                  ))}
                  {recentIps.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay IPs registradas en analytics todavia.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Ultimos incidentes reportados</h2>
              <p className="text-sm text-slate-500">
                Severidad operativa, radio de afectacion y confirmaciones recientes.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {getTrafficIncidentLabel(incident.incident_type as never)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {incident.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {getTrafficIncidentRadiusLabel(incident.radius_meters)}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-700">{incident.description || "Sin detalle"}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>{formatDateTime(incident.created_at)}</span>
                    <span>Confirmaciones: {incident.confirmation_count}</span>
                    <span>Rechazos: {incident.rejection_count}</span>
                    <span>
                      Lat {incident.latitude.toFixed(3)} | Lng {incident.longitude.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
              {recentIncidents.length === 0 ? (
                <div className="px-5 py-8 text-sm text-slate-500">
                  No hay incidentes recientes registrados.
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Gasolineras mas reportadas</h2>
              <p className="text-sm text-slate-500">
                El color responde al ultimo estado reportado en combustible.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Estacion</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fila</th>
                    <th className="px-4 py-3">Reportes</th>
                    <th className="px-4 py-3">Ultimo</th>
                  </tr>
                </thead>
                <tbody>
                  {topStations.map((station) => (
                    <tr key={station.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4 text-slate-700">
                        <div className="font-medium text-slate-900">{station.label}</div>
                        <div className="text-xs text-slate-500">{station.zone}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getAvailabilityClass(
                            station.availabilityStatus
                          )}`}
                        >
                          {getAvailabilityLabel(station.availabilityStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{getQueueLabel(station.queueStatus)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{station.reportCount}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(station.updatedAt)}</td>
                    </tr>
                  ))}
                  {topStations.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Todavia no hay estaciones con reportes suficientes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Historial reciente</h2>
            <p className="text-sm text-slate-500">
              Selecciones, contactos, aperturas de reporte y conversiones recientes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Objetivo</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Visitante</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 text-slate-600">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-4 text-slate-700">{item.event_type}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <div className="font-medium text-slate-900">{item.target_name || "-"}</div>
                      <div className="text-xs text-slate-500">
                        {item.target_type}
                        {item.target_id != null ? ` #${item.target_id}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.path || "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{item.visitor_id?.slice(0, 12) || "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{item.ip_address || "-"}</td>
                  </tr>
                ))}
                {events.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Aun no hay eventos registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar analitica: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
