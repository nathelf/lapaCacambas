<?php
/**
 * NfseXmlBuilder.php
 * Constrói o XML de emissão de NFS-e conforme:
 *   - NTE-35/2021 v2.8  (layout padrão)
 *   - NTE-122/2025 v1.5 (bloco IBSCBS — Reforma Tributária IBS/CBS)
 *
 * USO BÁSICO:
 *   $builder = new NfseXmlBuilder();
 *   $builder->setNf([...])
 *           ->setPrestador([...])
 *           ->setTomador([...])
 *           ->addItem([...])
 *           ->setIbsCbs([...]); // opcional — Reforma Tributária
 *   $xml = $builder->build();
 */

require_once __DIR__ . '/NfseConfig.php';

class NfseXmlBuilder
{
    // -----------------------------------------------------------------------
    // DADOS DA NOTA
    // -----------------------------------------------------------------------

    private array $nf          = [];
    private array $prestador   = [];
    private array $tomador     = [];
    private array $itens       = [];
    private array $ibsCbs      = [];
    private array $genericos   = [];
    private array $produtos    = [];
    private array $formaPag    = [];
    private bool  $usarIbsCbs  = false;

    // -----------------------------------------------------------------------
    // SETTERS FLUENTES
    // -----------------------------------------------------------------------

    /**
     * Dados financeiros da nota.
     *
     * Chaves aceitas:
     *   valor_total (obrigatório), valor_desconto, valor_ir, valor_inss,
     *   valor_contribuicao_social, valor_rps, observacao,
     *   serie_nfse, data_fato_gerador
     *
     * Para Reforma Tributária (NTE-122/2025):
     *   pis_cofins => ['cst','base_calculo','aliquota_pis','aliquota_cofins']
     *   valor_pis, valor_cofins  (retenção)
     */
    public function setNf(array $dados): static
    {
        $this->nf = $dados;
        return $this;
    }

    /**
     * Dados do prestador.
     * Chaves: cpfcnpj (obrigatório), cidade (código TOM, obrigatório)
     */
    public function setPrestador(array $dados): static
    {
        $this->prestador = $dados;
        return $this;
    }

    /**
     * Dados do tomador.
     * Chaves: tipo (J/F/E, obrigatório), cpfcnpj, nome_razao_social, logradouro,
     *         cidade (TOM), bairro, cep, email, numero_residencia, complemento,
     *         ddd_fone_comercial, fone_comercial, ie, sobrenome_nome_fantasia,
     *         ponto_referencia, estado, pais (E=estrangeiro), identificador,
     *         siglaPais, codigoIbgePais, ddd_fone_residencial, fone_residencial,
     *         ddd_fax, fone_fax, endereco_informado
     */
    public function setTomador(array $dados): static
    {
        $this->tomador = $dados;
        return $this;
    }

    /**
     * Adiciona um item de serviço.
     *
     * Chaves obrigatórias (NTE-35/2021):
     *   tributa_municipio_prestador (S/N), codigo_local_prestacao_servico,
     *   codigo_item_lista_servico, descritivo, aliquota_item_lista_servico,
     *   situacao_tributaria, valor_tributavel
     *
     * Chaves extras (NTE-122/2025):
     *   codigo_nbs (obrigatório para Reforma)
     *   valor_deducao, valor_issrf, valor_desconto_incondicional,
     *   tributa_municipio_tomador, unidade_codigo, unidade_quantidade,
     *   unidade_valor_unitario, codigo_atividade, cno
     */
    public function addItem(array $item): static
    {
        $this->itens[] = $item;
        return $this;
    }

    /**
     * Bloco IBS/CBS (Reforma Tributária — NTE-122/2025).
     *
     * Chaves:
     *   finNFSe       (0 = regular)
     *   indFinal      (0 = não consumo pessoal)
     *   cIndOp        (código indicador de operação, ex: '020101')
     *   tpOper        (opcional — imóveis/governo)
     *   CST           (código situação tributária IBS/CBS)
     *   cClassTrib    (classificação tributária)
     *   imovel        (array, opcional: inscImobFisc, cCIB, end=>CEP/xLgr/nro/xCpl/xBairro)
     *   gRefNFSe      (array de refNFSe, usado quando tpOper=2 ou 3)
     */
    public function setIbsCbs(array $dados): static
    {
        $this->ibsCbs   = $dados;
        $this->usarIbsCbs = true;
        return $this;
    }

