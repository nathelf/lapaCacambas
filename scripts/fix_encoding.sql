-- ============================================================
-- SCRIPT DE DIAGNÓSTICO E CORREÇÃO DE ENCODING
-- Versão 2 — suporta U+FFFD (◆), '?' e mojibake Ã§/Ã£
--
-- PADRÕES OBSERVADOS NOS DADOS:
--   LOCA◆◆O   → LOCAÇÃO   (Ç=U+FFFD, Ã=U+FFFD)
--   SERVI◆OS  → SERVIÇOS  (Ç=U+FFFD)
--   ASSOCIA◆AO→ ASSOCIAÇÃO (Ç=U+FFFD, Ã→A — acento perdido, base mantida)
--   EDUCA?AO  → EDUCAÇÃO  (variante com ? e A)
--
-- ANTES DE RODAR:
--   1. Faça backup do banco
--   2. Rode APENAS a Seção 1 (diagnóstico) primeiro
--   3. Confirme os resultados antes de executar a Seção 2
-- ============================================================

-- ─── SEÇÃO 0: IDENTIFICAR O TIPO DE CORRUPÇÃO ────────────────
-- Cole apenas este bloco primeiro para saber o que está no banco.

-- Descobre qual caractere está armazenado
SELECT
  id,
  nome,
  length(nome)                                      AS len,
  strpos(nome, chr(65533))                          AS pos_u_fffd,  -- U+FFFD ◆
  strpos(nome, '?')                                 AS pos_qmark,   -- ? literal
  encode(nome::bytea, 'hex')                        AS hex_nome
FROM clientes
WHERE nome LIKE '%' || chr(65533) || '%'
   OR nome LIKE '%?%'
ORDER BY id
LIMIT 20;

-- Conta por tipo
SELECT
  SUM(CASE WHEN nome LIKE '%' || chr(65533) || '%' THEN 1 ELSE 0 END) AS com_fffd,
  SUM(CASE WHEN nome LIKE '%?%'                    THEN 1 ELSE 0 END) AS com_qmark,
  SUM(CASE WHEN nome ~ 'Ã[§£µ³º]'                THEN 1 ELSE 0 END) AS com_mojibake
FROM clientes;

-- ─── SEÇÃO 1: DIAGNÓSTICO COMPLETO ───────────────────────────
SELECT id, nome, fantasia, cnpj
FROM clientes
WHERE nome     LIKE '%' || chr(65533) || '%'
   OR nome     LIKE '%?%'
   OR fantasia LIKE '%' || chr(65533) || '%'
   OR fantasia LIKE '%?%'
   OR nome     ~ 'Ã[§£µ³º‡]'
ORDER BY id;

-- ─── SEÇÃO 2: CORREÇÃO ───────────────────────────────────────
-- Cria função que trata AMBOS os tipos: U+FFFD (◆) e '?' literal
-- E AMBOS os padrões de perda: char→◆/? ou acento perdido (Ã→A)

CREATE OR REPLACE FUNCTION fix_encoding_br(txt TEXT) RETURNS TEXT AS $$
DECLARE
  fd  TEXT := chr(65533);   -- U+FFFD = ◆ (replacement character)
  q   TEXT := '?';          -- ? literal (question mark chr(63))
