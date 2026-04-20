/**
 * ETL: banco LEGADO → banco SISTEMA (Supabase/Postgres).
 *
 * Pré-requisitos:
 *   1) Aplicar supabase/migrations/20260329200000_migration_legacy_bridge.sql no DESTINO
 *   2) Gerar scripts/migration/config/mapping.json a partir de mapping.template.json + introspecção
 *   3) Variáveis de ambiente:
 *        LEGACY_DATABASE_URL  — conexão somente leitura recomendada
 *        TARGET_DATABASE_URL ou DATABASE_URL — destino (service role / postgres)
 *
 * Uso:
 *   npx tsx scripts/migration/migracao_legado_para_sistema.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import pgPromise, { type IDatabase } from "pg-promise";
import type { MigrationMappingFile, TableMappingConfig } from "./lib/mapping-types.ts";
import { applyTransform } from "./lib/transforms.ts";

dotenv.config();

const pgp = pgPromise({
  // Garante que strings chegam como UTF-8 independente do encoding do servidor legado.
  // Sem isso, bancos WIN1252/LATIN1 enviam bytes que Node.js interpreta errado → mojibake.
  connect(client) {
    client.query("SET client_encoding TO 'UTF8'");
  },
});

const DRY = process.argv.includes("--dry-run");

function loadMapping(): MigrationMappingFile {
  const p = path.join(process.cwd(), "scripts", "migration", "config", "mapping.json");
  if (!fs.existsSync(p)) {
    console.error(
      `Crie ${p} a partir de mapping.template.json (veja docs/plano_migracao.md).`,
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as MigrationMappingFile;
}

async function resolveFk(
  tdb: IDatabase<unknown>,
  entityType: string,
  legacyId: unknown,
): Promise<number | null> {
  if (legacyId == null) return null;
  const id = Number(legacyId);
  if (Number.isNaN(id)) return null;
  const row = await tdb.oneOrNone<{ new_id: string }>(
    `SELECT new_id::text FROM public.migration_legacy_id_map WHERE entity_type = $1 AND legacy_id = $2`,
    [entityType, id],
  );
  return row ? Number(row.new_id) : null;
}

async function logRun(
  tdb: IDatabase<unknown>,
  phase: string,
  status: string,
  message: string,
  rows: number | null,
) {
  await tdb.none(
    `INSERT INTO public.migration_run_log (phase, status, message, rows_affected, finished_at)
     VALUES ($1, $2, $3, $4, now())`,
    [phase, status, message, rows],
  );
}

function qIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function migrateTable(
  ldb: IDatabase<unknown>,
  tdb: IDatabase<unknown>,
  key: string,
  cfg: TableMappingConfig,
) {
  const phase = `table:${key}`;
  await logRun(tdb, phase, "started", cfg.sourceTable, null);

  let whereClause = "";
  if (cfg.where) {
    whereClause = ` WHERE ${cfg.where}`;
  }

  const rows = await ldb.manyOrNone<Record<string, unknown>>(
    `SELECT * FROM public.${qIdent(cfg.sourceTable)}${whereClause}`,
  );

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const legacyPkVal = row[cfg.sourcePk];
    if (legacyPkVal == null) {
      skipped++;
      continue;
    }

    const existing = await tdb.oneOrNone<{ id: number }>(
      `SELECT id FROM public.migration_legacy_id_map WHERE entity_type = $1 AND legacy_id = $2`,
      [cfg.entityType, Number(legacyPkVal)],
    );
    if (existing) {
      skipped++;
      continue;
    }

    const payload: Record<string, unknown> = { ...cfg.defaults };

    for (const cm of cfg.columns) {
      const raw = row[cm.source];
      payload[cm.target] = applyTransform(raw, cm.transform, row);
    }

    if (cfg.foreignKeys) {
      for (const fk of cfg.foreignKeys) {
        const nid = await resolveFk(tdb, fk.mapsFromEntity, row[fk.sourceColumn]);
        if (nid == null) {
          throw new Error(
            `FK não resolvida: ${cfg.sourceTable}.${fk.sourceColumn}=${row[fk.sourceColumn]} → ${fk.mapsFromEntity}`,
          );
        }
        payload[fk.targetColumn] = nid;
      }
    }

    const targetCols = Object.keys(payload).filter((k) => payload[k] !== undefined);
    const values = targetCols.map((k) => payload[k]);

    if (DRY) {
      console.log(`[dry-run] ${cfg.targetTable} legacy ${cfg.sourcePk}=${legacyPkVal}`, payload);
      inserted++;
      continue;
    }

    await tdb.tx(async (tx) => {
      const placeholders = targetCols.map((_, i) => `$${i + 1}`).join(", ");
      const newRow = await tx.one<{ id: number }>(
        `INSERT INTO public.${qIdent(cfg.targetTable)} (${targetCols.map((c) => qIdent(c)).join(", ")})
         VALUES (${placeholders})
         RETURNING id`,
        values,
      );

      await tx.none(
        `INSERT INTO public.migration_legacy_id_map (entity_type, legacy_id, new_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (entity_type, legacy_id) DO NOTHING`,
        [cfg.entityType, Number(legacyPkVal), newRow.id],
      );

      if (cfg.legacyColumnOnTarget) {
        await tx.none(
          `UPDATE public.${qIdent(cfg.targetTable)} SET ${qIdent(cfg.legacyColumnOnTarget)} = $2 WHERE id = $1`,
          [newRow.id, Number(legacyPkVal)],
        );
      }
    });

    inserted++;
  }

  await logRun(tdb, phase, "ok", `inserted=${inserted} skipped=${skipped}`, inserted);
  console.log(`✓ ${key}: inseridos ${inserted}, ignorados ${skipped}`);
}

async function main() {
  const targetUrl = process.env.TARGET_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  const legacyUrl =
    process.env.LEGACY_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!legacyUrl) {
    console.error("Defina LEGACY_DATABASE_URL ou DATABASE_URL (origem dos dados legados).");
    process.exit(1);
  }
  if (!targetUrl) {
    console.error("Defina TARGET_DATABASE_URL ou DATABASE_URL (destino).");
    process.exit(1);
  }
  if (legacyUrl === targetUrl) {
    console.warn(
      "LEGACY e TARGET são a mesma URL — útil só se legado e sistema estiverem no mesmo DB (dry-run/teste).",
    );
  }

  const mapping = loadMapping();
  const ldb = pgp(legacyUrl);
  const tdb = legacyUrl === targetUrl ? ldb : pgp(targetUrl);

  console.log(DRY ? "MODO DRY-RUN (sem INSERT)" : "MODO ESCRITA");
  await logRun(tdb, "etl", "started", "início", null);

  try {
    for (const key of mapping.loadOrder) {
      const cfg = mapping.tables[key];
      if (!cfg) {
        console.warn(`loadOrder referencia "${key}" sem entrada em tables — ignorando.`);
        continue;
      }
      await migrateTable(ldb, tdb, key, cfg);
    }
    await logRun(tdb, "etl", "ok", "concluído", null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun(tdb, "etl", "error", msg, null);
    throw e;
  } finally {
    await ldb.$pool.end();
    if (legacyUrl !== targetUrl) {
      await tdb.$pool.end();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
