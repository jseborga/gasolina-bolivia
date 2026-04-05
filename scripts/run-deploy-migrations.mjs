import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase");

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
const autoRun = (process.env.AUTO_RUN_MIGRATIONS || "true").toLowerCase() !== "false";
const allowBootstrap =
  (process.env.AUTO_BOOTSTRAP_MIGRATIONS || "true").toLowerCase() !== "false";

function log(message) {
  process.stdout.write(`[migrations] ${message}\n`);
}

function getDirective(sql) {
  const match = sql.match(/^\s*--\s*deploy:(auto|bootstrap|manual)\s*$/m);
  return match?.[1] ?? "manual";
}

function checksum(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = $1
      ) as exists
    `,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists public.app_deploy_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function getAppliedMigration(client, filename) {
  const result = await client.query(
    `select filename, checksum from public.app_deploy_migrations where filename = $1`,
    [filename]
  );

  return result.rows[0] ?? null;
}

async function recordMigration(client, filename, hash) {
  await client.query(
    `
      insert into public.app_deploy_migrations (filename, checksum)
      values ($1, $2)
      on conflict (filename) do update
      set checksum = excluded.checksum,
          applied_at = now()
    `,
    [filename, hash]
  );
}

async function shouldRunBootstrap(client) {
  const [hasStations, hasReports] = await Promise.all([
    tableExists(client, "stations"),
    tableExists(client, "reports"),
  ]);

  if (!hasStations && !hasReports) {
    return true;
  }

  log("Se omite bootstrap porque ya existen tablas base.");
  return false;
}

async function run() {
  if (!autoRun) {
    log("AUTO_RUN_MIGRATIONS=false, se omiten migraciones.");
    return;
  }

  if (!dbUrl) {
    log("No hay SUPABASE_DB_URL ni DATABASE_URL, se omiten migraciones.");
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b, "en"));

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = await readFile(fullPath, "utf8");
      const directive = getDirective(sql);
      const hash = checksum(sql);
      const applied = await getAppliedMigration(client, file);

      if (applied) {
        if (applied.checksum !== hash) {
          throw new Error(
            `La migración ${file} ya fue aplicada pero su contenido cambió.`
          );
        }

        log(`Ya aplicada: ${file}`);
        continue;
      }

      if (directive === "manual") {
        log(`Se omite ${file} por estar marcada como manual.`);
        continue;
      }

      if (directive === "bootstrap") {
        if (!allowBootstrap) {
          log(`Se omite bootstrap ${file} porque AUTO_BOOTSTRAP_MIGRATIONS=false.`);
          continue;
        }

        const bootstrapNeeded = await shouldRunBootstrap(client);
        if (!bootstrapNeeded) {
          continue;
        }
      }

      log(`Aplicando ${file}...`);
      await client.query("begin");

      try {
        await client.query(sql);
        await recordMigration(client, file, hash);
        await client.query("commit");
        log(`Aplicada: ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    log("Migraciones completadas.");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("[migrations] Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