    /** Campos genéricos livres (aparecem na nota) */
    public function addGenerico(string $titulo, string $descricao): static
    {
        $this->genericos[] = ['titulo' => $titulo, 'descricao' => $descricao];
        return $this;
    }

    /** Produtos relacionados na NFS-e */
    public function setProdutos(string $descricao, string $valor): static
    {
        $this->produtos = ['descricao' => $descricao, 'valor' => $valor];
        return $this;
    }

    /**
     * Forma de pagamento e parcelas.
     * tipo_pagamento: 1=À vista, 2=A prazo, 3=Depósito, 4=Na apresentação,
     *                 5=Cartão débito, 6=Cartão crédito, 7=Cheque, 8=PIX, 9=Boleto
     * parcelas: [['numero'=>1,'valor'=>'100,00','data_vencimento'=>'01/01/2026'], ...]
     */
    public function setFormaPagamento(int $tipoPagamento, array $parcelas = []): static
    {
        $this->formaPag = [
            'tipo_pagamento' => $tipoPagamento,
            'parcelas'       => $parcelas,
        ];
        return $this;
    }

    // -----------------------------------------------------------------------
    // GERAÇÃO DO XML
    // -----------------------------------------------------------------------

    public function build(bool $modoTeste = false): string
    {
        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<nfse>' . PHP_EOL;

        // Modo teste (NTE-35/2021 §4.8 / NTE-122/2025 §2)
        if ($modoTeste || NfseConfig::MODO_TESTE) {
            $xml .= $this->tag('nfse_teste', '1');
        }

        // Bloco <nf>
        $xml .= $this->buildNf();

        // Prestador
        $xml .= $this->buildPrestador();

        // Tomador
        $xml .= $this->buildTomador();

        // Itens
        $xml .= $this->buildItens();

        // IBS/CBS — Reforma Tributária (NTE-122/2025)
        if ($this->usarIbsCbs || NfseConfig::USAR_REFORMA_TRIBUTARIA) {
            $xml .= $this->buildIbsCbs();
        }

        // Genéricos
        if (!empty($this->genericos)) {
            $xml .= $this->buildGenericos();
        }

        // Produtos
        if (!empty($this->produtos)) {
            $xml .= $this->buildProdutos();
        }

        // Forma de pagamento
        if (!empty($this->formaPag)) {
            $xml .= $this->buildFormaPagamento();
        }

        $xml .= '</nfse>' . PHP_EOL;

        return $xml;
    }

    // -----------------------------------------------------------------------
    // BUILDERS INTERNOS
    // -----------------------------------------------------------------------

    private function buildNf(): string
    {
        $nf = $this->nf;
        $x  = '<nf>' . PHP_EOL;

        $x .= $this->tagOpc('serie_nfse',           $nf['serie_nfse']          ?? '');
        $x .= $this->tagOpc('data_fato_gerador',     $nf['data_fato_gerador']   ?? '');
        $x .= $this->tag   ('valor_total',            $nf['valor_total']);
        $x .= $this->tagOpc('valor_desconto',         $nf['valor_desconto']      ?? '');
        $x .= $this->tagOpc('valor_ir',               $nf['valor_ir']            ?? '');
        $x .= $this->tagOpc('valor_inss',             $nf['valor_inss']          ?? '');
        $x .= $this->tagOpc('valor_contribuicao_social', $nf['valor_contribuicao_social'] ?? '');
        $x .= $this->tagOpc('valor_rps',              $nf['valor_rps']           ?? '');

        // PIS/COFINS próprio (NTE-122/2025 §3)
        if (!empty($nf['pis_cofins'])) {
            $pc = $nf['pis_cofins'];
            $x .= '<pis_cofins>' . PHP_EOL;
            $x .= $this->tagOpc('cst',            $pc['cst']            ?? '');
            $x .= $this->tagOpc('base_calculo',   $pc['base_calculo']   ?? '');
            $x .= $this->tagOpc('aliquota_pis',   $pc['aliquota_pis']   ?? '');
            $x .= $this->tagOpc('aliquota_cofins',$pc['aliquota_cofins'] ?? '');
            $x .= '</pis_cofins>' . PHP_EOL;
        }

        // PIS/COFINS retido (tags antigas — NTE-122/2025 §3)
        $x .= $this->tagOpc('valor_pis',    $nf['valor_pis']    ?? '');
        $x .= $this->tagOpc('valor_cofins', $nf['valor_cofins'] ?? '');
        $x .= $this->tagOpc('observacao',   $nf['observacao']   ?? '');

        $x .= '</nf>' . PHP_EOL;
        return $x;
    }

