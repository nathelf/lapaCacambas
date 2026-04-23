-- Alinha notas_fiscais com emitir_nota_fiscal_atomica (sprint2), que referencia mensagem_erro.
-- Bancos criados só pelo schema inicial tinham apenas erro_mensagem.

ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS mensagem_erro TEXT;

UPDATE public.notas_fiscais
SET mensagem_erro = COALESCE(mensagem_erro, erro_mensagem)
WHERE mensagem_erro IS NULL AND erro_mensagem IS NOT NULL;
