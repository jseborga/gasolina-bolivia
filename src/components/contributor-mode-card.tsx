"use client";

import { getAppProfileRoleLabel } from "@/lib/parking";
import type { AppProfileRole } from "@/lib/types";

type ContributorProfileSummary = {
  credit_balance: number;
  full_name: string;
  id: number;
  reliability_score: number;
  role: AppProfileRole;
};

type Props = {
  error: string | null;
  loading: boolean;
  onActivate: () => void;
  onClear: () => void;
  onTokenChange: (value: string) => void;
  profile: ContributorProfileSummary | null;
  token: string;
};

export function ContributorModeCard({
  error,
  loading,
  onActivate,
  onClear,
  onTokenChange,
  profile,
  token,
}: Props) {
  return (
    <section className="rounded-[1.8rem] border border-emerald-200 bg-emerald-50/85 p-4 shadow-[0_18px_42px_rgba(16,185,129,0.12)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Modo registrador
          </p>
          <p className="mt-1 text-sm text-emerald-950">
            Usa tu token operativo para que los aportes validados sumen creditos.
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            El sistema marca duplicados y no acredita automaticamente: primero pasan por revision.
          </p>
        </div>

        {profile ? (
          <div className="rounded-2xl border border-emerald-300 bg-white/80 px-4 py-3 text-sm text-emerald-950">
            <div className="font-semibold">{profile.full_name}</div>
            <div className="text-xs text-emerald-800">{getAppProfileRoleLabel(profile.role)}</div>
            <div className="mt-2 text-xs">
              Creditos: {profile.credit_balance} | Confiabilidad: {profile.reliability_score}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={token}
          onChange={(event) => onTokenChange(event.target.value)}
          placeholder="Pega tu token de colaborador"
          className="flex-1 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onActivate}
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? "Validando..." : profile ? "Actualizar token" : "Activar"}
          </button>
          {profile ? (
            <button
              type="button"
              disabled={loading}
              onClick={onClear}
              className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-medium text-emerald-800 hover:bg-white disabled:opacity-60"
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}

export default ContributorModeCard;
