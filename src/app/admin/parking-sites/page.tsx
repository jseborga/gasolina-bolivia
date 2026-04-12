import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { ParkingSite } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatAvailability(site: ParkingSite) {
  if (site.available_spots == null && site.total_spots == null) return "Sin cupos";
  if (site.available_spots == null) return `${site.total_spots} plazas`;
  if (site.total_spots == null) return `${site.available_spots} libres`;
  return `${site.available_spots} / ${site.total_spots}`;
}

function getStatusClass(status: ParkingSite["status"]) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700";
    case "full":
      return "bg-amber-100 text-amber-800";
    case "closed":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusLabel(status: ParkingSite["status"]) {
  switch (status) {
    case "open":
      return "Abierto";
    case "full":
      return "Lleno";
    case "closed":
      return "Cerrado";
    default:
      return "Sin dato";
  }
}

export default async function AdminParkingSitesPage() {
  await requireAdminSession("/admin/parking-sites");

  try {
    const supabase = getAdminSupabase();
    const [parkingSitesResult, profilesResult] = await Promise.all([
      supabase.from("parking_sites").select("*").order("name", { ascending: true }),
      supabase
        .from("app_profiles")
        .select("id,full_name")
        .order("full_name", { ascending: true }),
    ]);

    if (isMissingTableError(parkingSitesResult.error, "parking_sites")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingParkingSitesMessage()}
        </div>
      );
    }

    if (parkingSitesResult.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar parqueos: {parkingSitesResult.error.message}
        </div>
      );
    }

    const managerMap = new Map<number, string>(
      ((profilesResult.data ?? []) as Array<{ id: number; full_name: string }>).map((profile) => [
        profile.id,
        profile.full_name,
      ])
    );
    const warning = isMissingTableError(profilesResult.error, "app_profiles")
      ? getMissingAppProfilesMessage()
      : null;
    const parkingSites = (parkingSitesResult.data ?? []) as ParkingSite[];

    const stats = {
      open: parkingSites.filter((site) => site.status === "open").length,
      published: parkingSites.filter((site) => site.is_published).length,
      total: parkingSites.length,
      withoutManager: parkingSites.filter((site) => site.manager_profile_id == null).length,
    };

    return (
      <div className="space-y-5">
        {warning ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {warning}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Abiertos</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.open}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Publicados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.published}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Sin encargado</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{stats.withoutManager}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Parqueos</h1>
              <p className="text-sm text-slate-500">
                Busca, asigna encargados y publica disponibilidad para el mapa.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/profiles"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver perfiles
              </Link>
              <Link
                href="/admin/parking-sites/new"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Nuevo parqueo
              </Link>
            </div>
          </div>

          {parkingSites.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">Todavia no hay parqueos cargados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Parqueo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Disponibilidad</th>
                    <th className="px-4 py-3 font-medium">Zona</th>
                    <th className="px-4 py-3 font-medium">Encargado</th>
                    <th className="px-4 py-3 font-medium">Publicacion</th>
                    <th className="px-4 py-3 font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {parkingSites.map((site) => (
                    <tr key={site.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{site.name}</div>
                        <div className="text-xs text-slate-500">
                          {site.code} | {site.address || site.city || "Sin direccion"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(site.status)}`}
                        >
                          {getStatusLabel(site.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatAvailability(site)}</td>
                      <td className="px-4 py-3">{site.zone || site.city || "-"}</td>
                      <td className="px-4 py-3">
                        {site.manager_profile_id != null
                          ? managerMap.get(site.manager_profile_id) ?? "Perfil no encontrado"
                          : "Sin encargado"}
                      </td>
                      <td className="px-4 py-3">
                        {site.is_published ? "Publicado" : "Borrador"}
                        {site.is_verified ? " | Verificado" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/parking-sites/${site.id}`}
                          className="font-medium text-slate-900 underline underline-offset-2"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar parqueos: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
