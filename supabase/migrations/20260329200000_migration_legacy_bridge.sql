-- ============================================================
-- BRIDGE DE MIGRAÇÃO LEGADO → SISTEMA (LAPACacambas)
-- Rastreabilidade de IDs; colunas opcionais de origem; logs.
-- Não remove dados. Execute ANTES do ETL em ambiente de destino.
-- ============================================================

-- 1) Mapa global legacy_id → new_id (bigint, entidades operacionais)
CREATE TABLE IF NOT EXISTS public.migration_legacy_id_map (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  legacy_id BIGINT NOT NULL,
  new_id BIGINT NOT NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_mig_map_entity_type ON public.migration_legacy_id_map (entity_type);
CREATE INDEX IF NOT EXISTS idx_mig_map_new_id ON public.migration_legacy_id_map (entity_type, new_id);

COMMENT ON TABLE public.migration_legacy_id_map IS
  'Mapeamento de PKs legadas (integer/bigint) para IDs do sistema após INSERT.';

-- 2) Log de execução do ETL
CREATE TABLE IF NOT EXISTS public.migration_run_log (
  id BIGSERIAL PRIMARY KEY,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  rows_affected BIGINT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mig_run_phase ON public.migration_run_log (phase, started_at DESC);

-- 3) Rastreabilidade direta nas tabelas principais (idempotência / auditoria)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS legacy_codigo_cliente INTEGER;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS legacy_codigo_pedido INTEGER;

ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS legacy_codigo_fatura INTEGER;

ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS legacy_codigo_boleto INTEGER;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS legacy_codigo_fornecedor INTEGER;

ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS legacy_codigo_motorista INTEGER;

ALTER TABLE public.unidades_cacamba
  ADD COLUMN IF NOT EXISTS legacy_codigo_unidade INTEGER;

-- Unicidade parcial para não duplicar reimportação acidental
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_legacy_codigo
  ON public.clientes (legacy_codigo_cliente) WHERE legacy_codigo_cliente IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pedidos_legacy_codigo
  ON public.pedidos (legacy_codigo_pedido) WHERE legacy_codigo_pedido IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faturas_legacy_codigo
  ON public.faturas (legacy_codigo_fatura) WHERE legacy_codigo_fatura IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_boletos_legacy_codigo
  ON public.boletos (legacy_codigo_boleto) WHERE legacy_codigo_boleto IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_legacy_codigo
  ON public.fornecedores (legacy_codigo_fornecedor) WHERE legacy_codigo_fornecedor IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_motoristas_legacy_codigo
  ON public.motoristas (legacy_codigo_motorista) WHERE legacy_codigo_motorista IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_unidades_cacamba_legacy_codigo
  ON public.unidades_cacamba (legacy_codigo_unidade) WHERE legacy_codigo_unidade IS NOT NULL;

COMMENT ON COLUMN public.clientes.legacy_codigo_cliente IS 'PK antiga cliente.codigo_cliente (legado)';
COMMENT ON COLUMN public.pedidos.legacy_codigo_pedido IS 'PK antiga pedido.codigo_pedido (legado)';

-- 4) RLS: service_role / postgres em migrações; políticas opcionais para authenticated
ALTER TABLE public.migration_legacy_id_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_run_log ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para leitura (ajuste conforme política da empresa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'migration_legacy_id_map' AND policyname = 'migration_maps_read_authenticated'
  ) THEN
    CREATE POLICY migration_maps_read_authenticated
      ON public.migration_legacy_id_map FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'migration_run_log' AND policyname = 'migration_log_read_authenticated'
  ) THEN
    CREATE POLICY migration_log_read_authenticated
      ON public.migration_run_log FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
