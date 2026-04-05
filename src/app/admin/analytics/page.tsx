import { requireAdminSession } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdminSession("/admin/analytics");

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("app_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (isMissingTableError(error, "app_events")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Falta la tabla <code>app_events</code>. Ejecuta la migracion
          <code> supabase/005_publish_analytics_vendor_requests.sql</code>.
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar analitica: {error.message}
        </div>
      );
    }

    const events = (data ?? []) as AppEvent[];
    const uniqueVisitors = new Set(events.map((item) => item.visitor_id).filter(Boolean)).size;
    const uniqueIps = new Set(events.map((item) => item.ip_address).filter(Boolean)).size;
    const eventTypeCounts = events.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.event_type] = (accumulator[item.event_type] ?? 0) + 1;
      return accumulator;
    }, {});
    const topEvents = Object.entries(eventTypeCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Eventos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{events.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Visitantes unicos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{uniqueVisitors}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">IPs unicas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{uniqueIps}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ultimo evento</p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {events[0] ? new Date(events[0].created_at).toLocaleString("es-BO") : "-"}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Top eventos</h2>
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
                <p className="text-sm text-slate-500">Todavia no hay eventos registrados.</p>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Historial reciente</h2>
              <p className="text-sm text-slate-500">
                Selecciones, contactos, aperturas de reporte y conversiones.
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
                      <td className="px-4 py-4 text-slate-600">
                        {new Date(item.created_at).toLocaleString("es-BO")}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{item.event_type}</td>
                      <td className="px-4 py-4 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {item.target_name || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.target_type}
                          {item.target_id != null ? ` #${item.target_id}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.path || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.visitor_id?.slice(0, 12) || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.ip_address || "-"}</td>
                    </tr>
                  ))}
                  {events.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Aun no hay interacciones registradas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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
