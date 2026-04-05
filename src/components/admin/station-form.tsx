"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseMapsInput, type ParsedMapsInput } from "@/lib/google-maps";
import type {
  StationAdminInput,
  StationAdminRow,
  StationLocationVerification,
} from "@/lib/admin-types";
import { StationLocationPicker } from "@/components/admin/station-location-picker";

type Props = {
  initial?: Partial<StationAdminRow>;
  mode: "create" | "edit";
  stationId?: number;
};

const CREATE_BASE_STATE = {
  address: "",
  city: "La Paz",
  fuel_diesel: true,
  fuel_especial: true,
  fuel_gnv: false,
  fuel_premium: false,
  is_active: true,
  is_verified: false,
  latitude: "",
  license_code: "",
  longitude: "",
  maps_input: "",
  name: "",
  notes: "",
  reputation_score: "0",
  reputation_votes: "0",
  source_url: "",
  zone: "",
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return "Sin distancia";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(2)} km`;
}

function buildResolveMessage(parsed: ParsedMapsInput) {
  if (parsed.latitude != null && parsed.longitude != null) {
    switch (parsed.matchSource) {
      case "redirect":
        return "Coordenadas extraidas desde el enlace resuelto.";
      case "html":
        return "Coordenadas detectadas dentro de la pagina de Google Maps.";
      default:
        return "Coordenadas detectadas y cargadas en el formulario.";
    }
  }

  if (parsed.sourceUrl) {
    return "Se guardo el enlace, pero no se pudieron obtener coordenadas automaticamente.";
  }

  if (parsed.address) {
    return "Se cargo la direccion. Si falta el punto, ajustalo manualmente en el mapa.";
  }

  return "No se encontro informacion util en el texto pegado.";
}

export function StationForm({ initial, mode, stationId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    zone: initial?.zone ?? "",
    city: initial?.city ?? "La Paz",
    address: initial?.address ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    reputation_score: initial?.reputation_score?.toString() ?? "0",
    reputation_votes: initial?.reputation_votes?.toString() ?? "0",
    fuel_especial: initial?.fuel_especial ?? true,
    fuel_premium: initial?.fuel_premium ?? false,
    fuel_diesel: initial?.fuel_diesel ?? true,
    fuel_gnv: initial?.fuel_gnv ?? false,
    is_active: initial?.is_active ?? true,
    is_verified: initial?.is_verified ?? false,
    source_url: initial?.source_url ?? "",
    notes: initial?.notes ?? "",
    license_code: initial?.license_code ?? "",
    maps_input: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<StationLocationVerification | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => parseMapsInput(form.maps_input), [form.maps_input]);
  const auditSuggestion = useMemo(() => {
    const suggestedLatitude = Number(searchParams.get("suggestedLat"));
    const suggestedLongitude = Number(searchParams.get("suggestedLng"));
    const distanceKm = Number(searchParams.get("distanceKm"));

    return {
      address: searchParams.get("suggestedAddress")?.trim() || "",
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
      latitude: Number.isFinite(suggestedLatitude) ? suggestedLatitude : null,
      longitude: Number.isFinite(suggestedLongitude) ? suggestedLongitude : null,
    };
  }, [searchParams]);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const clearVerification = () => {
    setVerification(null);
  };

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    clearVerification();
  };

  const applyParsedToForm = (parsed: ParsedMapsInput) => {
    updateForm({
      address: parsed.address || form.address,
      latitude: parsed.latitude != null ? parsed.latitude.toFixed(6) : form.latitude,
      longitude: parsed.longitude != null ? parsed.longitude.toFixed(6) : form.longitude,
      source_url: parsed.sourceUrl || form.source_url,
    });
  };

  const applyMapsInput = async () => {
    const input = form.maps_input.trim();
    if (!input) {
      setError("Pega una URL, direccion o coordenadas.");
      setMessage(null);
      return;
    }

    clearFeedback();
    clearVerification();

    const localParsed = parseMapsInput(input);
    let finalParsed = localParsed;
    let fallbackMessage: string | null = null;

    if (localParsed.sourceUrl) {
      setResolving(true);
      try {
        const res = await fetch("/api/admin/maps/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });

        const json = (await res.json()) as ParsedMapsInput & { error?: string };
        if (!res.ok) {
          throw new Error(json.error || "No se pudo resolver el enlace.");
        }

        finalParsed = json;
      } catch (err) {
        if (localParsed.latitude != null && localParsed.longitude != null) {
          fallbackMessage =
            "Se usaron las coordenadas detectadas localmente, pero no se pudo resolver el enlace completo.";
        } else {
          setError(err instanceof Error ? err.message : "No se pudo resolver el enlace.");
          setResolving(false);
          return;
        }
      } finally {
        setResolving(false);
      }
    }

    applyParsedToForm(finalParsed);

    if (fallbackMessage) {
      setMessage(fallbackMessage);
      return;
    }

    if (finalParsed.latitude == null || finalParsed.longitude == null) {
      setError("No se encontraron coordenadas automaticas. Usa el mapa para fijar el punto.");
    }

    setMessage(buildResolveMessage(finalParsed));
  };

  const verifyLocation = async () => {
    if (!form.address.trim() && (!form.latitude.trim() || !form.longitude.trim())) {
      setError("Necesitas direccion o coordenadas para verificar.");
      setMessage(null);
      return;
    }

    setVerifying(true);
    clearFeedback();

    try {
      const res = await fetch("/api/admin/maps/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address.trim(),
          latitude: form.latitude.trim(),
          longitude: form.longitude.trim(),
        }),
      });

      const json = (await res.json()) as StationLocationVerification & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo verificar la ubicacion.");
      }

      setVerification(json);
      if (json.status === "ok" && json.issues.length === 0) {
        setMessage("Direccion y punto verificados.");
      } else if (json.status === "warning") {
        setError("La direccion y el punto necesitan revision.");
      } else {
        setMessage("Verificacion completada con datos parciales.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar la ubicacion.");
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    clearFeedback();

    const latitudeValue = form.latitude.trim();
    const longitudeValue = form.longitude.trim();

    if ((latitudeValue && !longitudeValue) || (!latitudeValue && longitudeValue)) {
      setSaving(false);
      setError("Debes completar latitud y longitud juntas.");
      return;
    }

    const latitude = latitudeValue ? Number(latitudeValue) : null;
    const longitude = longitudeValue ? Number(longitudeValue) : null;
    const reputationScoreValue = form.reputation_score.trim();
    const reputationVotesValue = form.reputation_votes.trim();
    const reputationScore = reputationScoreValue ? Number(reputationScoreValue) : 0;
    const reputationVotes = reputationVotesValue ? Number(reputationVotesValue) : 0;

    if (
      (latitudeValue && !Number.isFinite(latitude ?? Number.NaN)) ||
      (longitudeValue && !Number.isFinite(longitude ?? Number.NaN))
    ) {
      setSaving(false);
      setError("Las coordenadas deben ser numericas.");
      return;
    }

    if (!Number.isFinite(reputationScore) || reputationScore < 0 || reputationScore > 5) {
      setSaving(false);
      setError("La reputacion debe estar entre 0 y 5.");
      return;
    }

    if (!Number.isFinite(reputationVotes) || reputationVotes < 0) {
      setSaving(false);
      setError("La cantidad de votos no puede ser negativa.");
      return;
    }

    const payload: StationAdminInput = {
      name: form.name.trim(),
      zone: form.zone.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      latitude,
      longitude,
      reputation_score: reputationScore,
      reputation_votes: Math.round(reputationVotes),
      fuel_especial: form.fuel_especial,
      fuel_premium: form.fuel_premium,
      fuel_diesel: form.fuel_diesel,
      fuel_gnv: form.fuel_gnv,
      is_active: form.is_active,
      is_verified: form.is_verified,
      source_url: form.source_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      license_code: form.license_code.trim() || undefined,
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/stations" : `/api/admin/stations/${stationId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");

      if (mode === "create") {
        setForm({ ...CREATE_BASE_STATE });
        clearVerification();
        router.replace(
          `/admin/stations/new?created=1&name=${encodeURIComponent(payload.name)}`
        );
        router.refresh();
        return;
      }

      setMessage("Estacion actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !stationId) return;

    const confirmed = window.confirm(
      `¿Eliminar la estación "${form.name.trim() || "sin nombre"}"?\n\nEsto también eliminará sus reportes asociados.`
    );

    if (!confirmed) return;

    setDeleting(true);
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "DELETE",
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo eliminar la estacion");

      router.push("/admin/stations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === "create" ? "Nueva estacion" : "Editar estacion"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Puedes pegar una direccion, coordenadas o una URL de Google Maps. Si
          la URL es corta o redirige, el sistema intenta resolverla antes de
          completar el punto.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <input className={fieldClass()} value={form.name} onChange={(e) => updateForm({ name: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Zona</span>
          <input className={fieldClass()} value={form.zone} onChange={(e) => updateForm({ zone: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Ciudad</span>
          <input className={fieldClass()} value={form.city} onChange={(e) => updateForm({ city: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Codigo / licencia</span>
          <input className={fieldClass()} value={form.license_code} onChange={(e) => updateForm({ license_code: e.target.value })} />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Pega direccion, coordenadas o URL de Google Maps</span>
          <textarea className={fieldClass()} value={form.maps_input} onChange={(e) => updateForm({ maps_input: e.target.value })} rows={3} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={applyMapsInput}
            disabled={resolving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {resolving ? "Resolviendo enlace..." : "Analizar y completar"}
          </button>
          <span className="text-xs text-slate-500">
            Detectado: lat {parsedPreview.latitude ?? "-"} / lng {parsedPreview.longitude ?? "-"}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Direccion</span>
        <input className={fieldClass()} value={form.address} onChange={(e) => updateForm({ address: e.target.value })} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Latitud</span>
          <input className={fieldClass()} value={form.latitude} onChange={(e) => updateForm({ latitude: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Longitud</span>
          <input className={fieldClass()} value={form.longitude} onChange={(e) => updateForm({ longitude: e.target.value })} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Reputacion</span>
          <input
            className={fieldClass()}
            value={form.reputation_score}
            onChange={(e) => updateForm({ reputation_score: e.target.value })}
            placeholder="0 a 5"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Cantidad de votos</span>
          <input
            className={fieldClass()}
            value={form.reputation_votes}
            onChange={(e) => updateForm({ reputation_votes: e.target.value })}
            placeholder="0"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={verifyLocation}
          disabled={verifying}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {verifying ? "Verificando..." : "Verificar calle y punto"}
        </button>
        <span className="text-xs text-slate-500">
          Compara la direccion con una geocodificacion externa y con la calle del punto.
        </span>
      </div>

      {verification ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                verification.status === "ok"
                  ? "bg-emerald-100 text-emerald-700"
                  : verification.status === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              {verification.status === "ok"
                ? "Coherente"
                : verification.status === "warning"
                  ? "Revisar"
                  : "Parcial"}
            </span>
            <span className="text-sm text-slate-600">
              Distancia entre direccion geocodificada y punto actual: {formatDistance(verification.distanceKm)}
            </span>
          </div>

          {verification.issues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {verification.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-700">
              La direccion y el punto no muestran diferencias importantes.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Direccion interpretada</p>
              {verification.addressCandidate ? (
                <>
                  <p className="mt-2 text-sm text-slate-700">{verification.addressCandidate.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Punto sugerido: {verification.addressCandidate.latitude.toFixed(6)}, {verification.addressCandidate.longitude.toFixed(6)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          latitude: verification.addressCandidate!.latitude.toFixed(6),
                          longitude: verification.addressCandidate!.longitude.toFixed(6),
                        })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Usar punto sugerido
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          address: verification.addressCandidate!.displayName,
                        })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Usar direccion sugerida
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No hubo coincidencia clara para la direccion.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Calle estimada del punto</p>
              {verification.reverseCandidate ? (
                <>
                  <p className="mt-2 text-sm text-slate-700">{verification.reverseCandidate.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Calle: {verification.reverseCandidate.road || "sin calle detectada"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          address: verification.reverseCandidate!.displayName,
                        })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Usar direccion del punto
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No se pudo estimar una calle para estas coordenadas.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {mode === "edit" &&
      (auditSuggestion.latitude != null || auditSuggestion.longitude != null || auditSuggestion.address) ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Referencia cargada desde auditoria
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Usa este punto sugerido para comparar en el mapa antes de guardar.
              {auditSuggestion.distanceKm != null
                ? ` Diferencia detectada: ${formatDistance(auditSuggestion.distanceKm)}.`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-emerald-900">
            {auditSuggestion.latitude != null && auditSuggestion.longitude != null ? (
              <span className="rounded-full bg-white/70 px-2.5 py-1">
                Punto sugerido {auditSuggestion.latitude.toFixed(6)}, {auditSuggestion.longitude.toFixed(6)}
              </span>
            ) : null}
            {auditSuggestion.address ? (
              <span className="rounded-full bg-white/70 px-2.5 py-1">
                Direccion sugerida disponible
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {auditSuggestion.latitude != null && auditSuggestion.longitude != null ? (
              <button
                type="button"
                onClick={() =>
                  updateForm({
                    latitude: auditSuggestion.latitude!.toFixed(6),
                    longitude: auditSuggestion.longitude!.toFixed(6),
                  })
                }
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                Usar punto sugerido
              </button>
            ) : null}
            {auditSuggestion.address ? (
              <button
                type="button"
                onClick={() => updateForm({ address: auditSuggestion.address })}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                Usar direccion sugerida
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <StationLocationPicker
        latitude={form.latitude}
        longitude={form.longitude}
        onChange={({ latitude, longitude }) =>
          updateForm({
            latitude,
            longitude,
          })
        }
      />

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">URL de origen</span>
        <input className={fieldClass()} value={form.source_url} onChange={(e) => updateForm({ source_url: e.target.value })} />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["fuel_especial", "Especial"],
          ["fuel_premium", "Premium"],
          ["fuel_diesel", "Diesel"],
          ["fuel_gnv", "GNV"],
          ["is_active", "Activa"],
          ["is_verified", "Verificada"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={(form as Record<string, boolean | string>)[key] as boolean}
              onChange={(e) => updateForm({ [key]: e.target.checked } as Partial<typeof form>)}
            />
            {label}
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Notas</span>
        <textarea className={fieldClass()} value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} rows={4} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving || deleting} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
          {saving ? "Guardando..." : mode === "create" ? "Crear estacion" : "Guardar cambios"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="rounded-xl border border-rose-300 px-5 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Eliminar estacion"}
          </button>
        ) : null}
        {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
    </form>
  );
}

export default StationForm;
