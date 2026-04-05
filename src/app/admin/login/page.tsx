import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOptionalAdminSession, sanitizeAdminNextPath } from '@/lib/admin-auth';

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeAdminNextPath(params.next);
  const session = await getOptionalAdminSession();

  if (session) {
    redirect(next);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Acceso interno
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Ingresar al admin</h2>
        <p className="mt-2 text-sm text-slate-600">
          Usa un usuario de Supabase Auth habilitado en <code>ADMIN_EMAILS</code>.
        </p>
      </div>

      {params.error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      <form action="/api/admin/login" method="post" className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Correo</span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            placeholder="admin@tuempresa.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            name="password"
            required
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            placeholder="••••••••"
          />
        </label>

        <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
          Entrar
        </button>
      </form>

      <div className="mt-5 text-sm text-slate-500">
        <Link href="/" className="text-slate-700 hover:text-slate-900">
          Volver a la app pública
        </Link>
      </div>
    </div>
  );
}
