/**
 * Restaura backup PostgreSQL (formato custom pg_dump ou SQL texto) no Supabase.
 *
 * Uso (PowerShell):
 *   $env:DATABASE_URL = "postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres"
 *   $env:BACKUP_PATH = "E:\caminho\bck.backup"
 *   npx tsx scripts/supabase-restore.ts
 *
 * Ou: npx tsx scripts/supabase-restore.ts "E:\caminho\bck.backup"
 *
 * Modo simples Supabase (substituir tudo em public pelo backup):
 *   No .env: DATABASE_URL, BACKUP_PATH, SUPABASE_RESTORE=1
 *   E pg_restore no PATH ou PG_RESTORE_PATH. Depois: npm run restore:supabase
 *
 * Recomendado: cliente PostgreSQL no PATH (psql, pg_restore).
 * Windows: instalar PostgreSQL ou só "Command Line Tools" e adicionar bin ao PATH.
 *
 * Variáveis opcionais:
 *   BATCH_SIZE=50       — statements por lote (modo SQL sem psql)
 *   PSQL_PATH=...       — caminho absoluto para psql.exe
 *   PG_RESTORE_PATH=... — caminho absoluto para pg_restore.exe
 *   TWO_PHASE=1         — pg_restore em pre-data → data → post-data (FKs/índices)
 *   USE_SESSION_REPLICATION_ROLE=1 — adiciona session_replication_role=replica só em Postgres
 *     self-hosted (em *.supabase.co o script ignora esta variável)
 *   PG_RESTORE_EXIT_ON_ERROR=1 — aborta pg_restore no primeiro erro (padrão: continua)
 *   PG_RESTORE_SKIP_SUPABASE_TOC_FIX=1 — não gera lista TOC sem CREATE SCHEMA public (Supabase já tem public)
 *   PG_RESTORE_FORCE_FILTER_PUBLIC_SCHEMA_TOC=1 — aplica o filtro de TOC mesmo fora do Supabase
 *   PG_RESTORE_CLEAN=1 — pg_restore com --clean --if-exists (remove objetos do dump antes de recriar)
 *   PG_RESTORE_DROP_PUBLIC_SCHEMA=1 — antes do restore: DROP SCHEMA public CASCADE + CREATE public +
 *     grants mínimos (Supabase). Evita erros de ordem em --clean (pg_restore não tem --cascade).
 *   SUPABASE_RESTORE=1 — atalho: força DROP public + PG_RESTORE_CLEAN=0 (só se DATABASE_URL for *.supabase.co)
 *
 * Se aparecer ENOENT em pg_restore.exe: instale o cliente PostgreSQL para Windows ou defina
 * PG_RESTORE_PATH (ex.: "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe").
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import pgPromise from "pg-promise";

dotenv.config();

const pgp = pgPromise({});

const BATCH_SIZE = Math.max(1, parseInt(process.env.BATCH_SIZE || "50", 10));
const TWO_PHASE = process.env.TWO_PHASE === "1";

function isSupabaseHost(databaseUrl: string): boolean {
  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname.endsWith(".supabase.co") || hostname === "supabase.co";
  } catch {
    return false;
  }
}

/** SUPABASE_RESTORE=1: um comando para “substituir public pelo backup” sem --clean. */
function applySupabaseRestorePreset(databaseUrl: string): void {
  if (process.env.SUPABASE_RESTORE !== "1") return;
  if (!isSupabaseHost(databaseUrl)) {
    console.warn("SUPABASE_RESTORE=1 ignorado: DATABASE_URL não aponta para *.supabase.co.");
    return;
  }
  process.env.PG_RESTORE_CLEAN = "0";
  if (process.env.PG_RESTORE_DROP_PUBLIC_SCHEMA !== "0") {
    process.env.PG_RESTORE_DROP_PUBLIC_SCHEMA = "1";
  }
  console.log(
    "SUPABASE_RESTORE=1: DROP public + restore sem --clean (conteúdo anterior em public é apagado).",
  );
}