    private function buildPrestador(): string
    {
        $p  = $this->prestador;
        $x  = '<prestador>' . PHP_EOL;
        $x .= $this->tag('cpfcnpj', $p['cpfcnpj'] ?? NfseConfig::PRESTADOR_CPFCNPJ);
        $x .= $this->tag('cidade',  $p['cidade']   ?? NfseConfig::CIDADE_TOM);
        $x .= '</prestador>' . PHP_EOL;
        return $x;
    }

    private function buildTomador(): string
    {
        $t  = $this->tomador;
        $x  = '<tomador>' . PHP_EOL;
        $x .= $this->tagOpc('endereco_informado',      $t['endereco_informado']      ?? '');
        $x .= $this->tag   ('tipo',                     $t['tipo']);
        $x .= $this->tagOpc('identificador',            $t['identificador']            ?? '');
        $x .= $this->tagOpc('cpfcnpj',                 $t['cpfcnpj']                 ?? '');
        $x .= $this->tagOpc('ie',                      $t['ie']                      ?? '');
        $x .= $this->tagOpc('sobrenome_nome_fantasia',  $t['sobrenome_nome_fantasia']  ?? '');
        $x .= $this->tagOpc('nome_razao_social',        $t['nome_razao_social']        ?? '');
        $x .= $this->tagOpc('logradouro',               $t['logradouro']               ?? '');
        $x .= $this->tagOpc('numero_residencia',        $t['numero_residencia']        ?? '');
        $x .= $this->tagOpc('complemento',              $t['complemento']              ?? '');
        $x .= $this->tagOpc('ponto_referencia',         $t['ponto_referencia']         ?? '');
        $x .= $this->tagOpc('bairro',                   $t['bairro']                   ?? '');
        $x .= $this->tagOpc('cidade',                   $t['cidade']                   ?? '');
        $x .= $this->tagOpc('cep',                      $t['cep']                      ?? '');
        $x .= $this->tagOpc('pais',                     $t['pais']                     ?? '');
        $x .= $this->tagOpc('siglaPais',                $t['siglaPais']                ?? '');
        $x .= $this->tagOpc('codigoIbgePais',           $t['codigoIbgePais']           ?? '');
        $x .= $this->tagOpc('estado',                   $t['estado']                   ?? '');
        $x .= $this->tagOpc('ddd_fone_residencial',     $t['ddd_fone_residencial']     ?? '');
        $x .= $this->tagOpc('fone_residencial',         $t['fone_residencial']         ?? '');
        $x .= $this->tagOpc('ddd_fone_comercial',       $t['ddd_fone_comercial']       ?? '');
        $x .= $this->tagOpc('fone_comercial',           $t['fone_comercial']           ?? '');
        $x .= $this->tagOpc('ddd_fax',                  $t['ddd_fax']                  ?? '');
        $x .= $this->tagOpc('fone_fax',                 $t['fone_fax']                 ?? '');
        $x .= $this->tagOpc('email',                    $t['email']                    ?? '');
        $x .= '</tomador>' . PHP_EOL;
        return $x;
    }