BEGIN
  IF txt IS NULL THEN RETURN txt; END IF;
  IF txt NOT LIKE '%' || fd || '%' AND txt NOT LIKE '%' || q || '%'
     AND txt NOT LIKE '%Ã%' THEN
    RETURN txt;
  END IF;

  -- ── Mojibake clássico Ã§/Ã£ (UTF-8 lido como Latin-1) ──────
  txt := replace(txt, 'Ã§', 'ç');
  txt := replace(txt, 'Ã£', 'ã');
  txt := replace(txt, 'Ãµ', 'õ');
  txt := replace(txt, 'Ãª', 'ê');
  txt := replace(txt, 'Ã©', 'é');
  txt := replace(txt, 'Ã¡', 'á');
  txt := replace(txt, 'Ã¢', 'â');
  txt := replace(txt, 'Ã³', 'ó');
  txt := replace(txt, 'Ãº', 'ú');
  txt := replace(txt, 'Ã­', 'í');
  txt := replace(txt, 'Ã‡', 'Ç');
  txt := replace(txt, 'Ã•', 'Õ');
  txt := replace(txt, 'Ã"', 'Ó');
  txt := replace(txt, 'Ã‰', 'É');
  txt := replace(txt, 'Ã€', 'À');
  txt := replace(txt, 'Ã‚', 'Â');
  txt := replace(txt, 'Ãœ', 'Ü');

  -- ── Padrão ◆◆O e ??O → ÇÃO (dois marcadores + O) ──────────
  -- ex: LOCA◆◆O → LOCAÇÃO,  CONSTRU◆◆O → CONSTRUÇÃO
  txt := replace(txt, 'ADMINISTRA' || fd || fd || 'O', 'ADMINISTRAÇÃO');
  txt := replace(txt, 'ADMINISTRA' || q  || q  || 'O', 'ADMINISTRAÇÃO');
  txt := replace(txt, 'COMERCIALIZA' || fd || fd || 'O', 'COMERCIALIZAÇÃO');
  txt := replace(txt, 'COMERCIALIZA' || q  || q  || 'O', 'COMERCIALIZAÇÃO');
  txt := replace(txt, 'REPRESENTA' || fd || fd || 'O', 'REPRESENTAÇÃO');
  txt := replace(txt, 'REPRESENTA' || q  || q  || 'O', 'REPRESENTAÇÃO');
  txt := replace(txt, 'DISTRIBUI' || fd || fd || 'O', 'DISTRIBUIÇÃO');
  txt := replace(txt, 'DISTRIBUI' || q  || q  || 'O', 'DISTRIBUIÇÃO');
  txt := replace(txt, 'CONSTRU' || fd || fd || 'ES', 'CONSTRUÇÕES');
  txt := replace(txt, 'CONSTRU' || q  || q  || 'ES', 'CONSTRUÇÕES');
  txt := replace(txt, 'CONSTRU' || fd || fd || 'O', 'CONSTRUÇÃO');
  txt := replace(txt, 'CONSTRU' || q  || q  || 'O', 'CONSTRUÇÃO');
  txt := replace(txt, 'PRESTA' || fd || fd || 'ES', 'PRESTAÇÕES');
  txt := replace(txt, 'PRESTA' || q  || q  || 'ES', 'PRESTAÇÕES');
  txt := replace(txt, 'PRESTA' || fd || fd || 'O', 'PRESTAÇÃO');
  txt := replace(txt, 'PRESTA' || q  || q  || 'O', 'PRESTAÇÃO');
  txt := replace(txt, 'INSTALA' || fd || fd || 'ES', 'INSTALAÇÕES');
  txt := replace(txt, 'INSTALA' || q  || q  || 'ES', 'INSTALAÇÕES');
  txt := replace(txt, 'INSTALA' || fd || fd || 'O', 'INSTALAÇÃO');
  txt := replace(txt, 'INSTALA' || q  || q  || 'O', 'INSTALAÇÃO');
  txt := replace(txt, 'COMUNICA' || fd || fd || 'ES', 'COMUNICAÇÕES');
  txt := replace(txt, 'COMUNICA' || q  || q  || 'ES', 'COMUNICAÇÕES');
  txt := replace(txt, 'COMUNICA' || fd || fd || 'O', 'COMUNICAÇÃO');
  txt := replace(txt, 'COMUNICA' || q  || q  || 'O', 'COMUNICAÇÃO');
  txt := replace(txt, 'MANUTEN' || fd || fd || 'O', 'MANUTENÇÃO');
  txt := replace(txt, 'MANUTEN' || q  || q  || 'O', 'MANUTENÇÃO');
  txt := replace(txt, 'INFORMA' || fd || fd || 'O', 'INFORMAÇÃO');
  txt := replace(txt, 'INFORMA' || q  || q  || 'O', 'INFORMAÇÃO');
  txt := replace(txt, 'IMPORTA' || fd || fd || 'O', 'IMPORTAÇÃO');
  txt := replace(txt, 'IMPORTA' || q  || q  || 'O', 'IMPORTAÇÃO');
  txt := replace(txt, 'EXPORTA' || fd || fd || 'O', 'EXPORTAÇÃO');
  txt := replace(txt, 'EXPORTA' || q  || q  || 'O', 'EXPORTAÇÃO');
  txt := replace(txt, 'FABRICA' || fd || fd || 'O', 'FABRICAÇÃO');
  txt := replace(txt, 'FABRICA' || q  || q  || 'O', 'FABRICAÇÃO');
  txt := replace(txt, 'EXPLORA' || fd || fd || 'O', 'EXPLORAÇÃO');
  txt := replace(txt, 'EXPLORA' || q  || q  || 'O', 'EXPLORAÇÃO');
  txt := replace(txt, 'EDUCA' || fd || fd || 'O', 'EDUCAÇÃO');
  txt := replace(txt, 'EDUCA' || q  || q  || 'O', 'EDUCAÇÃO');
  txt := replace(txt, 'NAVEGA' || fd || fd || 'O', 'NAVEGAÇÃO');
  txt := replace(txt, 'NAVEGA' || q  || q  || 'O', 'NAVEGAÇÃO');
  txt := replace(txt, 'NEGOCIA' || fd || fd || 'O', 'NEGOCIAÇÃO');
  txt := replace(txt, 'NEGOCIA' || q  || q  || 'O', 'NEGOCIAÇÃO');
  txt := replace(txt, 'AMPLIA' || fd || fd || 'O', 'AMPLIAÇÃO');
  txt := replace(txt, 'AMPLIA' || q  || q  || 'O', 'AMPLIAÇÃO');
  txt := replace(txt, 'AQUISI' || fd || fd || 'O', 'AQUISIÇÃO');
  txt := replace(txt, 'AQUISI' || q  || q  || 'O', 'AQUISIÇÃO');
  txt := replace(txt, 'EXECU' || fd || fd || 'O', 'EXECUÇÃO');
  txt := replace(txt, 'EXECU' || q  || q  || 'O', 'EXECUÇÃO');
  txt := replace(txt, 'SOLU' || fd || fd || 'ES', 'SOLUÇÕES');
  txt := replace(txt, 'SOLU' || q  || q  || 'ES', 'SOLUÇÕES');
  txt := replace(txt, 'SOLU' || fd || fd || 'O', 'SOLUÇÃO');
  txt := replace(txt, 'SOLU' || q  || q  || 'O', 'SOLUÇÃO');
  txt := replace(txt, 'A' || fd || fd || 'ES', 'AÇÕES');
  txt := replace(txt, 'A' || q  || q  || 'ES', 'AÇÕES');
  txt := replace(txt, 'LOCA' || fd || fd || 'O', 'LOCAÇÃO');
  txt := replace(txt, 'LOCA' || q  || q  || 'O', 'LOCAÇÃO');
  txt := replace(txt, 'FUNDA' || fd || fd || 'O', 'FUNDAÇÃO');
  txt := replace(txt, 'FUNDA' || q  || q  || 'O', 'FUNDAÇÃO');
  txt := replace(txt, 'PRODU' || fd || fd || 'O', 'PRODUÇÃO');
  txt := replace(txt, 'PRODU' || q  || q  || 'O', 'PRODUÇÃO');
  txt := replace(txt, 'REDU' || fd || fd || 'O', 'REDUÇÃO');
  txt := replace(txt, 'REDU' || q  || q  || 'O', 'REDUÇÃO');
  txt := replace(txt, 'ATEN' || fd || fd || 'O', 'ATENÇÃO');
  txt := replace(txt, 'ATEN' || q  || q  || 'O', 'ATENÇÃO');

  -- ── Padrão ◆AO e ?AO → ÇÃO (Ã perdida como 'A') ────────────
  -- ex: ASSOCIA◆AO → ASSOCIAÇÃO,  EDUCA◆AO → EDUCAÇÃO
  txt := replace(txt, 'ASSOCIA' || fd || 'AO', 'ASSOCIAÇÃO');
  txt := replace(txt, 'ASSOCIA' || q  || 'AO', 'ASSOCIAÇÃO');
  txt := replace(txt, 'ADMINISTRA' || fd || 'AO', 'ADMINISTRAÇÃO');
  txt := replace(txt, 'ADMINISTRA' || q  || 'AO', 'ADMINISTRAÇÃO');
  txt := replace(txt, 'CONSTRU' || fd || 'AO', 'CONSTRUÇÃO');
  txt := replace(txt, 'CONSTRU' || q  || 'AO', 'CONSTRUÇÃO');
  txt := replace(txt, 'INSTALA' || fd || 'AO', 'INSTALAÇÃO');
  txt := replace(txt, 'INSTALA' || q  || 'AO', 'INSTALAÇÃO');
  txt := replace(txt, 'MANUTEN' || fd || 'AO', 'MANUTENÇÃO');
  txt := replace(txt, 'MANUTEN' || q  || 'AO', 'MANUTENÇÃO');
  txt := replace(txt, 'INFORMA' || fd || 'AO', 'INFORMAÇÃO');
  txt := replace(txt, 'INFORMA' || q  || 'AO', 'INFORMAÇÃO');
  txt := replace(txt, 'FABRICA' || fd || 'AO', 'FABRICAÇÃO');
  txt := replace(txt, 'FABRICA' || q  || 'AO', 'FABRICAÇÃO');
  txt := replace(txt, 'EDUCA' || fd || 'AO', 'EDUCAÇÃO');
  txt := replace(txt, 'EDUCA' || q  || 'AO', 'EDUCAÇÃO');
  txt := replace(txt, 'PRESTA' || fd || 'AO', 'PRESTAÇÃO');
  txt := replace(txt, 'PRESTA' || q  || 'AO', 'PRESTAÇÃO');
  txt := replace(txt, 'COMUNICA' || fd || 'AO', 'COMUNICAÇÃO');
  txt := replace(txt, 'COMUNICA' || q  || 'AO', 'COMUNICAÇÃO');
  txt := replace(txt, 'LOCA' || fd || 'AO', 'LOCAÇÃO');
  txt := replace(txt, 'LOCA' || q  || 'AO', 'LOCAÇÃO');
  txt := replace(txt, 'FUNDA' || fd || 'AO', 'FUNDAÇÃO');
  txt := replace(txt, 'FUNDA' || q  || 'AO', 'FUNDAÇÃO');
  txt := replace(txt, 'NAVEGA' || fd || 'AO', 'NAVEGAÇÃO');
  txt := replace(txt, 'NAVEGA' || q  || 'AO', 'NAVEGAÇÃO');
  txt := replace(txt, 'NEGOCIA' || fd || 'AO', 'NEGOCIAÇÃO');
  txt := replace(txt, 'NEGOCIA' || q  || 'AO', 'NEGOCIAÇÃO');
  txt := replace(txt, 'DISTRIBUI' || fd || 'AO', 'DISTRIBUIÇÃO');
  txt := replace(txt, 'DISTRIBUI' || q  || 'AO', 'DISTRIBUIÇÃO');
  txt := replace(txt, 'ATEN' || fd || 'AO', 'ATENÇÃO');
  txt := replace(txt, 'ATEN' || q  || 'AO', 'ATENÇÃO');

  -- ── Padrão ◆O e ?O simples → ÇÃO genérico ───────────────────
  -- Ex: GEST◆O → GESTÃO (quando só há 1 marcador antes do O)
  txt := replace(txt, 'GEST' || fd || 'O', 'GESTÃO');
  txt := replace(txt, 'GEST' || q  || 'O', 'GESTÃO');
  txt := replace(txt, 'CORA' || fd || 'O', 'CORAÇÃO');
  txt := replace(txt, 'CORA' || q  || 'O', 'CORAÇÃO');

  -- ── Padrão ◆OS e ?OS → ÇOS (Ç antes de OS) ──────────────────
  -- ex: SERVI◆OS → SERVIÇOS
  txt := replace(txt, 'SERVI' || fd || 'OS', 'SERVIÇOS');
  txt := replace(txt, 'SERVI' || q  || 'OS', 'SERVIÇOS');
  txt := replace(txt, 'SERVI' || fd || 'O',  'SERVIÇO');
  txt := replace(txt, 'SERVI' || q  || 'O',  'SERVIÇO');
  txt := replace(txt, 'ESPA' || fd || 'OS', 'ESPAÇOS');
  txt := replace(txt, 'ESPA' || q  || 'OS', 'ESPAÇOS');
  txt := replace(txt, 'ESPA' || fd || 'O', 'ESPAÇO');
  txt := replace(txt, 'ESPA' || q  || 'O', 'ESPAÇO');
  txt := replace(txt, 'TERRA' || fd || 'OS', 'TERRAÇOS');
  txt := replace(txt, 'TERRA' || q  || 'OS', 'TERRAÇOS');
  txt := replace(txt, 'BALAN' || fd || 'O', 'BALANÇO');
  txt := replace(txt, 'BALAN' || q  || 'O', 'BALANÇO');
  txt := replace(txt, 'FOR' || fd || 'A', 'FORÇA');
  txt := replace(txt, 'FOR' || q  || 'A', 'FORÇA');
  txt := replace(txt, 'FOR' || fd || 'AS', 'FORÇAS');
  txt := replace(txt, 'FOR' || q  || 'AS', 'FORÇAS');
  txt := replace(txt, 'FRAN' || fd || 'A', 'FRANÇA');
  txt := replace(txt, 'FRAN' || q  || 'A', 'FRANÇA');
  txt := replace(txt, 'LAN' || fd || 'A', 'LANÇA');
  txt := replace(txt, 'LAN' || q  || 'A', 'LANÇA');

  -- ── Palavras com acento no meio (IND?STRIA, M?QUINA, etc.) ───
  txt := replace(txt, 'IND' || fd || 'STRIAS', 'INDÚSTRIAS');
  txt := replace(txt, 'IND' || q  || 'STRIAS', 'INDÚSTRIAS');
  txt := replace(txt, 'IND' || fd || 'STRIA',  'INDÚSTRIA');
  txt := replace(txt, 'IND' || q  || 'STRIA',  'INDÚSTRIA');
  txt := replace(txt, 'M' || fd || 'QUINAS', 'MÁQUINAS');
  txt := replace(txt, 'M' || q  || 'QUINAS', 'MÁQUINAS');
  txt := replace(txt, 'M' || fd || 'QUINA',  'MÁQUINA');
  txt := replace(txt, 'M' || q  || 'QUINA',  'MÁQUINA');
  txt := replace(txt, 'COM' || fd || 'RCIO', 'COMÉRCIO');
  txt := replace(txt, 'COM' || q  || 'RCIO', 'COMÉRCIO');
  txt := replace(txt, 'AGR' || fd || 'COLA', 'AGRÍCOLA');
  txt := replace(txt, 'AGR' || q  || 'COLA', 'AGRÍCOLA');
  txt := replace(txt, 'PETR' || fd || 'LEO', 'PETRÓLEO');
  txt := replace(txt, 'PETR' || q  || 'LEO', 'PETRÓLEO');
  txt := replace(txt, 'ELETR' || fd || 'NICA', 'ELETRÔNICA');
  txt := replace(txt, 'ELETR' || q  || 'NICA', 'ELETRÔNICA');
  txt := replace(txt, 'ELETR' || fd || 'NICO', 'ELETRÔNICO');
  txt := replace(txt, 'ELETR' || q  || 'NICO', 'ELETRÔNICO');
  txt := replace(txt, 'PL' || fd || 'STICA', 'PLÁSTICA');
  txt := replace(txt, 'PL' || q  || 'STICA', 'PLÁSTICA');
  txt := replace(txt, 'PL' || fd || 'STICO', 'PLÁSTICO');
  txt := replace(txt, 'PL' || q  || 'STICO', 'PLÁSTICO');

  -- ── Endereços ─────────────────────────────────────────────────
  txt := replace(txt, 'S' || fd || 'O',  'SÃO');  -- SÃO PAULO, SÃO JOÃO etc.
  txt := replace(txt, 'S' || q  || 'O',  'SÃO');
  txt := replace(txt, 'JO' || fd || 'O', 'JOÃO');
  txt := replace(txt, 'JO' || q  || 'O', 'JOÃO');
  txt := replace(txt, 'BEL' || fd || 'M', 'BELÉM');
  txt := replace(txt, 'BEL' || q  || 'M', 'BELÉM');
  txt := replace(txt, 'JARAGU' || fd, 'JARAGUÁ');
  txt := replace(txt, 'JARAGU' || q, 'JARAGUÁ');
  txt := replace(txt, 'AV.' || ' ' || 'GET' || fd || 'LIO', 'AV. GETÚLIO');
  txt := replace(txt, 'GET' || fd || 'LIO', 'GETÚLIO');
  txt := replace(txt, 'GET' || q  || 'LIO', 'GETÚLIO');
  txt := replace(txt, 'VARGINHA', 'VARGINHA');  -- sem acento, só fixa capitalização

  RETURN txt;