/** Remove do TOC a entrada SCHEMA public (o Supabase já cria public). */
function shouldFilterPublicSchemaToc(databaseUrl: string): boolean {
  if (process.env.PG_RESTORE_SKIP_SUPABASE_TOC_FIX === "1") return false;
  if (process.env.PG_RESTORE_FORCE_FILTER_PUBLIC_SCHEMA_TOC === "1") return true;
  return isSupabaseHost(databaseUrl);
}

/**
 * Linha do `pg_restore -l` que corresponde a CREATE SCHEMA public.
 * Formato típico: `6; 2615 2200 SCHEMA public postgres` (só um `;` antes dos campos em espaço).
 */
function isTocCreateSchemaPublicLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith(";") || trimmed === "") return false;
  const firstSemi = trimmed.indexOf(";");
  if (firstSemi < 0) return false;
  const rest = trimmed.slice(firstSemi + 1).trim();
  const tokens = rest.split(/\s+/).filter(Boolean);
  const i = tokens.indexOf("SCHEMA");
  if (i < 0) return false;
  const after = tokens.slice(i + 1);
  if (after[0] === "-" && after[1] === "public") return true;
  if (after[0] === "public") return true;
  return false;
}

function filterTocExcludeCreatePublicSchema(tocContent: string): { text: string; removed: number } {
  const lines = tocContent.split(/\r?\n/);
  const out: string[] = [];
  let removed = 0;
  for (const line of lines) {
    if (isTocCreateSchemaPublicLine(line)) {
      removed++;
      continue;
    }
    out.push(line);
  }
  return { text: out.join("\n"), removed };
}

function captureTocList(pgRestoreBin: string, backupPath: string): string {
  const r = spawnSync(pgRestoreBin, ["-l", path.resolve(backupPath)], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error((r.stderr as string) || `pg_restore -l terminou com código ${r.status}`);
  }
  return r.stdout ?? "";
}

function tryBuildFilteredTocList(
  databaseUrl: string,
  pgRestoreBin: string,
  backupPath: string,
): string | null {
  if (!shouldFilterPublicSchemaToc(databaseUrl)) return null;
  try {
    const raw = captureTocList(pgRestoreBin, backupPath);
    const { text, removed } = filterTocExcludeCreatePublicSchema(raw);
    if (removed === 0) {
      console.log("TOC: nenhuma entrada SCHEMA public encontrada (nada a filtrar).");
      return null;
    }
    const tmp = path.join(os.tmpdir(), `pg_restore_toc_${Date.now()}.lst`);
    fs.writeFileSync(tmp, text, "utf8");
    console.log(
      `TOC: lista filtrada (${removed} entrada(s) SCHEMA public removida(s)) → ${tmp}`,
    );
    return tmp;
  } catch (e) {
    console.warn("Aviso: não foi possível gerar TOC filtrado; restore completo.", e);
    return null;
  }
}

/**
 * `session_replication_role` só é seguro em Postgres self-hosted com permissões adequadas.
 * O Supabase rejeita este parâmetro — ignoramos USE_SESSION_REPLICATION_ROLE mesmo que esteja no .env.
 */
function shouldUseSessionReplicationRole(databaseUrl: string): boolean {
  if (isSupabaseHost(databaseUrl)) {
    if (process.env.USE_SESSION_REPLICATION_ROLE === "1") {
      console.warn(
        "Ignorando USE_SESSION_REPLICATION_ROLE (definido no ambiente): o Supabase não permite session_replication_role.",
      );
    }
    return false;
  }
  return process.env.USE_SESSION_REPLICATION_ROLE === "1";
}

