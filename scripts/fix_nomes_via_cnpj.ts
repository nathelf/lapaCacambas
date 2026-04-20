/**
 * SCRIPT: Recuperar razão social correta via CNPJ (Receita Federal)
 *
 * Problema: dados migrados do sistema legado têm '?' onde havia caracteres acentuados.
 * Ex: "LOXII LOCA??O E SERVI?OS LTDA." (correto: "LOXII LOCAÇÃO E SERVIÇOS LTDA.")
 *
 * Solução: buscar a razão social real via CNPJ na API pública da Receita Federal.
 *
 * Uso:
 *   npx tsx scripts/fix_nomes_via_cnpj.ts [--dry-run] [--limit=50]
 *
 * Pré-requisitos:
 *   - Variável DATABASE_URL ou TARGET_DATABASE_URL configurada no .env
 *   - Acesso à internet para consultar a API da Receita Federal
 *
 * Limitações:
 *   - A API pública (receitaws.com.br) tem rate limiting (~3 req/s)
 *   - Clientes PF (CPF) não podem ser recuperados por este método
 *   - CNPJ deve estar cadastrado no banco para a consulta funcionar
 */
import 'dotenv/config';
import pgPromise from 'pg-promise';
import process from 'node:process';

const DRY  = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : 200;
const DELAY_MS = 400; // respeitoso com a API pública (~2.5 req/s)

const pgp = pgPromise({});

interface ClienteRow {
  id: number;
  nome: string;
  fantasia: string | null;
  cnpj: string | null;
}

interface ReceitaResponse {
  status: string;
  nome?: string;
  fantasia?: string;
  message?: string;
}

/** Remove pontuação do CNPJ: "12.345.678/0001-90" → "12345678000190" */
function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/** Consulta a API da Receita Federal via receitaws.com.br */
async function consultarCNPJ(cnpj: string): Promise<ReceitaResponse | null> {
  const clean = cleanCNPJ(cnpj);
  if (clean.length !== 14) return null;

  try {
    const url = `https://receitaws.com.br/v1/cnpj/${clean}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json() as ReceitaResponse;
  } catch {
    return null;
  }
}

/** Aguarda N millisegundos */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Verifica se o texto está corrompido (contém U+FFFD ◆ ou '?' suspeito) */
function parece_corrompido(nome: string): boolean {
  // U+FFFD = replacement character ◆ — sinal inequívoco de encoding quebrado
  if (nome.includes('\uFFFD')) return true;
  // '?' isolado entre letras = sinal de caractere acentuado perdido
  return /[A-ZÀÂÃÁÉÊÍÓÔÕÚÜÇ]\?[A-ZÀÂÃÁÉÊÍÓÔÕÚÜÇ]/i.test(nome) ||
         /\?\?/.test(nome);
}

async function main() {
  const dbUrl = process.env.TARGET_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error('Defina TARGET_DATABASE_URL ou DATABASE_URL no .env');
    process.exit(1);
  }

  const db = pgp(dbUrl);

  const FFFD = '\uFFFD';  // U+FFFD = replacement character ◆

  // Busca clientes com nome corrompido E que têm CNPJ
  const clientes = await db.manyOrNone<ClienteRow>(
    `SELECT id, nome, fantasia, cnpj
     FROM clientes
     WHERE cnpj IS NOT NULL AND cnpj <> ''
       AND (
         nome     LIKE '%' || chr(65533) || '%'  -- U+FFFD ◆
         OR nome  LIKE '%?%'                      -- ? literal
         OR fantasia LIKE '%' || chr(65533) || '%'
         OR fantasia LIKE '%?%'
       )
     ORDER BY id
     LIMIT $1`,
    [LIMIT]
  );
  void FFFD;

  console.log(`Encontrados ${clientes.length} clientes PJ com nome possivelmente corrompido.`);
  if (clientes.length === 0) {
    console.log('Nenhum cliente para corrigir. Encerrando.');
    process.exit(0);
  }

  let corrigidos = 0;
  let nao_encontrados = 0;
  let erros = 0;
  let ignorados = 0;

  for (const c of clientes) {
    if (!parece_corrompido(c.nome) && (!c.fantasia || !parece_corrompido(c.fantasia))) {
      ignorados++;
      continue;
    }

    console.log(`\n[${c.id}] Consultando CNPJ ${c.cnpj} para: "${c.nome}"`);

    const dados = await consultarCNPJ(c.cnpj!);
    await sleep(DELAY_MS);

    if (!dados || dados.status === 'ERROR' || !dados.nome) {
      console.log(`  ✗ Não encontrado na Receita Federal: ${dados?.message || 'sem resposta'}`);
      nao_encontrados++;
      continue;
    }

    const novoNome    = dados.nome.trim();
    const novaFantasia = dados.fantasia?.trim() || c.fantasia;

    console.log(`  Receita: "${novoNome}" (fantasia: "${novaFantasia ?? '—'}")`);
    console.log(`  Banco atual: "${c.nome}" (fantasia: "${c.fantasia ?? '—'}")`);

    if (novoNome === c.nome && novaFantasia === c.fantasia) {
      console.log('  → Já correto, nada a fazer.');
      ignorados++;
      continue;
    }

    if (DRY) {
      console.log(`  [DRY-RUN] Atualizaria: id=${c.id} nome="${novoNome}"`);
      corrigidos++;
      continue;
    }

    try {
      await db.none(
        `UPDATE clientes SET nome = $1, fantasia = $2 WHERE id = $3`,
        [novoNome, novaFantasia, c.id]
      );
      console.log(`  ✓ Atualizado com sucesso.`);
      corrigidos++;
    } catch (err) {
      console.error(`  ✗ Erro ao atualizar id=${c.id}:`, err);
      erros++;
    }
  }

  console.log('\n══════════════════════════════════════');
  console.log(`Resultado:`);
  console.log(`  Corrigidos:      ${corrigidos}`);
  console.log(`  Não encontrados: ${nao_encontrados}`);
  console.log(`  Ignorados:       ${ignorados}`);
  console.log(`  Erros:           ${erros}`);
  if (DRY) console.log('\n(Modo DRY-RUN — nenhuma alteração foi feita no banco)');

  process.exit(erros > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
