import type {
  AppProfileAdminInput,
  ParkingSiteAdminInput,
} from "@/lib/admin-parking-types";
import { APP_PROFILE_ROLE_OPTIONS, normalizePhoneKey, PARKING_STATUS_OPTIONS } from "@/lib/parking";
import { createParkingManagerAccessToken } from "@/lib/parking-manager-auth";

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCoordinate(
  value: number | null | undefined,
  type: "latitude" | "longitude"
) {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    throw new Error(type === "latitude" ? "La latitud no es valida." : "La longitud no es valida.");
  }

  if (type === "latitude" && (value < -90 || value > 90)) {
    throw new Error("La latitud debe estar entre -90 y 90.");
  }

  if (type === "longitude" && (value < -180 || value > 180)) {
    throw new Error("La longitud debe estar entre -180 y 180.");
  }

  return Number(value.toFixed(6));
}

function normalizeNonNegativeInteger(value: number | null | undefined, label: string) {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    throw new Error(`${label} no es valido.`);
  }

  const rounded = Math.round(value);
  if (rounded < 0) {
    throw new Error(`${label} no puede ser negativo.`);
  }

  return rounded;
}

function normalizeNullableScore(value: number | null | undefined, label: string) {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    throw new Error(`${label} no es valido.`);
  }

  if (value < 0 || value > 100) {
    throw new Error(`${label} debe estar entre 0 y 100.`);
  }

  return Number(value.toFixed(1));
}

export function normalizeParkingSiteAdminInput(body: ParkingSiteAdminInput) {
  const name = body.name?.trim();
  const code = body.code?.trim().toUpperCase();

  if (!name) {
    throw new Error("El nombre del parqueo es obligatorio.");
  }

  if (!code || !/^[A-Z0-9_-]{3,24}$/.test(code)) {
    throw new Error("El codigo debe tener entre 3 y 24 caracteres alfanumericos.");
  }

  const latitude = normalizeCoordinate(body.latitude ?? null, "latitude");
  const longitude = normalizeCoordinate(body.longitude ?? null, "longitude");
  if ((latitude == null) !== (longitude == null)) {
    throw new Error("Debes completar latitud y longitud juntas.");
  }

  const totalSpots = normalizeNonNegativeInteger(body.total_spots ?? null, "La capacidad total");
  const availableSpots = normalizeNonNegativeInteger(
    body.available_spots ?? null,
    "Los cupos disponibles"
  );

  if (totalSpots != null && availableSpots != null && availableSpots > totalSpots) {
    throw new Error("Los cupos disponibles no pueden ser mayores a la capacidad total.");
  }

  const status = body.status ?? "unknown";
  if (!PARKING_STATUS_OPTIONS.some((option) => option.value === status)) {
    throw new Error("El estado del parqueo no es valido.");
  }

  return {
    accepts_reservations: body.accepts_reservations ?? false,
    access_notes: normalizeText(body.access_notes),
    address: normalizeText(body.address),
    available_spots: availableSpots,
    city: normalizeText(body.city),
    closes_at: normalizeText(body.closes_at),
    code,
    height_limit_text: normalizeText(body.height_limit_text),
    is_24h: body.is_24h ?? false,
    is_active: body.is_active ?? true,
    is_published: body.is_published ?? false,
    is_verified: body.is_verified ?? false,
    latitude,
    longitude,
    manager_profile_id: body.manager_profile_id ?? null,
    name,
    opens_at: normalizeText(body.opens_at),
    payment_methods: normalizeText(body.payment_methods),
    phone: normalizeText(body.phone),
    pricing_text: normalizeText(body.pricing_text),
    source_url: normalizeText(body.source_url),
    status,
    total_spots: totalSpots,
    whatsapp_number: normalizeText(body.whatsapp_number),
    zone: normalizeText(body.zone),
  };
}

export function normalizeAppProfileAdminInput(body: AppProfileAdminInput, currentToken?: string | null) {
  const fullName = body.full_name?.trim();
  if (!fullName) {
    throw new Error("El nombre del perfil es obligatorio.");
  }

  if (!APP_PROFILE_ROLE_OPTIONS.some((option) => option.value === body.role)) {
    throw new Error("El rol del perfil no es valido.");
  }

  const email = normalizeText(body.email)?.toLowerCase() ?? null;
  const phone = normalizeText(body.phone);
  const whatsappNumber = normalizeText(body.whatsapp_number);

  return {
    credit_balance: normalizeNonNegativeInteger(body.credit_balance ?? null, "Los creditos"),
    email,
    full_name: fullName,
    is_active: body.is_active ?? true,
    manager_access_token:
      body.regenerate_access_token || !currentToken
        ? createParkingManagerAccessToken()
        : currentToken,
    notes: normalizeText(body.notes),
    phone,
    phone_key: normalizePhoneKey(phone),
    reliability_score: normalizeNullableScore(
      body.reliability_score ?? null,
      "La confiabilidad"
    ),
    role: body.role,
    telegram_chat_id: normalizeText(body.telegram_chat_id),
    whatsapp_number: whatsappNumber,
    whatsapp_key: normalizePhoneKey(whatsappNumber ?? phone),
  };
}
