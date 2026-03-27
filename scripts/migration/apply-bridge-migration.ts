/**
 * Aplica supabase/migrations/20260329200000_migration_legacy_bridge.sql no destino.
 * TARGET_DATABASE_URL ou DATABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import pgPromise from "pg-promise";

dotenv.config();

const pgp = pgPromise();

async function main() {
  const url = process.env.TARGET_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("Defina TARGET_DATABASE_URL ou DATABASE_URL no .env");
    process.exit(1);
  }

  const file = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260329200000_migration_legacy_bridge.sql",
  );
  if (!fs.existsSync(file)) {
    console.error(`Ficheiro não encontrado: ${file}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(file, "utf8");
  const db = pgp(url);
  try {
    await db.none(sql);
    console.log("Migration 20260329200000_migration_legacy_bridge aplicada com sucesso.");
  } finally {
    await pgp.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
