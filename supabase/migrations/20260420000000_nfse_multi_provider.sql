-- ============================================================
-- NFS-e Multi-Provider — Sprint 3
-- Adiciona suporte a Focus NFe, AtendeNet e futuros providers.
-- Idempotente (ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Colunas de identidade e roteamento de provider
-- ------------------------------------------------------------
ALTER TABLE public.configuracoes_fiscais_empresa
  ADD COLUMN IF NOT EXISTS tenant_id              TEXT,
  ADD COLUMN IF NOT EXISTS serie_rps              TEXT    DEFAULT '1',
  ADD COLUMN IF NOT EXISTS codigo_municipio       TEXT,
  ADD COLUMN IF NOT EXISTS item_lista_servico     TEXT    DEFAULT '7.09',
  ADD COLUMN IF NOT EXISTS aliquota_iss           NUMERIC(5,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS natureza_operacao      INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS regime_tributario_cod  INTEGER DEFAULT 1;

-- Propaga municipio_codigo → codigo_municipio para registros existentes
UPDATE public.configuracoes_fiscais_empresa
SET codigo_municipio = municipio_codigo
WHERE codigo_municipio IS NULL AND municipio_codigo IS NOT NULL;

-- ------------------------------------------------------------
-- 2) Credenciais por provider
-- ------------------------------------------------------------
ALTER TABLE public.configuracoes_fiscais_empresa
  -- Focus NFe: token direto (autenticação Basic base64(token:))
  ADD COLUMN IF NOT EXISTS focus_token  TEXT,
  -- AtendeNet: login + senha (autenticação própria)
  ADD COLUMN IF NOT EXISTS login        TEXT,
  ADD COLUMN IF NOT EXISTS senha        TEXT;

-- ------------------------------------------------------------
-- 3) Colunas para Reforma Tributária 2026+ (opcionais)
-- ------------------------------------------------------------
ALTER TABLE public.configuracoes_fiscais_empresa
  ADD COLUMN IF NOT EXISTS cbs_habilitado  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ibs_habilitado  BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------
-- 4) Índice: busca por tenant_id
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_config_fiscal_tenant
  ON public.configuracoes_fiscais_empresa (tenant_id)
  WHERE ativo = TRUE;

-- ------------------------------------------------------------
-- 5) Tabela nfse_logs (log dedicado de integração NFS-e)
--    Complementa fiscal_integracao_logs com campos específicos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfse_logs (
  id               BIGSERIAL PRIMARY KEY,
  nota_fiscal_id   BIGINT      REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  tenant_id        TEXT,
  empresa_id       UUID,
  provider         TEXT        NOT NULL,
  tipo_operacao    TEXT        NOT NULL,   -- emitir | cancelar | consultar | autenticar
  ambiente         TEXT,
  json_enviado     JSONB,
  json_recebido    JSONB,
  http_status      INTEGER,
  status           TEXT,                   -- sucesso | erro | pendente
  protocolo        TEXT,
  mensagem         TEXT,
  tentativa        INTEGER     DEFAULT 1,
  usuario_id       UUID,
  correlation_id   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfse_logs_nota        ON public.nfse_logs (nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nfse_logs_correlation ON public.nfse_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_nfse_logs_tenant      ON public.nfse_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_nfse_logs_created     ON public.nfse_logs (created_at DESC);

-- RLS: apenas service_role acessa
ALTER TABLE public.nfse_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nfse_logs' AND policyname='service_role_nfse_logs') THEN
    CREATE POLICY "service_role_nfse_logs" ON public.nfse_logs FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 6) Atualiza seed existente com os novos campos
-- ------------------------------------------------------------
UPDATE public.configuracoes_fiscais_empresa
SET
  serie_rps           = COALESCE(serie_rps, '13'),
  item_lista_servico  = COALESCE(item_lista_servico, '7.09'),
  aliquota_iss        = COALESCE(aliquota_iss, 2.00),
  natureza_operacao   = COALESCE(natureza_operacao, 1),
  regime_tributario_cod = COALESCE(regime_tributario_cod, 1),
  codigo_municipio    = COALESCE(codigo_municipio, municipio_codigo),
  updated_at          = NOW()
WHERE id = 9001;
