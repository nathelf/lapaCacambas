-- Desativa provider mock em configuração fiscal de produção.
-- 1) Converte registros legados que ainda estavam em mock.
-- 2) Troca default para atendenet (integração real).
-- 3) Impede novo cadastro com mock.

UPDATE configuracoes_fiscais_empresa
SET provedor_fiscal = 'atendenet'
WHERE lower(coalesce(provedor_fiscal, '')) = 'mock';

ALTER TABLE configuracoes_fiscais_empresa
ALTER COLUMN provedor_fiscal SET DEFAULT 'atendenet';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_config_fiscal_provider_not_mock'
  ) THEN
    ALTER TABLE configuracoes_fiscais_empresa
    ADD CONSTRAINT chk_config_fiscal_provider_not_mock
    CHECK (lower(coalesce(provedor_fiscal, '')) <> 'mock');
  END IF;
END $$;