/** Desativa RLS na sessão; opcionalmente réplica (triggers) para Postgres com permissão. Timeouts relaxados. */
function pgRestoreEnv(useSessionReplicationRole: boolean): NodeJS.ProcessEnv {
  const parts = [
    "-c row_security=off",
    "-c statement_timeout=0",
    "-c lock_timeout=0",
  ];
  if (useSessionReplicationRole) {
    parts.push("-c session_replication_role=replica");
  }
  return { PGOPTIONS: parts.join(" ") };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    console.error(`Defina a variável de ambiente ${name}.`);
    process.exit(1);
  }
  return v.trim();
}

function detectBackupFormat(filePath: string): "custom" | "plain" {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(5);
    const n = fs.readSync(fd, buf, 0, 5, 0);
    if (n >= 5 && buf.toString("ascii", 0, 5) === "PGDMP") return "custom";
    return "plain";
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Divisor de statements por ';' fora de aspas simples e blocos $$...$$.
 * Dumps com PL/pgSQL muito aninhado: use psql -f (recomendado).
 */
function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let i = 0;
  let buf = "";
  let inSq = false;
  let dollarTag: string | null = null;

  const startsDollar = (pos: number): string | null => {
    if (sql[pos] !== "$") return null;
    const m = sql.slice(pos).match(/^\$([a-zA-Z_]*)\$/);
    return m ? m[0] : null;
  };

  while (i < sql.length) {
    const ch = sql[i];

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    if (!inSq) {
      const tag = startsDollar(i);
      if (tag) {
        buf += tag;
        i += tag.length;
        dollarTag = tag;
        continue;
      }
    }

    if (ch === "'" && !inSq) {
      inSq = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "'" && inSq) {
      if (sql[i + 1] === "'") {
        buf += "''";
        i += 2;
        continue;
      }
      inSq = false;
      buf += ch;
      i++;
      continue;
    }

    if (!inSq && ch === ";") {
      const stmt = buf.trim();
      if (stmt.length) out.push(stmt);
      buf = "";
      i++;
      continue;
    }

    buf += ch;
    i++;
  }
  const tail = buf.trim();
  if (tail.length) out.push(tail);
  return out;
}

function findOnPath(exe: string): string | null {
  const key = process.platform === "win32" ? "Path" : "PATH";
  const paths = (process.env[key] || "").split(path.delimiter);
  for (const p of paths) {
    if (!p) continue;
    const full = path.join(p, exe);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/** Windows: primeiro resultado de `where.exe nome.exe` (PATH do sistema). */
function whereWindows(exe: string): string | null {
  if (process.platform !== "win32") return null;
  const r = spawnSync("where.exe", [exe], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout?.trim()) return null;
  const first = r.stdout.trim().split(/\r?\n/)[0]?.trim();
  if (first && fs.existsSync(first)) return first;
  return null;
}

/** Windows: C:\\Program Files\\PostgreSQL\\<versão>\\bin\\<exe> (prefere versão mais recente). */
function findInProgramFilesPostgreSQL(exe: string): string | null {
  if (process.platform !== "win32") return null;
  const roots = [
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "PostgreSQL"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "PostgreSQL"),
  ];
  const candidates: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    let names: string[];
    try {
      names = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of names) {
      const bin = path.join(root, name, "bin", exe);
      if (fs.existsSync(bin)) candidates.push(bin);
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const va = path.basename(path.dirname(path.dirname(a)));
    const vb = path.basename(path.dirname(path.dirname(b)));
    return vb.localeCompare(va, undefined, { numeric: true, sensitivity: "base" });
  });
  return candidates[0] ?? null;
}

/** Caminho absoluto do executável, ou null se não existir em PATH / instalação típica. */
function findPgToolExecutable(envPath: string | undefined, winExe: string, unixExe: string): string | null {
  const exe = process.platform === "win32" ? winExe : unixExe;
  if (envPath?.trim() && fs.existsSync(envPath.trim())) return path.resolve(envPath.trim());
  const found = findOnPath(exe);
  if (found) return found;
  if (process.platform === "win32") {
    const w = whereWindows(exe);
    if (w) return w;
    const pg = findInProgramFilesPostgreSQL(exe);
    if (pg) return pg;
  }
  return null;
}

