<?php
/**
 * NfseService.php
 * Fachada principal do WebService NFS-e IPM (Atende.Net).
 *
 * Operações:
 *   - emitir()    — Emissão de NFS-e (NTE-35/2021 + NTE-122/2025)
 *   - cancelar()  — Cancelamento de NFS-e (NTE-35/2021 §4.2)
 *   - consultar() — Consulta por código de autenticidade ou número/série (NTE-35/2021 §4.5)
 *   - testar()    — Envio em modo teste (não emite de fato)
 */

require_once __DIR__ . '/NfseConfig.php';
require_once __DIR__ . '/NfseHttpClient.php';
require_once __DIR__ . '/NfseXmlBuilder.php';
require_once __DIR__ . '/NfseRetorno.php';

class NfseService
{
    private NfseHttpClient $http;

    public function __construct()
    {
        $this->http = new NfseHttpClient(NfseConfig::URL_WS);
    }

    // -----------------------------------------------------------------------
    // EMISSÃO
    // -----------------------------------------------------------------------

    /**
     * Emite uma NFS-e.
     *
     * @param array $nf        Dados financeiros (valor_total obrigatório)
     * @param array $tomador   Dados do tomador (tipo obrigatório)
     * @param array $itens     Lista de itens de serviço (ao menos 1)
     * @param array $ibsCbs    Bloco IBS/CBS (Reforma Tributária — opcional em 2026)
     * @param array $opcoes    Opções extras: prestador, genericos, produtos, formaPag
     * @return NfseRetorno
     */
    public function emitir(
        array $nf,
        array $tomador,
        array $itens,
        array $ibsCbs = [],
        array $opcoes = []
    ): NfseRetorno {
        // Usa URL da Reforma para municípios com IBS/CBS
        if (!empty($ibsCbs) || NfseConfig::USAR_REFORMA_TRIBUTARIA) {
            $this->http->setUrl(NfseConfig::URL_WS_REFORMA);
        }

        $builder = new NfseXmlBuilder();
        $builder->setNf($nf)
                ->setPrestador($opcoes['prestador'] ?? [])
                ->setTomador($tomador);

        foreach ($itens as $item) {
            $builder->addItem($item);
        }

        if (!empty($ibsCbs)) {
            $builder->setIbsCbs($ibsCbs);
        } elseif (NfseConfig::USAR_REFORMA_TRIBUTARIA) {
            $builder->setIbsCbs([]);  // usa defaults do NfseConfig
        }

        foreach ($opcoes['genericos'] ?? [] as $g) {
            $builder->addGenerico($g['titulo'], $g['descricao']);
        }

        if (!empty($opcoes['produtos'])) {
            $builder->setProdutos(
                $opcoes['produtos']['descricao'],
                $opcoes['produtos']['valor']
            );
        }

        if (!empty($opcoes['formaPag'])) {
            $fp = $opcoes['formaPag'];
            $builder->setFormaPagamento($fp['tipo'], $fp['parcelas'] ?? []);
        }

        $xml      = $builder->build(false);
        $resultado = $this->http->enviar($xml);

        return new NfseRetorno($resultado['sucesso'] ? $resultado['resposta'] : $this->erroXml($resultado['erro']));
    }

    /**
     * Envia em modo teste — todas as validações ocorrem mas a nota NÃO é emitida.
     * Retorna "NFS-e válida para emissão" se o XML estiver correto.
     * (NTE-35/2021 §4.8 / NTE-122/2025 §2)
     */
    public function testar(
        array $nf,
        array $tomador,
        array $itens,
        array $ibsCbs = [],
        array $opcoes = []
    ): NfseRetorno {
        if (!empty($ibsCbs) || NfseConfig::USAR_REFORMA_TRIBUTARIA) {
            $this->http->setUrl(NfseConfig::URL_WS_REFORMA);
        }

        $builder = new NfseXmlBuilder();
        $builder->setNf($nf)
                ->setPrestador($opcoes['prestador'] ?? [])
                ->setTomador($tomador);

        foreach ($itens as $item) {
            $builder->addItem($item);
        }

        if (!empty($ibsCbs)) {
            $builder->setIbsCbs($ibsCbs);
        } elseif (NfseConfig::USAR_REFORMA_TRIBUTARIA) {
            $builder->setIbsCbs([]);
        }

        $xml      = $builder->build(true);  // <nfse_teste>1</nfse_teste>
        $resultado = $this->http->enviar($xml);

        return new NfseRetorno($resultado['sucesso'] ? $resultado['resposta'] : $this->erroXml($resultado['erro']));
    }