END;
$$ LANGUAGE plpgsql;

-- ─── APLICAR A CORREÇÃO ──────────────────────────────────────
-- Preview primeiro (sem alterar):
SELECT
  id,
  nome                        AS nome_atual,
  fix_encoding_br(nome)       AS nome_corrigido,
  fantasia                    AS fantasia_atual,
  fix_encoding_br(fantasia)   AS fantasia_corrigida
FROM clientes
WHERE nome     LIKE '%' || chr(65533) || '%'
   OR nome     LIKE '%?%'
   OR fantasia LIKE '%' || chr(65533) || '%'
   OR fantasia LIKE '%?%'
ORDER BY id
LIMIT 50;

-- ─── SE O PREVIEW ESTIVER CORRETO, EXECUTAR: ─────────────────
BEGIN;

UPDATE clientes SET
  nome     = fix_encoding_br(nome),
  fantasia = fix_encoding_br(fantasia),
  endereco = fix_encoding_br(endereco),
  bairro   = fix_encoding_br(bairro),
  cidade   = fix_encoding_br(cidade)
WHERE nome     LIKE '%' || chr(65533) || '%'
   OR nome     LIKE '%?%'
   OR fantasia LIKE '%' || chr(65533) || '%'
   OR fantasia LIKE '%?%'
   OR nome     ~ 'Ã[§£µ³º‡]'
   OR endereco LIKE '%' || chr(65533) || '%'
   OR endereco LIKE '%?%'
   OR bairro   LIKE '%' || chr(65533) || '%'
   OR bairro   LIKE '%?%'
   OR cidade   LIKE '%' || chr(65533) || '%'
   OR cidade   LIKE '%?%';

