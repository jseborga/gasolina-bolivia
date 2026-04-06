import { requireAdminSession } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { TrafficIncident } from "@/lib/types";

export const dynamic = "force-dynamic";

const incidentLabels: Record<string, string> = {
  accidente: "Accidente",
  control_vial: "Control vial",
  corte_via: "Corte de via",
  derrumbe: "Derrumbe",
  marcha: "Marcha",
  otro: "Incidente",
};

export default async function AdminTrafficIncidentsPage() {
  await requireAdminSession("/admin/traffic-incidents");

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("traffic_incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (isMissingTableError(error, "traffic_incidents")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Falta la tabla <code>traffic_incidents</code>. Ejecuta la migracion
          <code> supabase/009_traffic_incidents.sql</code>.
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar incidentes: {error.message}
        </div>
      );
    }

    const incidents = (data ?? []) as TrafficIncident[];
    const activeCount = incidents.filter((item) => item.status === "active").length;
    const totalConfirmations = incidents.reduce(
      (sum, item) => sum + (item.confirmation_count ?? 0),
      0
    );

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Incidentes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{incidents.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{activeCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Confirmaciones</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalConfirmations}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Incidentes recientes</h2>
            <p className="text-sm text-slate-500">
              Reportes comunitarios de cortes, marchas, controles y otros eventos viales.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Confirmaciones</th>
                  <th className="px-4 py-3">Punto</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(item.created_at).toLocaleString("es-BO")}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {incidentLabels[item.incident_type] || item.incident_type}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.description || "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{item.status}</td>
                    <td className="px-4 py-4 text-slate-600">{item.confirmation_count}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Aun no hay incidentes viales registrados.
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
        Error al cargar incidentes: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
