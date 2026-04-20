-- ============================================================
-- SPRINT 1 FISCAL — Hardening configuração + correção pedidos
-- Etapas 2 e 3: seed fiscal, diagnósticos e correções
-- Idempotente (IF NOT EXISTS / ON CONFLICT / DO UPDATE)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Adicionar colunas que faltam em configuracoes_fiscais_empresa
--    (cnpj e razao_social não estavam na criação original)
-- ------------------------------------------------------------
ALTER TABLE public.configuracoes_fiscais_empresa
  ADD COLUMN IF NOT EXISTS cnpj         TEXT,
  ADD COLUMN IF NOT EXISTS razao_social TEXT;

-- ------------------------------------------------------------
-- 2) Garantir coluna search na listagem de notas (índice)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notas_numero_nota_search
  ON public.notas_fiscais (numero_nota text_pattern_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notas_numero_search
  ON public.notas_fiscais (numero text_pattern_ops)
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- 3) Seed: configuração fiscal ativa para Cascavel/PR
--    empresa_id fixo para garantir unicidade do índice parcial
--    api_key = 'MOCK_API_KEY_HML' → FiscalAuthService retorna
--    imediatamente sem chamada OAuth (provider=mock não usa)
-- ------------------------------------------------------------
INSERT INTO public.configuracoes_fiscais_empresa (
  id,
  empresa_id,
  cnpj,
  razao_social,
  provedor_fiscal,
  ambiente,
  api_base_url,
  client_id,
  client_secret,
  api_key,
  municipio_codigo,
  inscricao_municipal,
  regime_tributario,
  ativo,
  created_at,
  updated_at
)
VALUES (
  9001,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00.000.000/0001-00',          -- ⚠ substituir pelo CNPJ real da empresa
  'Lapa Caçambas Ltda',          -- ⚠ substituir pela razão social real
  'mock',                        -- provider: 'mock' para homologação
  'homologacao',
  NULL,                          -- api_base_url: NULL enquanto provider=mock
  NULL,                          -- client_id: não necessário com api_key
  NULL,                          -- client_secret: não necessário com api_key
  'MOCK_API_KEY_HML',            -- api_key: usado como accessToken pelo FiscalAuthService
  '4104808',                     -- Cascavel/PR (código IBGE)
  '000000-0',                    -- ⚠ substituir pela inscrição municipal real
  'simples_nacional',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  cnpj              = COALESCE(configuracoes_fiscais_empresa.cnpj, EXCLUDED.cnpj),
  razao_social      = COALESCE(configuracoes_fiscais_empresa.razao_social, EXCLUDED.razao_social),
  municipio_codigo  = '4104808',
  provedor_fiscal   = 'mock',
  ambiente          = 'homologacao',
  api_key           = COALESCE(configuracoes_fiscais_empresa.api_key, 'MOCK_API_KEY_HML'),
  ativo             = true,
  updated_at        = now();

-- Garante que nenhuma outra configuração conflite (desativa as demais do mesmo empresa_id)
UPDATE public.configuracoes_fiscais_empresa
SET ativo = false, updated_at = now()
WHERE empresa_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND id <> 9001
  AND ativo = true;

-- ------------------------------------------------------------
-- 4) Seed: serviço padrão para locação de caçambas
--    Usado como fallback na correção de pedidos sem servico_id
-- ------------------------------------------------------------
INSERT INTO public.servicos (id, descricao, codigo_fiscal, aliquota, ativo)
VALUES (
  9001,
  'Locação de Caçamba e Coleta de Resíduos',
  '7.09',   -- Lista de serviços LC 116/2003: item 7.09 - serviços de coleta de resíduos
  2.00,     -- Alíquota ISS 2% (verificar legislação de Cascavel/PR)
  true
)
ON CONFLICT (id) DO UPDATE SET
  descricao    = EXCLUDED.descricao,
  codigo_fiscal = COALESCE(servicos.codigo_fiscal, EXCLUDED.codigo_fiscal),
  aliquota     = COALESCE(NULLIF(servicos.aliquota, 0), EXCLUDED.aliquota),
  ativo        = true;

