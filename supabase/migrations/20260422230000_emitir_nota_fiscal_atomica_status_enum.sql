-- Corrige tipo na função emitir_nota_fiscal_atomica:
-- coluna notas_fiscais.status é enum status_nota_fiscal; JSONB ->> retorna text.

CREATE OR REPLACE FUNCTION public.emitir_nota_fiscal_atomica(
  p_nota_data    JSONB,
  p_pedido_ids   BIGINT[],
  p_valor_total  NUMERIC,
  p_usuario_id   UUID,
  p_correlation_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nota          public.notas_fiscais;
  v_pedido_id     BIGINT;
  v_valor_por_pedido NUMERIC;
  v_status        TEXT;
BEGIN
  INSERT INTO public.notas_fiscais (
    empresa_id, cliente_id, obra_id, pedido_id, fatura_id,
    numero, numero_nota, serie, tipo_documento,
    status, ambiente, data_emissao,
    valor_total, base_calculo, valor_iss, valor_impostos,
    codigo_servico, descricao_servico, observacoes_fiscais,
    chave_acesso, protocolo, xml_url, pdf_url,
    payload_envio, payload_retorno, mensagem_erro,
    external_id, lote_id,
    created_by, updated_by
  )
  SELECT
    (p_nota_data->>'empresa_id')::UUID,
    (p_nota_data->>'cliente_id')::BIGINT,
    (p_nota_data->>'obra_id')::BIGINT,
    (p_nota_data->>'pedido_id')::BIGINT,
    (p_nota_data->>'fatura_id')::BIGINT,
    p_nota_data->>'numero',
    p_nota_data->>'numero_nota',
    COALESCE(p_nota_data->>'serie', '1'),
    COALESCE(p_nota_data->>'tipo_documento', 'NFS-e'),
    COALESCE(
      NULLIF(trim(p_nota_data->>'status'), '')::public.status_nota_fiscal,
      'pendente'::public.status_nota_fiscal
    ),
    p_nota_data->>'ambiente',
    COALESCE((p_nota_data->>'data_emissao')::TIMESTAMPTZ, now()),
    COALESCE((p_nota_data->>'valor_total')::NUMERIC, 0),
    COALESCE((p_nota_data->>'base_calculo')::NUMERIC, 0),
    COALESCE((p_nota_data->>'valor_iss')::NUMERIC, 0),
    COALESCE((p_nota_data->>'valor_impostos')::NUMERIC, 0),
    p_nota_data->>'codigo_servico',
    p_nota_data->>'descricao_servico',
    p_nota_data->>'observacoes_fiscais',
    p_nota_data->>'chave_acesso',
    p_nota_data->>'protocolo',
    p_nota_data->>'xml_url',
    p_nota_data->>'pdf_url',
    p_nota_data->'payload_envio',
    p_nota_data->'payload_retorno',
    p_nota_data->>'mensagem_erro',
    p_nota_data->>'external_id',
    p_nota_data->>'lote_id',
    p_usuario_id,
    p_usuario_id
  RETURNING * INTO v_nota;

  v_valor_por_pedido := CASE
    WHEN array_length(p_pedido_ids, 1) > 0
    THEN p_valor_total / array_length(p_pedido_ids, 1)
    ELSE 0
  END;

  FOREACH v_pedido_id IN ARRAY p_pedido_ids LOOP
    INSERT INTO public.nota_fiscal_pedidos (nota_fiscal_id, pedido_id, valor, valor_vinculado)
    VALUES (v_nota.id, v_pedido_id, v_valor_por_pedido, v_valor_por_pedido)
    ON CONFLICT (nota_fiscal_id, pedido_id) DO NOTHING;
  END LOOP;

  v_status := COALESCE(v_nota.status::text, 'pendente');

  UPDATE public.pedidos
  SET
    nota_fiscal_id     = v_nota.id,
    status_fiscal      = CASE
                           WHEN v_status = 'emitida' THEN 'emitida'::public.status_nota_fiscal
                           ELSE status_fiscal
                         END,
    nota_fiscal_status = v_status,
    tem_nota_fiscal    = (v_status = 'emitida'),
    updated_at         = now()
  WHERE id = ANY(p_pedido_ids);

  INSERT INTO public.nota_fiscal_eventos (
    nota_fiscal_id, status_anterior, status_novo,
    descricao, usuario_id, correlation_id, dados_extras
  )
  VALUES (
    v_nota.id,
    'pendente',
    v_status,
    'Emissão processada via função atômica',
    p_usuario_id,
    p_correlation_id,
    jsonb_build_object(
      'pedidoIds', p_pedido_ids,
      'valorTotal', p_valor_total
    )
  );

  RETURN row_to_json(v_nota)::JSONB;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: nota com external_id=% já existe.',
      p_nota_data->>'external_id'
      USING ERRCODE = 'unique_violation';
END;
$$;

REVOKE ALL ON FUNCTION public.emitir_nota_fiscal_atomica FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emitir_nota_fiscal_atomica TO service_role;
