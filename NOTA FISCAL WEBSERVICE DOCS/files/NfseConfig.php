<?php
/**
 * NfseConfig.php
 * Configurações centrais do WebService NFS-e (IPM Atende.Net)
 * Baseado em: NTE-35/2021 v2.8 + NTE-122/2025 v1.5
 */

class NfseConfig
{
    // -----------------------------------------------------------------------
    // DADOS DO PRESTADOR - Ajuste conforme o município
    // -----------------------------------------------------------------------

    /** Nome da cidade SEM acentos e SEM espaços (ex: "lapa", "curitiba") */
    const CIDADE_SLUG = 'lapa';

    /** Código TOM da cidade (Receita Federal). Consultar em tomweb.receita.fazenda.gov.br */
    const CIDADE_TOM = '4745'; // Código TOM de Lapa-PR (confirmar)

    /** CPF ou CNPJ do prestador (somente números) */
    const PRESTADOR_CPFCNPJ = '00000000000000';

    /** Login do portal (CPF/CNPJ do emissor) */
    const WS_USERNAME = '00000000000000';

    /** Senha de acesso ao portal */
    const WS_PASSWORD = 'SENHA_AQUI';

    // -----------------------------------------------------------------------
    // URLs DO WEBSERVICE
    // -----------------------------------------------------------------------

    /**
     * URL para o WebService padrão (NTE-35/2021).
     * Porta 7443 com prefixo ws-cidade.
     */
    const URL_WS = 'https://ws-' . self::CIDADE_SLUG . '.atende.net:7443/?pg=rest&service=WNERestServiceNFSe';

    /**
     * URL alternativa usada na NTE-122/2025 (Reforma Tributária).
     * Sem porta e sem prefixo ws-.
     */
    const URL_WS_REFORMA = 'https://' . self::CIDADE_SLUG . '.atende.net/?pg=rest&service=WNERestServiceNFSe';

    // -----------------------------------------------------------------------
    // OPÇÕES GERAIS
    // -----------------------------------------------------------------------

    /** Usar Reforma Tributária (IBS/CBS) — habilitar quando obrigatório */
    const USAR_REFORMA_TRIBUTARIA = true;

    /** Timeout de conexão em segundos */
    const TIMEOUT = 60;

    /** Verificar SSL (false apenas em ambiente de testes) */
    const VERIFICAR_SSL = false;

    /** Modo de teste: true = NFS-e não é emitida de fato */
    const MODO_TESTE = false;

    // -----------------------------------------------------------------------
    // VALORES PADRÃO IBS/CBS (Reforma Tributária - NTE-122/2025)
    // Preencher de acordo com o município após parametrização
    // -----------------------------------------------------------------------

    /** Indicador de finalidade da emissão: 0 = NFS-e regular */
    const IBSCBS_FIN_NFSE = 0;

    /** Operação de consumo pessoal: 0 = não */
    const IBSCBS_IND_FINAL = 0;

    /**
     * Código indicador de operação (Anexo VII da nota nacional).
     * Exemplo: 020101 = Prestação de serviço padrão
     */
    const IBSCBS_C_IND_OP = '020101';

    /** Código CST IBS/CBS (Nota Técnica Nº 004 da nota nacional) */
    const IBSCBS_CST = '011';

    /** Código de Classificação Tributária IBS/CBS (Anexo VIII) */
    const IBSCBS_C_CLASS_TRIB = '011004';
}
