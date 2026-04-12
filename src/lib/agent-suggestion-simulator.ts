import type { Station } from "@/lib/types";

type FuelType = "especial" | "premium" | "diesel";
type AvailabilityStatus = "si_hay" | "no_hay" | "sin_dato";
type QueueStatus = "corta" | "media" | "larga" | "sin_dato";

type FuelScenario = {
  availabilityStatus: AvailabilityStatus;
  confidenceBase: number;
  queueStatus: QueueStatus;
  summary: string;
  titlePrefix: string;
};

function getHourInLaPaz() {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "America/La_Paz",
  }).format(new Date());

  return Number(formatted);
}

function selectFuelType(station: Station, offset: number): FuelType {
  const available: FuelType[] = [];
  if (station.fuel_especial) available.push("especial");
  if (station.fuel_premium) available.push("premium");
  if (station.fuel_diesel) available.push("diesel");
  if (available.length === 0) return "especial";
  return available[offset % available.length];
}

function getFuelScenario(hour: number, offset: number): FuelScenario {
  if (hour >= 6 && hour <= 9) {
    return {
      availabilityStatus: "si_hay",
      confidenceBase: 0.68,
      queueStatus: (["media", "corta", "larga"] as QueueStatus[])[offset % 3],
      summary: "Escenario matinal probable por inicio de jornada y mayor movimiento vehicular.",
      titlePrefix: "Movimiento matinal probable",
    };
  }

  if (hour >= 10 && hour <= 15) {
    return {
      availabilityStatus: "si_hay",
      confidenceBase: 0.72,
      queueStatus: (["corta", "media"] as QueueStatus[])[offset % 2],
      summary: "Escenario diurno de operacion estable con flujo moderado.",
      titlePrefix: "Operacion diurna probable",
    };
  }

  if (hour >= 16 && hour <= 20) {
    return {
      availabilityStatus: offset % 4 === 0 ? "sin_dato" : "si_hay",
      confidenceBase: 0.64,
      queueStatus: (["media", "larga", "media"] as QueueStatus[])[offset % 3],
      summary: "Escenario vespertino con posible acumulacion de filas por salida laboral.",
      titlePrefix: "Pico vespertino probable",
    };
  }

  return {
    availabilityStatus: "sin_dato",
    confidenceBase: 0.48,
    queueStatus: "sin_dato",
    summary: "Escenario conservador fuera de horario fuerte, usado solo para demo operativa.",
    titlePrefix: "Actividad baja probable",
  };
}

export function buildStationDemoSuggestions(stations: Station[], count: number) {
  const activeStations = stations.filter(
    (station) =>
      station.is_active !== false &&
      typeof station.latitude === "number" &&
      typeof station.longitude === "number"
  );
  const hour = getHourInLaPaz();
  const limitedStations = activeStations.slice(0, Math.max(1, Math.min(count, activeStations.length)));

  return limitedStations.map((station, index) => {
    const fuelType = selectFuelType(station, index);
    const scenario = getFuelScenario(hour, index);

    return {
      city: station.city ?? null,
      confidence: Number(Math.min(0.88, scenario.confidenceBase + index * 0.03).toFixed(2)),
      criteria: {
        based_on: "station-profile-and-time-window",
        local_hour: hour,
        station_id: station.id,
      },
      evidence: [
        {
          label: "station-reference",
          station_id: station.id,
          station_name: station.name,
        },
      ],
      kind: "fuel_report" as const,
      latitude: station.latitude,
      longitude: station.longitude,
      payload: {
        availability_status: scenario.availabilityStatus,
        fuel_type: fuelType,
        queue_status: scenario.queueStatus,
        station_id: station.id,
        station_name: station.name,
      },
      provider: "custom" as const,
      source_label: "admin-simulator",
      status: "pending_review" as const,
      summary: `${scenario.summary} Combustible foco: ${fuelType}.`,
      synthetic_mode: "ai_simulated" as const,
      title: `${scenario.titlePrefix} en ${station.name}`,
      visibility: "admin_only" as const,
      zone: station.zone ?? null,
    };
  });
}