    // -----------------------------------------------------------------------
    // CANCELAMENTO
    // -----------------------------------------------------------------------

    /**
     * Cancela uma NFS-e (dentro do prazo configurado pelo município).
     * (NTE-35/2021 §4.2)
     *
     * @param string $numero     Número da NFS-e
     * @param string $serie      Série da NFS-e
     * @param string $motivo     Motivo do cancelamento
     * @return NfseRetorno
     */
    public function cancelar(string $numero, string $serie, string $motivo = ''): NfseRetorno
    {
        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<nfse>' . PHP_EOL;
        $xml .= '<nf>' . PHP_EOL;
        $xml .= '<numero>' . htmlspecialchars($numero) . '</numero>' . PHP_EOL;
        $xml .= '<serie_nfse>' . htmlspecialchars($serie) . '</serie_nfse>' . PHP_EOL;
        $xml .= '<situacao>C</situacao>' . PHP_EOL;
        if ($motivo !== '') {
            $xml .= '<observacao>' . htmlspecialchars($motivo) . '</observacao>' . PHP_EOL;
        }
        $xml .= '</nf>' . PHP_EOL;
        $xml .= '<prestador>' . PHP_EOL;
        $xml .= '<cpfcnpj>' . NfseConfig::PRESTADOR_CPFCNPJ . '</cpfcnpj>' . PHP_EOL;
        $xml .= '<cidade>' . NfseConfig::CIDADE_TOM . '</cidade>' . PHP_EOL;
        $xml .= '</prestador>' . PHP_EOL;
        $xml .= '</nfse>' . PHP_EOL;

        $resultado = $this->http->enviar($xml);
        return new NfseRetorno($resultado['sucesso'] ? $resultado['resposta'] : $this->erroXml($resultado['erro']));
    }

    // -----------------------------------------------------------------------
    // CONSULTA
    // -----------------------------------------------------------------------

    /**
     * Consulta NFS-e pelo código de autenticidade.
     * (NTE-35/2021 §4.5.1)
     */
    public function consultarPorAutenticidade(string $codigoAutenticidade): NfseRetorno
    {
        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<nfse>' . PHP_EOL;
        $xml .= '<pesquisa>' . PHP_EOL;
        $xml .= '<codigo_autenticidade>' . htmlspecialchars($codigoAutenticidade) . '</codigo_autenticidade>' . PHP_EOL;
        $xml .= '</pesquisa>' . PHP_EOL;
        $xml .= '</nfse>' . PHP_EOL;

        $resultado = $this->http->enviar($xml);
        return new NfseRetorno($resultado['sucesso'] ? $resultado['resposta'] : $this->erroXml($resultado['erro']));
    }

    /**
     * Consulta NFS-e por número, série e cadastro econômico.
     * (NTE-35/2021 §4.5.2)
     */
    public function consultarPorNumero(string $numero, string $serie, string $cadastro): NfseRetorno
    {
        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<nfse>' . PHP_EOL;
        $xml .= '<pesquisa>' . PHP_EOL;
        $xml .= '<numero>'    . htmlspecialchars($numero)   . '</numero>'    . PHP_EOL;
        $xml .= '<serie_nfse>'. htmlspecialchars($serie)    . '</serie_nfse>'. PHP_EOL;
        $xml .= '<cadastro>'  . htmlspecialchars($cadastro) . '</cadastro>'  . PHP_EOL;
        $xml .= '</pesquisa>' . PHP_EOL;
        $xml .= '</nfse>' . PHP_EOL;

        $resultado = $this->http->enviar($xml);
        return new NfseRetorno($resultado['sucesso'] ? $resultado['resposta'] : $this->erroXml($resultado['erro']));
    }

    // -----------------------------------------------------------------------
    // HELPER
    // -----------------------------------------------------------------------

    private function erroXml(string $mensagem): string
    {
        return '<?xml version="1.0"?><retorno><mensagem><codigo>' . htmlspecialchars($mensagem) . '</codigo></mensagem></retorno>';
    }
}
