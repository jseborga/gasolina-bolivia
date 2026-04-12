import { ParkingProfileForm } from "@/components/admin/parking-profile-form";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAppBaseUrl } from "@/lib/app-url";

export default async function NewProfilePage() {
  await requireAdminSession("/admin/profiles/new");

  return <ParkingProfileForm mode="create" portalBaseUrl={getAppBaseUrl()} />;
}
