import { requireAdminSession } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { VendorRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminVendorRequestsPage() {
  await requireAdminSession("/admin/vendor-requests");

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("vendor_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (isMissingTableError(error, "vendor_requests")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Falta la tabla <code>vendor_requests</code>. Ejecuta la migracion
          <code> supabase/005_publish_analytics_vendor_requests.sql</code>.
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar solicitudes: {error.message}
        </div>
      );
    }

    const requests = (data ?? []) as VendorRequest[];
    const pendingCount = requests.filter((item) => item.status === "pending").length;
    const reviewingCount = requests.filter((item) => item.status === "reviewing").length;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Solicitudes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{requests.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">En revision</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{reviewingCount}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Ultimas solicitudes</h2>
            <p className="text-sm text-slate-500">
              Base comercial para talleres, gruas, aditivos, auxilio o estaciones.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(item.created_at).toLocaleString("es-BO")}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div>{item.business_name || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.category}</td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{item.email}</div>
                      <div>{item.phone || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.status}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {[item.city, item.notes].filter(Boolean).join(" | ") || "-"}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Aun no hay solicitudes registradas.
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
        Error al cargar solicitudes: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
