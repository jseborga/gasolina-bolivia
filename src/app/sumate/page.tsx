import type { Metadata } from "next";
import { VendorRequestForm } from "@/components/vendor-request-form";

export const metadata: Metadata = {
  title: "Sumate a SurtiMapa | Publica talleres, gruas, auxilio y aditivos",
  description:
    "Solicita unirte a SurtiMapa para publicar talleres mecanicos, gruas, auxilio mecanico, aditivos o estaciones de servicio en La Paz y Bolivia.",
};

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          SurtiMapa Partners
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Suma tu servicio, producto o estacion
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Si ofreces grua, taller, auxilio mecanico, aditivos o quieres registrar
          una estacion, deja tu solicitud. Esta base ya sirve para captacion
          comercial y la siguiente fase es el portal con acceso por proveedor.
        </p>
      </div>

      <VendorRequestForm />
    </main>
  );
}
