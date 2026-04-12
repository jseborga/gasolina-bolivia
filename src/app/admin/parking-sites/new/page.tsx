import { ParkingSiteForm } from "@/components/admin/parking-site-form";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMissingAppProfilesMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfileAdminRow } from "@/lib/admin-parking-types";

type NewParkingSitePageProps = {
  searchParams: Promise<{
    created?: string;
    name?: string;
  }>;
};

export default async function NewParkingSitePage({ searchParams }: NewParkingSitePageProps) {
  await requireAdminSession("/admin/parking-sites/new");
  const params = await searchParams;

  let managerOptions: Array<Pick<AppProfileAdminRow, "id" | "full_name" | "role" | "is_active">> =
    [];
  let warning: string | null = null;

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("app_profiles")
      .select("id,full_name,role,is_active")
      .order("full_name", { ascending: true });

    if (isMissingTableError(error, "app_profiles")) {
      warning = getMissingAppProfilesMessage();
    } else if (error) {
      warning = error.message;
    } else {
      managerOptions = (data ?? []) as typeof managerOptions;
    }
  } catch (error) {
    warning = error instanceof Error ? error.message : "No se pudieron cargar los perfiles.";
  }

  return (
    <div className="space-y-4">
      {params.created === "1" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Se creo {params.name ? `"${params.name}"` : "el parqueo"} y el formulario quedo listo
          para cargar otro.
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {warning}
        </div>
      ) : null}

      <ParkingSiteForm managerOptions={managerOptions} mode="create" />
    </div>
  );
}
