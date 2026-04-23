-- Código de tributação municipal do serviço (IPM / ex.: Cascavel-PR); exigido em vários municípios (tag codigo_atividade).
-- Versão 20260422231000: evita colisão com 20260422230000_emitir_nota_fiscal_atomica_status_enum.sql
ALTER TABLE public.configuracoes_fiscais_empresa
  ADD COLUMN IF NOT EXISTS codigo_atividade TEXT;

COMMENT ON COLUMN public.configuracoes_fiscais_empresa.codigo_atividade IS
  'Código de tributação municipal do serviço (NFS-e IPM), não CNAE; enviado na tag codigo_atividade do XML.';
