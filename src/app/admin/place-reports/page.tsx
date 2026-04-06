import { requireAdminSession } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { PlaceReport } from "@/lib/types";

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
      .select("*")
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

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar denuncias: {error.message}
        </div>
      );
    }

    const reports = (data ?? []) as PlaceReport[];
    const stationCount = reports.filter((item) => item.target_type === "station").length;
    const serviceCount = reports.filter((item) => item.target_type === "service").length;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
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
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Ultimas denuncias</h2>
            <p className="text-sm text-slate-500">
              Reportes de lugares inexistentes o mal cargados enviados desde el mapa.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Lugar</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Origen</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(item.created_at).toLocaleString("es-BO")}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.target_type === "station" ? "EESS" : "Servicio"}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {item.target_name || `ID ${item.target_id}`}
                      </div>
                      <div>ID {item.target_id}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {reasonLabels[item.reason] || item.reason}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.notes || "-"}</td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{item.visitor_id || "-"}</div>
                      <div>{item.ip_address || "-"}</div>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Aun no hay denuncias registradas.
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
        Error al cargar denuncias: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
