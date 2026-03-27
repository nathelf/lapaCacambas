-- Seed de configuração bancária para ambiente de homologação
INSERT INTO public.configuracoes_bancarias_empresa (
  id,
  empresa_id,
  banco_nome,
  provedor_bancario,
  ambiente,
  api_base_url,
  client_id,
  client_secret,
  webhook_url,
  ativo
)
VALUES (
  9101,
  '00000000-0000-0000-0000-000000000001',
  'Itaú',
  'itau-api',
  'homologacao',
  'https://api.banco-hml.local',
  'CLIENT_ID_HML_LAPA',
  'CLIENT_SECRET_REF_HML',
  'https://sistema.lapa.local/api/boletos/webhook',
  true
)
ON CONFLICT (id) DO UPDATE SET
  banco_nome = EXCLUDED.banco_nome,
  provedor_bancario = EXCLUDED.provedor_bancario,
  ambiente = EXCLUDED.ambiente,
  api_base_url = EXCLUDED.api_base_url,
  webhook_url = EXCLUDED.webhook_url,
  ativo = EXCLUDED.ativo,
  updated_at = now();

SELECT setval('public.configuracoes_bancarias_empresa_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.configuracoes_bancarias_empresa), 9101), true);

