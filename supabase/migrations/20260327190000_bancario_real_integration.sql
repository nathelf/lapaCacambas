-- ============================================================
-- INTEGRACAO BANCARIA REAL (backend)
-- ============================================================

-- 1) Configuracoes bancarias por empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_bancarias_empresa (
  id BIGSERIAL PRIMARY KEY,
  empresa_id UUID,
  banco_nome TEXT NOT NULL,
  provedor_bancario TEXT NOT NULL,
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  api_base_url TEXT,
  client_id TEXT,
  client_secret TEXT,
  api_key TEXT,
  certificado_ref TEXT,
  certificado_password_ref TEXT,
  webhook_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  token_atual TEXT,
  token_expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cfg_bancaria_empresa_ativa
  ON public.configuracoes_bancarias_empresa (empresa_id)
  WHERE ativo = true;

-- 2) Tabela de logs tecnicos de integracao bancaria
CREATE TABLE IF NOT EXISTS public.banco_integracao_logs (
  id BIGSERIAL PRIMARY KEY,
  boleto_id BIGINT REFERENCES public.boletos(id) ON DELETE CASCADE,
  empresa_id UUID,
  tipo_operacao TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  http_status INT,
  status_integracao TEXT,
  mensagem TEXT,
  tentativa INT NOT NULL DEFAULT 1,
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banco_logs_boleto ON public.banco_integracao_logs (boleto_id);
CREATE INDEX IF NOT EXISTS idx_banco_logs_empresa ON public.banco_integracao_logs (empresa_id);
CREATE INDEX IF NOT EXISTS idx_banco_logs_tipo ON public.banco_integracao_logs (tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_banco_logs_status ON public.banco_integracao_logs (status_integracao);
CREATE INDEX IF NOT EXISTS idx_banco_logs_executado ON public.banco_integracao_logs (executado_em DESC);

-- 3) Evolucao status_boleto para cobrir fluxo real
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'status_boleto' AND e.enumlabel = 'rascunho'
  ) THEN
    ALTER TYPE public.status_boleto ADD VALUE 'rascunho';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'status_boleto' AND e.enumlabel = 'erro'
  ) THEN
    ALTER TYPE public.status_boleto ADD VALUE 'erro';
  END IF;
END $$;

-- 4) Ajustes em boletos
ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS payload_envio JSONB,
  ADD COLUMN IF NOT EXISTS payload_retorno JSONB,
  ADD COLUMN IF NOT EXISTS mensagem_erro TEXT;

CREATE INDEX IF NOT EXISTS idx_boletos_external_id ON public.boletos(external_id);
CREATE INDEX IF NOT EXISTS idx_boletos_integracao_status ON public.boletos(integracao_status);
CREATE INDEX IF NOT EXISTS idx_boletos_status_venc ON public.boletos(status, data_vencimento);

-- 5) Ajustes em faturas para fluxo boleto real
ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS boleto_id BIGINT REFERENCES public.boletos(id);

CREATE INDEX IF NOT EXISTS idx_faturas_boleto_id ON public.faturas(boleto_id);

-- 6) RLS para novas tabelas
ALTER TABLE public.configuracoes_bancarias_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_integracao_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'configuracoes_bancarias_empresa' AND policyname = 'authenticated_all_configuracoes_bancarias_empresa'
  ) THEN
    CREATE POLICY authenticated_all_configuracoes_bancarias_empresa
      ON public.configuracoes_bancarias_empresa
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'banco_integracao_logs' AND policyname = 'authenticated_all_banco_integracao_logs'
  ) THEN
    CREATE POLICY authenticated_all_banco_integracao_logs
      ON public.banco_integracao_logs
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

