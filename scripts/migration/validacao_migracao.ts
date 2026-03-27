/**
 * Validação pós-migração: contagens legado × destino e mapa de IDs.
 *
 *   LEGACY_DATABASE_URL=... TARGET_DATABASE_URL=... npx tsx scripts/migration/validacao_migracao.ts
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import pgPromise, { type IDatabase } from "pg-promise";

dotenv.config();

const pgp = pgPromise({});

function qIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function countTable(db: IDatabase<unknown>, table: string): Promise<number> {
  const row = await db.one<{ c: string }>(
    `SELECT count(*)::text AS c FROM public.${qIdent(table)}`,
  );
  return Number(row.c);
}

async function main() {
  const legacyUrl =
    process.env.LEGACY_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!legacyUrl) {
    console.error("Defina LEGACY_DATABASE_URL ou DATABASE_URL");
    process.exit(1);
  }
  const targetUrl = process.env.TARGET_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!targetUrl) {
    console.error("Defina TARGET_DATABASE_URL ou DATABASE_URL");
    process.exit(1);
  }

  const mappingPath = path.join(process.cwd(), "scripts", "migration", "config", "mapping.json");
  if (!fs.existsSync(mappingPath)) {
    console.error("mapping.json não encontrado — gere a partir do template.");
    process.exit(1);
  }
  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8")) as {
    loadOrder: string[];
    tables: Record<string, { sourceTable: string; targetTable: string; entityType: string }>;
  };

  const ldb = pgp(legacyUrl);
  const tdb = pgp(targetUrl);

  const lines: string[] = [];
  lines.push("# Relatório de validação");
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Etapa lógica | Tabela legado (n) | Tabela sistema (n) | migration_legacy_id_map |");
  lines.push("|--------------|-------------------|----------------------|---------------------------|");

  try {
    for (const key of mapping.loadOrder) {
      const t = mapping.tables[key];
      if (!t) continue;
      const nl = await countTable(ldb, t.sourceTable);
      const nt = await countTable(tdb, t.targetTable);
      const nm = await tdb.one<{ c: string }>(
        `SELECT count(*)::text AS c FROM public.migration_legacy_id_map WHERE entity_type = $1`,
        [mapping.tables[key].entityType],
      );
      lines.push(`| ${key} | ${nl} | ${nt} | ${nm.c} |`);
      console.log(`${key}: legado=${nl} sistema=${nt} map=${nm.c}`);
    }

    const mapTotal = await tdb.one<{ c: string }>(
      `SELECT count(*)::text FROM public.migration_legacy_id_map`,
    );
    console.log(`Total em migration_legacy_id_map: ${mapTotal.c}`);
    lines.push("");
    lines.push(`Total de mapeamentos: ${mapTotal.c}`);

    const outDir = path.join(process.cwd(), "scripts", "migration", "artifacts");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "validacao-report.md"), lines.join("\n"), "utf8");
    console.log(`Relatório MD: ${path.join(outDir, "validacao-report.md")}`);
  } finally {
    await ldb.$pool.end();
    await tdb.$pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