    private function buildItens(): string
    {
        $x = '<itens>' . PHP_EOL;
        foreach ($this->itens as $item) {
            $x .= '<lista>' . PHP_EOL;
            $x .= $this->tag   ('codigo_local_prestacao_servico', $item['codigo_local_prestacao_servico']);
            $x .= $this->tagOpc('codigo_pais_prestacao_servico',  $item['codigo_pais_prestacao_servico'] ?? '');
            $x .= $this->tagOpc('codigo_nbs',                     $item['codigo_nbs']                    ?? '');
            $x .= $this->tag   ('codigo_item_lista_servico',      $item['codigo_item_lista_servico']);
            $x .= $this->tag   ('descritivo',                     $item['descritivo']);
            $x .= $this->tag   ('aliquota_item_lista_servico',    $item['aliquota_item_lista_servico']);
            $x .= $this->tag   ('situacao_tributaria',            $item['situacao_tributaria']);
            $x .= $this->tag   ('valor_tributavel',               $item['valor_tributavel']);
            $x .= $this->tagOpc('valor_deducao',                  $item['valor_deducao']                 ?? '');
            $x .= $this->tagOpc('valor_issrf',                    $item['valor_issrf']                   ?? '');
            $x .= $this->tagOpc('valor_desconto_incondicional',   $item['valor_desconto_incondicional']  ?? '');
            $x .= $this->tagOpc('unidade_codigo',                 $item['unidade_codigo']                ?? '');
            $x .= $this->tagOpc('unidade_quantidade',             $item['unidade_quantidade']            ?? '');
            $x .= $this->tagOpc('unidade_valor_unitario',         $item['unidade_valor_unitario']        ?? '');
            $x .= $this->tagOpc('codigo_atividade',               $item['codigo_atividade']              ?? '');
            $x .= $this->tagOpc('cno',                            $item['cno']                           ?? '');
            $x .= $this->tag   ('tributa_municipio_prestador',    $item['tributa_municipio_prestador']);
            $x .= $this->tagOpc('tributa_municipio_tomador',      $item['tributa_municipio_tomador']     ?? '');
            $x .= '</lista>' . PHP_EOL;
        }
        $x .= '</itens>' . PHP_EOL;
        return $x;
    }

    /**
     * Bloco IBSCBS — NTE-122/2025 v1.5
     * Inclui finNFSe, indFinal, cIndOp, tpOper, imovel, valores CST/cClassTrib.
     * A partir de 2027 será obrigatório; em 2026 ainda é facultativo.
     */
    private function buildIbsCbs(): string
    {
        $d = $this->ibsCbs;

        $x  = '<IBSCBS>' . PHP_EOL;
        $x .= $this->tag('finNFSe',  $d['finNFSe']  ?? NfseConfig::IBSCBS_FIN_NFSE);
        $x .= $this->tag('indFinal', $d['indFinal'] ?? NfseConfig::IBSCBS_IND_FINAL);
        $x .= $this->tag('cIndOp',   $d['cIndOp']   ?? NfseConfig::IBSCBS_C_IND_OP);

        // tpOper: apenas imóveis/serviços específicos
        if (!empty($d['tpOper'])) {
            $x .= $this->tag('tpOper', $d['tpOper']);
        }

        // gRefNFSe — somente quando tpOper = 2 ou 3
        if (!empty($d['gRefNFSe'])) {
            $x .= '<gRefNFSe>' . PHP_EOL;
            foreach ((array)$d['gRefNFSe'] as $ref) {
                $x .= $this->tag('refNFSe', $ref);
            }
            $x .= '</gRefNFSe>' . PHP_EOL;
        }

        // Imóvel — obrigatório quando cIndOp = 020101, 020201, 020301
        if (!empty($d['imovel'])) {
            $im = $d['imovel'];
            $x .= '<imovel>' . PHP_EOL;
            $x .= $this->tagOpc('inscImobFisc', $im['inscImobFisc'] ?? '');
            $x .= $this->tagOpc('cCIB',         $im['cCIB']         ?? '');
            if (!empty($im['end'])) {
                $e  = $im['end'];
                $x .= '<end>' . PHP_EOL;
                $x .= $this->tagOpc('CEP',     $e['CEP']     ?? '');
                $x .= $this->tagOpc('xLgr',    $e['xLgr']    ?? '');
                $x .= $this->tagOpc('nro',     $e['nro']     ?? '');
                $x .= $this->tagOpc('xCpl',    $e['xCpl']    ?? '');
                $x .= $this->tagOpc('xBairro', $e['xBairro'] ?? '');
                $x .= '</end>' . PHP_EOL;
            }
            $x .= '</imovel>' . PHP_EOL;
        }

        // Valores CST/cClassTrib
        $x .= '<valores>' . PHP_EOL;
        $x .= '<trib>' . PHP_EOL;
        $x .= '<gIBSCBS>' . PHP_EOL;
        $x .= $this->tag('CST',        $d['CST']        ?? NfseConfig::IBSCBS_CST);
        $x .= $this->tag('cClassTrib', $d['cClassTrib'] ?? NfseConfig::IBSCBS_C_CLASS_TRIB);
        $x .= '</gIBSCBS>' . PHP_EOL;
        $x .= '</trib>' . PHP_EOL;
        $x .= '</valores>' . PHP_EOL;

        $x .= '</IBSCBS>' . PHP_EOL;
        return $x;
    }