-- ============================================================
-- ETAPA 3 — DIAGNÓSTICO E CORREÇÃO DE PEDIDOS INVÁLIDOS
-- ============================================================

-- ------------------------------------------------------------
-- 5) VIEW de diagnóstico: pedidos bloqueados para fiscal
--    Execute SELECT * FROM v_pedidos_invalidos_fiscal;
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_pedidos_invalidos_fiscal AS
SELECT
  p.id,
  p.numero,
  p.status,
  p.servico_id,
  s.descricao                             AS servico_atual,
  p.valor_total,
  p.status_fiscal,
  c.nome                                  AS cliente,
  c.cnpj,
  c.cpf,
  CASE WHEN p.servico_id IS NULL   THEN true ELSE false END AS sem_servico,
  CASE WHEN p.valor_total <= 0     THEN true ELSE false END AS valor_invalido,
  CASE WHEN c.cnpj IS NULL
        AND c.cpf  IS NULL          THEN true ELSE false END AS cliente_sem_documento,
  CASE WHEN c.endereco IS NULL
        OR  c.endereco = ''         THEN true ELSE false END AS cliente_sem_endereco
FROM public.pedidos p
LEFT JOIN public.servicos s ON s.id = p.servico_id
LEFT JOIN public.clientes  c ON c.id = p.cliente_id
WHERE p.deleted_at IS NULL
  AND p.status IN ('concluido', 'faturado')
  AND p.status_fiscal <> 'emitida'
  AND (
    p.servico_id IS NULL
    OR p.valor_total <= 0
    OR (c.cnpj IS NULL AND c.cpf IS NULL)
    OR (c.endereco IS NULL OR c.endereco = '')
  );

-- ------------------------------------------------------------
-- 6) CORREÇÃO SEGURA: associar serviço padrão (id=9001)
--    nos pedidos concluídos/faturados sem servico_id.
--
--    ⚠ RISCO BAIXO em homologação — revisão obrigatória antes
--    de executar em produção com dados reais de clientes.
--    Execute a VIEW de diagnóstico primeiro para validar escopo.
-- ------------------------------------------------------------
UPDATE public.pedidos
SET
  servico_id = 9001,
  updated_at = now()
WHERE deleted_at IS NULL
  AND status IN ('concluido', 'faturado')
  AND status_fiscal <> 'emitida'
  AND servico_id IS NULL
  AND EXISTS (SELECT 1 FROM public.servicos WHERE id = 9001 AND ativo = true);

-- ------------------------------------------------------------
-- 7) INFORMATIVO: pedidos com valor_total = 0
--    NÃO corrigido automaticamente — requer revisão manual
--    pois pode indicar: desconto 100%, dado legado corrompido,
--    ou pedido criado incorretamente.
--
--    Para consultar:
--    SELECT id, numero, status, valor_unitario, valor_desconto, quantidade
--    FROM pedidos
--    WHERE deleted_at IS NULL AND status IN ('concluido','faturado')
--    AND valor_total <= 0;
-- ------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.pedidos
  WHERE deleted_at IS NULL
    AND status IN ('concluido', 'faturado')
    AND valor_total <= 0;

  IF v_count > 0 THEN
    RAISE NOTICE '⚠  ATENÇÃO: % pedido(s) com valor_total <= 0 em status concluido/faturado. '
                 'Corrija manualmente antes de emitir NF-e. '
                 'Consulte: SELECT id, numero, valor_unitario, valor_desconto, quantidade '
                 'FROM pedidos WHERE deleted_at IS NULL AND status IN (''concluido'',''faturado'') AND valor_total <= 0;',
                 v_count;
  ELSE
    RAISE NOTICE '✓ Nenhum pedido com valor_total <= 0 em status elegível para fiscal.';
  END IF;
END $$;
