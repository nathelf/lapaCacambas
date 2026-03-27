/**
 * Compara legacy-schema.json × target-schema.json e gera relatório Markdown.
 *
 * Pré-requisito: rodar schema-introspect.ts antes.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { SchemaSnapshot } from "./lib/introspect.ts";

const artifacts = path.join(process.cwd(), "scripts", "migration", "artifacts");

function load(name: string): SchemaSnapshot {
  const p = path.join(artifacts, name);
  if (!fs.existsSync(p)) {
    throw new Error(`Arquivo não encontrado: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as SchemaSnapshot;
}

function colsByTable(snap: SchemaSnapshot): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const c of snap.columns) {
    if (!m.has(c.table_name)) m.set(c.table_name, new Set());
    m.get(c.table_name)!.add(c.column_name);
  }
  return m;
}

function main() {
  const legacy = load("legacy-schema.json");
  const target = load("target-schema.json");

  const L = new Set(legacy.tables);
  const T = new Set(target.tables);

  const onlyLegacy = [...L].filter((t) => !T.has(t)).sort();
  const onlyTarget = [...T].filter((t) => !L.has(t)).sort();
  const both = [...L].filter((t) => T.has(t)).sort();

  const lc = colsByTable(legacy);
  const tc = colsByTable(target);

  const lines: string[] = [];
  lines.push(`# Comparação automática de schemas`);
  lines.push(`- Legado gerado em: ${legacy.generatedAt}`);
  lines.push(`- Sistema gerado em: ${target.generatedAt}`);
  lines.push("");
  lines.push(`## Resumo`);
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---------|-------|`);
  lines.push(`| Tabelas só no legado | ${onlyLegacy.length} |`);
  lines.push(`| Tabelas só no sistema | ${onlyTarget.length} |`);
  lines.push(`| Tabelas em ambos | ${both.length} |`);
  lines.push("");
  lines.push(`### Só no legado`);
  lines.push(onlyLegacy.map((t) => `- \`${t}\``).join("\n") || "(nenhuma)");
  lines.push("");
  lines.push(`### Só no sistema`);
  lines.push(onlyTarget.map((t) => `- \`${t}\``).join("\n") || "(nenhuma)");
  lines.push("");
  lines.push(`## Colunas: tabelas homônimas`);
  for (const table of both) {
    const a = lc.get(table) ?? new Set();
    const b = tc.get(table) ?? new Set();
    const onlyA = [...a].filter((c) => !b.has(c)).sort();
    const onlyB = [...b].filter((c) => !a.has(c)).sort();
    if (onlyA.length === 0 && onlyB.length === 0) continue;
    lines.push(`### \`${table}\``);
    if (onlyA.length) {
      lines.push(`- Só legado: ${onlyA.map((x) => `\`${x}\``).join(", ")}`);
    }
    if (onlyB.length) {
      lines.push(`- Só sistema: ${onlyB.map((x) => `\`${x}\``).join(", ")}`);
    }
    lines.push("");
  }

  const outPath = path.join(artifacts, "compare-report.md");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Relatório: ${outPath}`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