    private function buildGenericos(): string
    {
        $x = '<genericos>' . PHP_EOL;
        foreach ($this->genericos as $g) {
            $x .= '<linha>' . PHP_EOL;
            $x .= $this->tagOpc('titulo',    $g['titulo']    ?? '');
            $x .= $this->tagOpc('descricao', $g['descricao'] ?? '');
            $x .= '</linha>' . PHP_EOL;
        }
        $x .= '</genericos>' . PHP_EOL;
        return $x;
    }

    private function buildProdutos(): string
    {
        $x  = '<produtos>' . PHP_EOL;
        $x .= $this->tagOpc('descricao', $this->produtos['descricao'] ?? '');
        $x .= $this->tagOpc('valor',     $this->produtos['valor']     ?? '');
        $x .= '</produtos>' . PHP_EOL;
        return $x;
    }

    private function buildFormaPagamento(): string
    {
        $fp = $this->formaPag;
        $x  = '<forma_pagamento>' . PHP_EOL;
        $x .= $this->tag('tipo_pagamento', $fp['tipo_pagamento']);

        if (!empty($fp['parcelas'])) {
            $x .= '<parcelas>' . PHP_EOL;
            foreach ($fp['parcelas'] as $p) {
                $x .= '<parcela>' . PHP_EOL;
                $x .= $this->tag('numero',          $p['numero']);
                $x .= $this->tag('valor',           $p['valor']);
                $x .= $this->tag('data_vencimento', $p['data_vencimento']);
                $x .= '</parcela>' . PHP_EOL;
            }
            $x .= '</parcelas>' . PHP_EOL;
        }

        $x .= '</forma_pagamento>' . PHP_EOL;
        return $x;
    }

    // -----------------------------------------------------------------------
    // HELPERS DE TAG
    // -----------------------------------------------------------------------

    /** Tag obrigatória — lança exceção se vazia */
    private function tag(string $nome, $valor): string
    {
        if ($valor === '' || $valor === null) {
            throw new \InvalidArgumentException("Tag obrigatória <{$nome}> está vazia.");
        }
        return "<{$nome}>" . $this->escape($valor) . "</{$nome}>" . PHP_EOL;
    }

    /** Tag opcional — omite se vazia */
    private function tagOpc(string $nome, $valor): string
    {
        if ($valor === '' || $valor === null) {
            return '';
        }
        return "<{$nome}>" . $this->escape($valor) . "</{$nome}>" . PHP_EOL;
    }

    /**
     * Escapa caracteres proibidos no XML da IPM (NTE-35/2021 §4, Tabela 3).
     * ATENÇÃO: a barra "/" não é permitida — use texto sem barras nos campos.
     */
    private function escape($valor): string
    {
        $valor = (string)$valor;
        $valor = str_replace('&',  '&amp;',  $valor);
        $valor = str_replace('<',  '&lt;',   $valor);
        $valor = str_replace('>',  '&gt;',   $valor);
        $valor = str_replace("'",  '&apos;', $valor);
        $valor = str_replace('"',  '&quot;', $valor);
        // "/" não permitido — remove silenciosamente
        $valor = str_replace('/', '', $valor);
        return $valor;
    }
}
