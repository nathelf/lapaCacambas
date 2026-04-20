/**
 * Formatadores utilitários para exibição de dados no padrão pt-BR.
 * Centraliza toda a lógica de formatação para evitar duplicação e inconsistências.
 */

/** CPF: "12345678901" → "123.456.789-01" */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11) return cpf;
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** CNPJ: "00000000000100" → "00.000.000/0001-00" */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '—';
  const n = cnpj.replace(/\D/g, '');
  if (n.length !== 14) return cnpj;
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/** CPF ou CNPJ automaticamente, baseado no comprimento */
export function formatDocumento(doc: string | null | undefined): string {
  if (!doc) return '—';
  const n = doc.replace(/\D/g, '');
  if (n.length === 11) return formatCPF(n);
  if (n.length === 14) return formatCNPJ(n);
  return doc;
}

/** Telefone fixo (10 dígitos) ou celular (11 dígitos) */
export function formatTelefone(tel: string | null | undefined): string {
  if (!tel) return '—';
  const n = tel.replace(/\D/g, '');
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return tel;
}

/** CEP: "01310100" → "01310-100" */
export function formatCEP(cep: string | null | undefined): string {
  if (!cep) return '—';
  const n = cep.replace(/\D/g, '');
  if (n.length !== 8) return cep;
  return n.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/** Data pt-BR: "2024-01-15" → "15/01/2024" */
export function formatData(data: string | Date | null | undefined): string {
  if (!data) return '—';
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

/** Data e hora pt-BR: "2024-01-15T14:30:00" → "15/01/2024 14:30" */
export function formatDataHora(data: string | Date | null | undefined): string {
  if (!data) return '—';
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Moeda BRL: 1234.5 → "R$ 1.234,50" */
export function formatMoeda(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Moeda sem prefixo: 1234.5 → "1.234,50" */
export function formatMoedaNumero(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Corrige texto com encoding corrompido vindo do banco legado.
 *
 * Trata dois tipos de corrupção:
 *  1. U+FFFD (◆) — replacement character, ex: "LOCA◆◆O" → "LOCAÇÃO"
 *  2. '?' literal  — byte descartado,     ex: "LOCA??O" → "LOCAÇÃO"
 *  3. Mojibake Ã§  — UTF-8 lido como Latin-1, ex: "Ã§" → "ç"
 *
 * Aplica dicionário de palavras comuns em razão social e endereços pt-BR.
 */
export function fixEncoding(text: string | null | undefined): string {
  if (!text) return text ?? '';

  // Atalho: se não tem nenhum marcador de corrupção, retorna imediatamente
  const hasFFD  = text.includes('\uFFFD');
  const hasQ    = text.includes('?');
  const hasMoji = text.includes('Ã');
  if (!hasFFD && !hasQ && !hasMoji) return text;

  let t = text;
  const fd = '\uFFFD'; // U+FFFD ◆

  // ── 1. Mojibake clássico (UTF-8 bytes interpretados como Latin-1) ──────────
  t = t.replace(/Ã§/g, 'ç').replace(/Ã£/g, 'ã').replace(/Ãµ/g, 'õ');
  t = t.replace(/Ãª/g, 'ê').replace(/Ã©/g, 'é').replace(/Ã¡/g, 'á');
  t = t.replace(/Ã¢/g, 'â').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú');
  t = t.replace(/Ã­/g, 'í').replace(/Ã‡/g, 'Ç').replace(/Ã•/g, 'Õ');
  t = t.replace(/Ã"/g, 'Ó').replace(/Ã‰/g, 'É').replace(/Ã€/g, 'À');
  t = t.replace(/Ã‚/g, 'Â').replace(/Ãœ/g, 'Ü');

  // Atalho após mojibake — se restou apenas texto limpo
  if (!t.includes(fd) && !t.includes('?')) return t;

  // Função interna: substitui com os dois marcadores (fd e '?')
  const fix = (from: string, to: string) => {
    t = t.split(from.replace('◆', fd)).join(to);
    t = t.split(from.replace('◆', '?')).join(to);
  };

  // ── 2. Terminações -ÇÃO / -ÇÕES  (2 marcadores: Ç + Ã → ◆◆) ───────────────
  fix('ADMINISTRA◆◆O', 'ADMINISTRAÇÃO');
  fix('COMERCIALIZA◆◆O', 'COMERCIALIZAÇÃO');
  fix('REPRESENTA◆◆O', 'REPRESENTAÇÃO');
  fix('DISTRIBUI◆◆O', 'DISTRIBUIÇÃO');
  fix('CONSTRU◆◆ES', 'CONSTRUÇÕES');
  fix('CONSTRU◆◆O', 'CONSTRUÇÃO');
  fix('PRESTA◆◆ES', 'PRESTAÇÕES');
  fix('PRESTA◆◆O', 'PRESTAÇÃO');
  fix('INSTALA◆◆ES', 'INSTALAÇÕES');
  fix('INSTALA◆◆O', 'INSTALAÇÃO');
  fix('COMUNICA◆◆ES', 'COMUNICAÇÕES');
  fix('COMUNICA◆◆O', 'COMUNICAÇÃO');
  fix('MANUTEN◆◆O', 'MANUTENÇÃO');
  fix('INFORMA◆◆O', 'INFORMAÇÃO');
  fix('IMPORTA◆◆O', 'IMPORTAÇÃO');
  fix('EXPORTA◆◆O', 'EXPORTAÇÃO');
  fix('FABRICA◆◆O', 'FABRICAÇÃO');
  fix('EXPLORA◆◆O', 'EXPLORAÇÃO');
  fix('EDUCA◆◆O', 'EDUCAÇÃO');
  fix('NAVEGA◆◆O', 'NAVEGAÇÃO');
  fix('NEGOCIA◆◆O', 'NEGOCIAÇÃO');
  fix('AMPLIA◆◆O', 'AMPLIAÇÃO');
  fix('AQUISI◆◆O', 'AQUISIÇÃO');
  fix('EXECU◆◆O', 'EXECUÇÃO');
  fix('SOLU◆◆ES', 'SOLUÇÕES');
  fix('SOLU◆◆O', 'SOLUÇÃO');
  fix('A◆◆ES', 'AÇÕES');
  fix('LOCA◆◆O', 'LOCAÇÃO');
  fix('FUNDA◆◆O', 'FUNDAÇÃO');
  fix('PRODU◆◆O', 'PRODUÇÃO');
  fix('REDU◆◆O', 'REDUÇÃO');
  fix('ATEN◆◆O', 'ATENÇÃO');

  // ── 3. Terminações -ÇÃO onde Ã virou 'A'  (1 marcador + AO) ────────────────
  fix('ASSOCIA◆AO', 'ASSOCIAÇÃO');
  fix('ADMINISTRA◆AO', 'ADMINISTRAÇÃO');
  fix('CONSTRU◆AO', 'CONSTRUÇÃO');
  fix('INSTALA◆AO', 'INSTALAÇÃO');
  fix('MANUTEN◆AO', 'MANUTENÇÃO');
  fix('INFORMA◆AO', 'INFORMAÇÃO');
  fix('FABRICA◆AO', 'FABRICAÇÃO');
  fix('EDUCA◆AO', 'EDUCAÇÃO');
  fix('PRESTA◆AO', 'PRESTAÇÃO');
  fix('COMUNICA◆AO', 'COMUNICAÇÃO');
  fix('LOCA◆AO', 'LOCAÇÃO');
  fix('FUNDA◆AO', 'FUNDAÇÃO');
  fix('NAVEGA◆AO', 'NAVEGAÇÃO');
  fix('NEGOCIA◆AO', 'NEGOCIAÇÃO');
  fix('DISTRIBUI◆AO', 'DISTRIBUIÇÃO');
  fix('ATEN◆AO', 'ATENÇÃO');
  fix('GEST◆O', 'GESTÃO');
  fix('CORA◆AO', 'CORAÇÃO');

  // ── 4. Palavras com Ç isolado (1 marcador) ──────────────────────────────────
  fix('SERVI◆OS', 'SERVIÇOS');
  fix('SERVI◆O', 'SERVIÇO');
  fix('ESPA◆OS', 'ESPAÇOS');
  fix('ESPA◆O', 'ESPAÇO');
  fix('TERRA◆OS', 'TERRAÇOS');
  fix('BALAN◆O', 'BALANÇO');
  fix('FOR◆AS', 'FORÇAS');
  fix('FOR◆A', 'FORÇA');
  fix('FRAN◆A', 'FRANÇA');
  fix('LAN◆A', 'LANÇA');
  fix('A◆O', 'AÇO');

  // ── 5. Palavras com acento interno ──────────────────────────────────────────
  fix('IND◆STRIAS', 'INDÚSTRIAS');
  fix('IND◆STRIA', 'INDÚSTRIA');
  fix('M◆QUINAS', 'MÁQUINAS');
  fix('M◆QUINA', 'MÁQUINA');
  fix('COM◆RCIO', 'COMÉRCIO');
  fix('AGR◆COLA', 'AGRÍCOLA');
  fix('PETR◆LEO', 'PETRÓLEO');
  fix('ELETR◆NICA', 'ELETRÔNICA');
  fix('ELETR◆NICO', 'ELETRÔNICO');
  fix('PL◆STICA', 'PLÁSTICA');
  fix('PL◆STICO', 'PLÁSTICO');
  fix('GET◆LIO', 'GETÚLIO');

  // ── 6. Endereços e nomes de cidade ──────────────────────────────────────────
  fix('S◆O', 'SÃO');
  fix('JO◆O', 'JOÃO');
  fix('BEL◆M', 'BELÉM');
  fix('JARAGU◆', 'JARAGUÁ');
  fix('GOI◆NIA', 'GOIÂNIA');
  fix('LONDRINA', 'LONDRINA');   // sem acento, só garante
  fix('CASCAVEL', 'CASCAVEL');   // sem acento, só garante

  // ── 7. Indicadores ordinais (ª e º) após número ────────────────────────────
  // ª (U+00AA) e º (U+00BA) são bytes 0xAA/0xBA em Win-1252 — corrompem para ◆ ou ?
  // Varre a string procurando dígito + marcador e substitui pelo ordinal correto.
  const NOMES_FEMININOS = /^(IGREJ|ASSOC|AVENI|ESCOLA|EMPRES|SOCIEDA|FAZEND|PRAÇA|TURM|SERI|UNID|FILIAL|MATRIZ|LOJA|OBRA)/i;
  const replaceOrdinais = (src: string, marker: string): string => {
    let result = src;
    let idx = result.indexOf(marker);
    while (idx !== -1) {
      if (idx > 0 && /\d/.test(result[idx - 1])) {
        const after = result.slice(idx + marker.length).trimStart();
        const nextWord = after.match(/^[A-Za-zÀ-ÿ]*/)?.[0] ?? '';
        const ord = NOMES_FEMININOS.test(nextWord) ? 'ª' : 'º';
        result = result.slice(0, idx) + ord + result.slice(idx + marker.length);
        idx = result.indexOf(marker, idx + 1);
      } else {
        idx = result.indexOf(marker, idx + 1);
      }
    }
    return result;
  };
  t = replaceOrdinais(t, '\uFFFD');
  t = replaceOrdinais(t, '?');

  return t;
}

/** Aplica fixEncoding em todos os campos de texto de um objeto cliente */
export function normalizeCliente(c: Record<string, any>): Record<string, any> {
  if (!c || typeof c !== 'object') return c;
  const fields = ['nome', 'fantasia', 'endereco', 'bairro', 'cidade', 'observacao', 'referencia'];
  const out: Record<string, any> = { ...c };
  for (const f of fields) {
    if (typeof out[f] === 'string') out[f] = fixEncoding(out[f]);
  }
  return out;
}

/** Remove U+FFFD residual sem contexto (não recuperável) — substitui por espaço vazio */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return fixEncoding(text).replace(/\uFFFD/g, '').trim();
}

/** Capitaliza a primeira letra de cada palavra */
export function titleCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