UPDATE obras SET
  nome     = fix_encoding_br(nome),
  endereco = fix_encoding_br(endereco),
  bairro   = fix_encoding_br(bairro),
  cidade   = fix_encoding_br(cidade)
WHERE nome     LIKE '%' || chr(65533) || '%'
   OR nome     LIKE '%?%'
   OR endereco LIKE '%' || chr(65533) || '%'
   OR endereco LIKE '%?%';

UPDATE enderecos_entrega SET
  endereco = fix_encoding_br(endereco),
  bairro   = fix_encoding_br(bairro),
  cidade   = fix_encoding_br(cidade)
WHERE endereco LIKE '%' || chr(65533) || '%'
   OR endereco LIKE '%?%'
   OR bairro   LIKE '%' || chr(65533) || '%'
   OR bairro   LIKE '%?%';

-- Verificação pós-UPDATE (deve retornar 0 linhas para os casos cobertos):
SELECT id, nome, fantasia FROM clientes
WHERE nome     LIKE '%' || chr(65533) || '%'
   OR fantasia LIKE '%' || chr(65533) || '%'
ORDER BY id;

-- COMMIT;   ← descomente quando confirmar que está tudo certo
-- ROLLBACK; ← descomente para desfazer

-- ─── LIMPEZA ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS fix_encoding_br(TEXT);

-- ─── VERIFICAÇÃO DE ENCODING DO BANCO ───────────────────────
SHOW server_encoding;
SHOW client_encoding;
SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database();
