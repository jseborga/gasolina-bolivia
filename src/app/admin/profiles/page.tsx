import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAppProfileRoleLabel } from "@/lib/parking";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminProfilesPage() {
  await requireAdminSession("/admin/profiles");

  try {
    const supabase = getAdminSupabase();
    const [profilesResult, parkingSitesResult] = await Promise.all([
      supabase.from("app_profiles").select("*").order("full_name", { ascending: true }),
      supabase.from("parking_sites").select("id,manager_profile_id"),
    ]);

    if (isMissingTableError(profilesResult.error, "app_profiles")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingAppProfilesMessage()}
        </div>
      );
    }

    if (profilesResult.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar perfiles: {profilesResult.error.message}
        </div>
      );
    }

    const warning = isMissingTableError(parkingSitesResult.error, "parking_sites")
      ? getMissingParkingSitesMessage()
      : parkingSitesResult.error?.message ?? null;
    const profiles = (profilesResult.data ?? []) as AppProfile[];
    const assignedCount = new Map<number, number>();

    for (const row of parkingSitesResult.data ?? []) {
      if (row.manager_profile_id == null) continue;
      assignedCount.set(row.manager_profile_id, (assignedCount.get(row.manager_profile_id) ?? 0) + 1);
    }

    const stats = {
      active: profiles.filter((profile) => profile.is_active).length,
      managers: profiles.filter((profile) => profile.role === "parking_manager").length,
      total: profiles.length,
      withParkings: profiles.filter((profile) => (assignedCount.get(profile.id) ?? 0) > 0).length,
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
            <p className="text-sm text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.active}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Encargados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.managers}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Con parqueos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.withParkings}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Perfiles y roles</h1>
              <p className="text-sm text-slate-500">
                Gestiona encargados, confiabilidad, creditos y accesos privados.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/parking-sites"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver parqueos
              </Link>
              <Link
                href="/admin/profiles/new"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Nuevo perfil
              </Link>
            </div>
          </div>

          {profiles.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">Todavia no hay perfiles cargados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Perfil</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 font-medium">Confiabilidad</th>
                    <th className="px-4 py-3 font-medium">Creditos</th>
                    <th className="px-4 py-3 font-medium">Parqueos</th>
                    <th className="px-4 py-3 font-medium">Portal</th>
                    <th className="px-4 py-3 font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{profile.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {profile.is_active ? "Activo" : "Inactivo"}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getAppProfileRoleLabel(profile.role)}</td>
                      <td className="px-4 py-3">
                        {profile.whatsapp_number || profile.phone || profile.email || "-"}
                      </td>
                      <td className="px-4 py-3">{profile.reliability_score ?? 0}</td>
                      <td className="px-4 py-3">{profile.credit_balance ?? 0}</td>
                      <td className="px-4 py-3">{assignedCount.get(profile.id) ?? 0}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/parqueos/gestion/${profile.manager_access_token}`}
                          target="_blank"
                          className="font-medium text-slate-900 underline underline-offset-2"
                        >
                          Abrir
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/profiles/${profile.id}`}
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
        Error al cargar perfiles: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
