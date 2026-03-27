/**
 * Gera snapshots JSON do schema (legado e/ou sistema).
 *
 * Uso:
 *   LEGACY_DATABASE_URL=... TARGET_DATABASE_URL=... npx tsx scripts/migration/schema-introspect.ts
 *
 * Saída: scripts/migration/artifacts/legacy-schema.json e target-schema.json
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { introspectSchema } from "./lib/introspect.ts";

dotenv.config();

const outDir = path.join(process.cwd(), "scripts", "migration", "artifacts");

async function main() {
  const targetUrl = process.env.TARGET_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  let legacyUrl = process.env.LEGACY_DATABASE_URL?.trim();
  if (!legacyUrl && targetUrl) {
    legacyUrl = targetUrl;
    console.warn(
      "LEGACY_DATABASE_URL não definido — usando o mesmo destino que TARGET/DATABASE_URL (ficheiros legacy e target serão iguais).",
    );
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  if (legacyUrl) {
    console.log("Introspecção LEGACY...");
    const snap = await introspectSchema(legacyUrl, "legacy");
    fs.writeFileSync(path.join(outDir, "legacy-schema.json"), JSON.stringify(snap, null, 2), "utf8");
    console.log(`Escrito: ${path.join(outDir, "legacy-schema.json")} (${snap.tables.length} tabelas)`);
  } else {
    console.warn("LEGACY_DATABASE_URL não definido — pulando legado.");
  }

  if (targetUrl) {
    console.log("Introspecção TARGET (sistema)...");
    const snap = await introspectSchema(targetUrl, "target");
    fs.writeFileSync(path.join(outDir, "target-schema.json"), JSON.stringify(snap, null, 2), "utf8");
    console.log(`Escrito: ${path.join(outDir, "target-schema.json")} (${snap.tables.length} tabelas)`);
  } else {
    console.warn("TARGET_DATABASE_URL / DATABASE_URL não definido — pulando destino.");
  }

  if (!legacyUrl && !targetUrl) {
    console.error("Defina TARGET_DATABASE_URL ou DATABASE_URL (e opcionalmente LEGACY_DATABASE_URL).");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
