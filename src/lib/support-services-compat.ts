import type { ServiceAdminRow } from "@/lib/admin-service-types";
import type { SupportService } from "@/lib/types";

export const SUPPORT_SERVICE_OPTIONAL_COLUMNS = [
  "price_text",
  "meeting_point",
  "rating_score",
  "rating_count",
  "is_published",
] as const;

export const SUPPORT_SERVICE_BASE_SELECT =
  "id,name,category,zone,city,address,latitude,longitude,phone,whatsapp_number,website_url,description,is_active,is_verified,source_url,notes,created_at,updated_at";

export const SUPPORT_SERVICE_SELECT = `${SUPPORT_SERVICE_BASE_SELECT},${SUPPORT_SERVICE_OPTIONAL_COLUMNS.join(",")}`;

type SupportServiceLike = Partial<ServiceAdminRow & SupportService>;

export function withSupportServiceDefaults(
  service: SupportServiceLike
): ServiceAdminRow & SupportService {
  return {
    is_published: true,
    meeting_point: null,
    price_text: null,
    rating_count: 0,
    rating_score: 0,
    ...service,
  } as ServiceAdminRow & SupportService;
}

export function stripSupportServiceOptionalFields<T extends Record<string, unknown>>(
  payload: T
) {
  const {
    is_published,
    meeting_point,
    price_text,
    rating_count,
    rating_score,
    ...legacyPayload
  } = payload;

  return legacyPayload;
}
