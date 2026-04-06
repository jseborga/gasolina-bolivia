import { OSMImporter } from "@/components/admin/osm-importer";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminOSMImportPage() {
  await requireAdminSession("/admin/import/osm");
  return <OSMImporter />;
}
