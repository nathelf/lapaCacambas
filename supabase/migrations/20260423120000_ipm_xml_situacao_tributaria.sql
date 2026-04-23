-- Campos opcionais do bloco <lista> IPM / AtendeNet (situação tributária e flags de município).
ALTER TABLE public.configuracoes_fiscais_empresa
  ADD COLUMN IF NOT EXISTS ipm_situacao_tributaria TEXT DEFAULT '0',
  ADD COLUMN IF NOT EXISTS ipm_tributa_municipio_prestador TEXT DEFAULT 'N',
  ADD COLUMN IF NOT EXISTS ipm_tributa_municipio_tomador TEXT DEFAULT 'N';

COMMENT ON COLUMN public.configuracoes_fiscais_empresa.ipm_situacao_tributaria IS
  'IPM: tag situacao_tributaria (0=TI, 1=TIRF retido tomador, 2=TIST, etc.).';
COMMENT ON COLUMN public.configuracoes_fiscais_empresa.ipm_tributa_municipio_prestador IS
  'IPM: tag tributa_municipio_prestador (S/N). Ex.: nota Cascavel com ISS no município do prestador.';
COMMENT ON COLUMN public.configuracoes_fiscais_empresa.ipm_tributa_municipio_tomador IS
  'IPM: tag tributa_municipio_tomador (S/N).';
