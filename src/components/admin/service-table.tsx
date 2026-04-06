"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { RatingStars } from "@/components/rating-stars";
import type { ServiceAdminRow } from "@/lib/admin-service-types";
import { getSupportServiceLabel } from "@/lib/services";
import type { SupportServiceCategory } from "@/lib/types";

type ServiceBatchAction = "delete" | "publish" | "unpublish" | "verify" | "unverify";

const collator = new Intl.Collator("es", { sensitivity: "base" });

function getZoneValue(service: ServiceAdminRow) {
  const value = service.zone?.trim() || service.city?.trim();
  return value && value.length > 0 ? value : "__sin_zona__";
}

function getZoneLabel(value: string) {
  return value === "__sin_zona__" ? "Sin zona" : value;
}

export function ServiceTable({ services }: { services: ServiceAdminRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupportServiceCategory | "all">("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState<"all" | "published" | "draft">(
    "all"
  );
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "pending">(
    "all"
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<ServiceBatchAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const zoneOptions = useMemo(
    () =>
      Array.from(new Set(services.map((service) => getZoneValue(service)))).sort((a, b) =>
        collator.compare(getZoneLabel(a), getZoneLabel(b))
      ),
    [services]
  );

  const filtered = useMemo(
    () =>
      services.filter((service) => {
        const matchesQuery =
          !deferredQuery ||
          [
            service.name,
            service.zone,
            service.city,
            service.address,
            service.phone,
            service.whatsapp_number,
            getSupportServiceLabel(service.category),
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(deferredQuery));

        const matchesCategory =
          categoryFilter === "all" || service.category === categoryFilter;

        const matchesZone = zoneFilter === "all" || getZoneValue(service) === zoneFilter;

        const matchesPublication =
          publicationFilter === "all" ||
          (publicationFilter === "published" ? service.is_published : !service.is_published);

        const matchesVerification =
          verificationFilter === "all" ||
          (verificationFilter === "verified" ? service.is_verified : !service.is_verified);

        return (
          matchesQuery &&
          matchesCategory &&
          matchesZone &&
          matchesPublication &&
          matchesVerification
        );
      }),
    [categoryFilter, deferredQuery, publicationFilter, services, verificationFilter, zoneFilter]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredIds = filtered.map((service) => service.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));

  const toggleSelectedId = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleFilteredSelection = () => {
    setSelectedIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  const runBulkAction = async (action: ServiceBatchAction) => {
    if (selectedIds.length === 0) {
      setError("Debes seleccionar al menos un servicio.");
      return;
    }

    if (
      action === "delete" &&
      !window.confirm(`Eliminar ${selectedIds.length} servicios seleccionados?`)
    ) {
      return;
    }

    setBulkAction(action);
    setError(null);

    try {
      const res = await fetch("/api/admin/services/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo ejecutar la accion masiva.");
      }

      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ejecutar la accion masiva.");
    } finally {
      setBulkAction(null);
    }
  };

  const handleDelete = async (service: ServiceAdminRow) => {
    const confirmed = window.confirm(`Eliminar el servicio "${service.name}"?`);
    if (!confirmed) return;

    setDeletingId(service.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "DELETE",
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo eliminar el servicio.");
      }

      setSelectedIds((current) => current.filter((id) => id !== service.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el servicio.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Servicios de auxilio</h2>
            <p className="text-sm text-slate-500">
              Talleres, gruas, mecanica, aditivos y publicacion masiva.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/import/osm"
              className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar OSM
            </Link>
            <Link
              href="/admin/services/new"
              className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
            >
              Nuevo servicio
            </Link>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(160px,1fr))]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, categoria, zona o contacto"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as SupportServiceCategory | "all")
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="all">Todas las categorias</option>
            <option value="taller_mecanico">Taller mecanico</option>
            <option value="grua">Grua</option>
            <option value="servicio_mecanico">Auxilio mecanico</option>
            <option value="aditivos">Aditivos</option>
          </select>

          <select
            value={zoneFilter}
            onChange={(event) => setZoneFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="all">Todas las zonas</option>
            {zoneOptions.map((option) => (
              <option key={option} value={option}>
                {getZoneLabel(option)}
              </option>
            ))}
          </select>

          <select
            value={publicationFilter}
            onChange={(event) =>
              setPublicationFilter(event.target.value as typeof publicationFilter)
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="all">Todos los estados</option>
            <option value="published">Publicados</option>
            <option value="draft">Borrador</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(event) =>
              setVerificationFilter(event.target.value as typeof verificationFilter)
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="all">Todas las validaciones</option>
            <option value="verified">Validados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>
              Filtrados: <strong className="text-slate-900">{filtered.length}</strong>
            </span>
            <span>
              Seleccionados: <strong className="text-slate-900">{selectedIds.length}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleFilteredSelection}
              disabled={filteredIds.length === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allFilteredSelected ? "Quitar visibles" : "Seleccionar visibles"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                Limpiar seleccion
            </button>
            <button
              type="button"
              onClick={() => runBulkAction("publish")}
              disabled={selectedIds.length === 0 || bulkAction !== null}
              className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkAction === "publish" ? "Publicando..." : "Publicar"}
            </button>
            <button
              type="button"
              onClick={() => runBulkAction("unpublish")}
              disabled={selectedIds.length === 0 || bulkAction !== null}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkAction === "unpublish" ? "Guardando..." : "Pasar a borrador"}
            </button>
            <button
              type="button"
              onClick={() => runBulkAction("verify")}
              disabled={selectedIds.length === 0 || bulkAction !== null}
              className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkAction === "verify" ? "Validando..." : "Validar"}
            </button>
            <button
              type="button"
              onClick={() => runBulkAction("delete")}
              disabled={selectedIds.length === 0 || bulkAction !== null}
              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkAction === "delete" ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleFilteredSelection}
                  aria-label={allFilteredSelected ? "Quitar visibles" : "Seleccionar visibles"}
                />
              </th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Ubicacion</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((service) => (
              <tr key={service.id} className="border-t border-slate-100">
                <td className="px-4 py-4 align-top">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(service.id)}
                    onChange={() => toggleSelectedId(service.id)}
                    aria-label={`Seleccionar ${service.name}`}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">{service.name}</div>
                  <div className="mt-2">
                    <RatingStars count={service.rating_count} score={service.rating_score} />
                  </div>
                  {service.price_text ? (
                    <div className="mt-2 text-xs text-slate-500">Precio: {service.price_text}</div>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {getSupportServiceLabel(service.category)}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {[service.zone, service.city, service.address].filter(Boolean).join(" | ") || "-"}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {[service.phone, service.whatsapp_number].filter(Boolean).join(" / ") || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        service.is_published
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {service.is_published ? "Publicado" : "Borrador"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        service.is_verified
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {service.is_verified ? "Validado" : "Pendiente"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        service.is_active
                          ? "bg-slate-100 text-slate-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {service.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/services/${service.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(service)}
                      disabled={deletingId === service.id || bulkAction !== null}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === service.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay servicios que coincidan con los filtros actuales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ServiceTable;