function requirePgTool(envName: string, winExe: string, unixExe: string): string {
  const resolved = findPgToolExecutable(process.env[envName], winExe, unixExe);
  if (resolved) return resolved;
  const label = process.platform === "win32" ? winExe : unixExe;
  const example = `C:\\Program Files\\PostgreSQL\\16\\bin\\${label}`;
  console.error(
    [
      `Não foi possível localizar ${label}.`,
      "",
      "Opções:",
      `  1) Instale o PostgreSQL para Windows: https://www.postgresql.org/download/windows/`,
      `     (marque "Command Line Tools" ou instalação completa).`,
      `  2) Defina o caminho completo, por exemplo:`,
      `     $env:${envName} = "${example}"`,
      "",
      `Depois confira no PowerShell: & "${example}" --version`,
    ].join("\n"),
  );
  process.exit(1);
}

function runExternal(cmd: string, args: string[], extraEnv: NodeJS.ProcessEnv): void {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: false,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

/**
 * Esvazia `public` antes do restore (substitui a necessidade de CASCADE no DROP do pg_restore,
 * que não existe em pg_restore — só --clean --if-exists).
 */
async function dropAndRecreatePublicSchemaIfRequested(databaseUrl: string): Promise<void> {
  if (process.env.PG_RESTORE_DROP_PUBLIC_SCHEMA !== "1") return;
  console.log(
    "PG_RESTORE_DROP_PUBLIC_SCHEMA: DROP SCHEMA public CASCADE + CREATE public + grants (apaga tudo em public).",
  );
  const db = pgp(databaseUrl);
  const supa = isSupabaseHost(databaseUrl);
  await db.tx(async (t) => {
    await t.none("DROP SCHEMA IF EXISTS public CASCADE");
    await t.none("CREATE SCHEMA public");
    if (supa) {
      await t.none("GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role");
      await t.none(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role",
      );
      await t.none(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role",
      );
      await t.none(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role",
      );
    } else {
      await t.none("GRANT ALL ON SCHEMA public TO postgres");
      await t.none("GRANT ALL ON SCHEMA public TO public");
    }
  });
}

function pgRestore(
  databaseUrl: string,
  backupPath: string,
  extraArgs: string[],
  useSessionReplicationRole: boolean,
  tocListPath: string | null,
  pgRestoreBin: string,
): void {
  const strictExit = process.env.PG_RESTORE_EXIT_ON_ERROR === "1";
  const useClean = process.env.PG_RESTORE_CLEAN === "1";
  const args = [
    "--verbose",
    "--no-owner",
    "--no-acl",
    ...(useClean ? ["--clean", "--if-exists"] : []),
    ...(strictExit ? ["--exit-on-error"] : []),
    ...(tocListPath ? ["-L", tocListPath] : []),
    "-d",
    databaseUrl,
    ...extraArgs,
    path.resolve(backupPath),
  ];
  runExternal(pgRestoreBin, args, pgRestoreEnv(useSessionReplicationRole));
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const backupPath = process.argv[2] || process.env.BACKUP_PATH;
  if (!backupPath) {
    console.error(
      'Informe o arquivo: variável BACKUP_PATH ou argumento: npx tsx scripts/supabase-restore.ts "<arquivo>"',
    );
    process.exit(1);
  }
  if (!fs.existsSync(backupPath)) {
    console.error(`Arquivo não encontrado: ${backupPath}`);
    process.exit(1);
  }

  applySupabaseRestorePreset(databaseUrl);

  const fmt = detectBackupFormat(backupPath);
  const useSrr = shouldUseSessionReplicationRole(databaseUrl);

  console.log(`Formato detectado: ${fmt === "custom" ? "custom (pg_dump -Fc)" : "SQL texto"}`);
  console.log(
    useSrr
      ? "Sessão: row_security=off, session_replication_role=replica, timeouts desativados."
      : "Sessão: row_security=off, timeouts desativados (sem session_replication_role; triggers ativos).",
  );

  try {
    if (fmt === "custom") {
      const abs = path.resolve(backupPath);
      await dropAndRecreatePublicSchemaIfRequested(databaseUrl);
      const pgRestoreBin = requirePgTool("PG_RESTORE_PATH", "pg_restore.exe", "pg_restore");
      let tocListPath: string | null = null;
      try {
        tocListPath = tryBuildFilteredTocList(databaseUrl, pgRestoreBin, abs);
        if (TWO_PHASE) {
          console.log("Fase 1/3: pre-data (esquema)...");
          pgRestore(databaseUrl, abs, ["--section=pre-data"], useSrr, tocListPath, pgRestoreBin);
          console.log("Fase 2/3: data...");
          pgRestore(databaseUrl, abs, ["--section=data"], useSrr, tocListPath, pgRestoreBin);
          console.log("Fase 3/3: post-data (índices, FKs, etc.)...");
          pgRestore(databaseUrl, abs, ["--section=post-data"], useSrr, tocListPath, pgRestoreBin);
        } else {
          console.log("Restaurando (pg_restore único — use TWO_PHASE=1 se houver erro de FK/ordem)...");
          pgRestore(databaseUrl, abs, [], useSrr, tocListPath, pgRestoreBin);
        }
      } finally {
        if (tocListPath) {
          try {
            fs.unlinkSync(tocListPath);
          } catch {
            /* ignore */
          }
        }
      }
    } else {
      const psqlCmd = findPgToolExecutable(process.env.PSQL_PATH, "psql.exe", "psql");

      if (psqlCmd) {
        const absBackup = path.resolve(backupPath);
        const wrapperPath = path.join(os.tmpdir(), `supabase_restore_${Date.now()}.sql`);
        const forPsqli = absBackup.replace(/\\/g, "/").replace(/'/g, "''");
        const header = [
          "SET row_security = off;",
          ...(useSrr ? ["SET session_replication_role = replica;"] : []),
          "SET statement_timeout = 0;",
          "SET lock_timeout = 0;",
          `\\i '${forPsqli}'`,
          "",
        ].join("\n");
        fs.writeFileSync(wrapperPath, header, "utf8");
        console.log(`Restaurando via psql (${psqlCmd}) + wrapper em ${wrapperPath}`);
        try {
          runExternal(psqlCmd, ["-v", "ON_ERROR_STOP=1", "-d", databaseUrl, "-f", wrapperPath], pgRestoreEnv(useSrr));
        } finally {
          try {
            fs.unlinkSync(wrapperPath);
          } catch {
            /* ignore */
          }
        }
      } else {
        console.warn(
          "psql não encontrado no PATH. Executando SQL em lotes via Node (instale o cliente PostgreSQL para dumps grandes).",
        );
        const db = pgp(databaseUrl);
        const sql = fs.readFileSync(backupPath, "utf8");
        const stmts = splitSqlStatements(sql).filter((s) => {
          const t = s.trim();
          if (!t.length) return false;
          if (t.startsWith("\\")) {
            console.warn("Ignorando comando meta psql (\\...). Instale psql ou converta o dump.");
            return false;
          }
          return true;
        });

        await db.tx(async (t) => {
          await t.none("SET row_security = off");
          if (useSrr) {
            await t.none("SET session_replication_role = replica");
          }
          await t.none("SET statement_timeout = 0");
          await t.none("SET lock_timeout = 0");

          for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
            const chunk = stmts.slice(i, i + BATCH_SIZE);
            await t.tx(async (t2) => {
              for (const st of chunk) {
                await t2.none(st);
              }
            });
            const done = Math.min(i + BATCH_SIZE, stmts.length);
            if (done % (BATCH_SIZE * 20) === 0 || done === stmts.length) {
              console.log(`Statements executados: ${done} / ${stmts.length}`);
            }
          }
        });
        console.log("Restauração em lotes concluída.");
      }
    }
  } finally {
    await pgp.end();
  }

  console.log("Concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
