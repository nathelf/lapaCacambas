<?php
/**
 * exemplo_emissao.php
 * Demonstra como usar a integração NFS-e no sistema lapaCacambas.
 *
 * ▶ EMISSÃO SIMPLES (NTE-35/2021)
 * ▶ EMISSÃO COM REFORMA TRIBUTÁRIA — IBS/CBS (NTE-122/2025)
 * ▶ TESTE DE INTEGRAÇÃO (XML validado, nota não emitida)
 * ▶ CANCELAMENTO
 * ▶ CONSULTA
 *
 * Copie a pasta /nfse/ para E:\2026\lapaCacambas\lib\nfse\
 * e ajuste os require_once abaixo.
 */

require_once __DIR__ . '/NfseService.php';

$nfse = new NfseService();

// =============================================================================
// EXEMPLO 1 — Emissão de NFS-e com Reforma Tributária (IBS/CBS)
// =============================================================================

// --- Dados financeiros da nota ---
$dadosNf = [
    'valor_total'  => '1000,00',
    'valor_desconto' => '',
    'valor_ir'     => '',
    'valor_inss'   => '',
    'observacao'   => 'Coleta e transporte de caçambas estacionárias conforme contrato',
    // PIS/COFINS próprio (NTE-122/2025 §3) — preencher se contribuinte não for Simples Nacional
    // 'pis_cofins' => [
    //     'cst'            => '01',
    //     'base_calculo'   => '1000,00',
    //     'aliquota_pis'   => '0,65',
    //     'aliquota_cofins'=> '3,00',
    // ],
    // PIS/COFINS retido (desconta do líquido)
    // 'valor_pis'    => '',
    // 'valor_cofins' => '',
];

// --- Tomador ---
$tomador = [
    'tipo'             => 'J',                    // J=PJ, F=PF, E=Estrangeiro
    'cpfcnpj'          => '12345678000195',        // CPF/CNPJ do tomador (só números)
    'nome_razao_social'=> 'Empresa Contratante Ltda',
    'logradouro'       => 'Rua das Acácias',
    'numero_residencia'=> '100',
    'bairro'           => 'Centro',
    'cidade'           => '4745',                 // Código TOM de Lapa-PR
    'cep'              => '83750000',
    'email'            => 'financeiro@empresa.com.br',
];

// --- Itens de serviço ---
$itens = [
    [
        // Coleta de resíduos — LC 116/2003, item 7.09
        'codigo_local_prestacao_servico' => '4745',   // Código TOM da Lapa
        'codigo_nbs'                     => '1.09.01.00-00', // NBS — Reforma Tributária
        'codigo_item_lista_servico'      => '0709',   // Item 7.09 LC 116/2003
        'descritivo'                     => 'Locação e coleta de caçambas estacionárias para resíduos',
        'aliquota_item_lista_servico'    => '3,0000', // Alíquota ISS — confirmar com município
        'situacao_tributaria'            => '0',      // 0 = Tributada Integralmente
        'valor_tributavel'               => '1000,00',
        'tributa_municipio_prestador'    => 'N',      // N = tributa no local do serviço
        'tributa_municipio_tomador'      => 'N',
    ],
];

// --- Bloco IBS/CBS — Reforma Tributária (NTE-122/2025) ---
// Em 01/01/2026 ainda é facultativo. Adaptar antes de virar obrigatório.
$ibsCbs = [
    'finNFSe'    => 0,         // 0 = NFS-e regular
    'indFinal'   => 0,         // 0 = não é consumo pessoal
    'cIndOp'     => '020101',  // Código indicador de operação (Anexo VII)
    // 'tpOper'  => '',        // Preencher somente para imóveis/governo
    'CST'        => '011',     // Código de Situação Tributária IBS/CBS
    'cClassTrib' => '011004',  // Classificação Tributária
];

// ▶ MODO TESTE — valida o XML sem emitir
echo "=== TESTE DE INTEGRAÇÃO ===" . PHP_EOL;
$retornoTeste = $nfse->testar($dadosNf, $tomador, $itens, $ibsCbs);
echo "Mensagem: " . $retornoTeste->getMensagem() . PHP_EOL;
echo "XML válido: " . ($retornoTeste->isSucesso() ? "SIM" : "NÃO") . PHP_EOL;
echo PHP_EOL;

// ▶ EMISSÃO REAL
echo "=== EMISSÃO ===" . PHP_EOL;
$retornoEmissao = $nfse->emitir($dadosNf, $tomador, $itens, $ibsCbs);

if ($retornoEmissao->isSucesso()) {
    echo "✔ NFS-e emitida com sucesso!" . PHP_EOL;
    echo "  Número    : " . $retornoEmissao->getNumero()          . PHP_EOL;
    echo "  Link PDF  : " . $retornoEmissao->getLink()            . PHP_EOL;
    echo "  Autenticid: " . $retornoEmissao->getCodVerificador()  . PHP_EOL;
    echo "  Chave Nac.: " . $retornoEmissao->getChaveNacional()   . PHP_EOL;

    $ibsRetorno = $retornoEmissao->getIbsCbs();
    if (!empty($ibsRetorno)) {
        echo "  IBS Total : " . ($ibsRetorno['vIBSTot'] ?? '-') . PHP_EOL;
        echo "  CBS Total : " . ($ibsRetorno['vCBS']    ?? '-') . PHP_EOL;
        echo "  Total NF  : " . ($ibsRetorno['vTotNF']  ?? '-') . PHP_EOL;
    }
} else {
    echo "✖ Falha na emissão:" . PHP_EOL;
    echo "  " . $retornoEmissao->getMensagem() . PHP_EOL;
}

echo PHP_EOL;

// =============================================================================
// EXEMPLO 2 — Emissão SEM Reforma Tributária (padrão NTE-35/2021 puro)
// =============================================================================
/*
$retorno = $nfse->emitir($dadosNf, $tomador, $itens);  // sem $ibsCbs
*/

// =============================================================================
// EXEMPLO 3 — Cancelamento
// =============================================================================
echo "=== CANCELAMENTO ===" . PHP_EOL;
/*
$retornoCancelamento = $nfse->cancelar('1293', '1', 'Nota emitida com erro de valor.');
if ($retornoCancelamento->isSucesso()) {
    echo "✔ NFS-e cancelada." . PHP_EOL;
} else {
    echo "✖ " . $retornoCancelamento->getMensagem() . PHP_EOL;
}
*/
echo "(descomente o bloco acima para cancelar)" . PHP_EOL;
echo PHP_EOL;

// =============================================================================
// EXEMPLO 4 — Consulta por código de autenticidade
// =============================================================================
echo "=== CONSULTA ===" . PHP_EOL;
/*
$codigoAutenticidade = '835773809020258253072022102281022396913';
$retornoConsulta = $nfse->consultarPorAutenticidade($codigoAutenticidade);
echo $retornoConsulta->getLink() . PHP_EOL;
*/

/*
// Consulta por número, série e cadastro econômico
$retornoConsulta = $nfse->consultarPorNumero('1293', '1', '123456');
echo $retornoConsulta->getNumero() . PHP_EOL;
*/
echo "(descomente os blocos acima para consultar)" . PHP_EOL;

// =============================================================================
// DICAS DE INTEGRAÇÃO NO SISTEMA lapaCacambas
// =============================================================================
/*
 * 1. Copie a pasta nfse/ para E:\2026\lapaCacambas\lib\nfse\
 *
 * 2. Edite NfseConfig.php:
 *    - CIDADE_SLUG   → 'lapa'
 *    - CIDADE_TOM    → código TOM oficial (confirmar em tomweb.receita.fazenda.gov.br)
 *    - WS_USERNAME   → CNPJ do prestador (somente números)
 *    - WS_PASSWORD   → senha do portal Atende.Net
 *    - USAR_REFORMA_TRIBUTARIA → true (obrigatório antes de 2027)
 *
 * 3. Solicite acesso ao WebService:
 *    Portal do Cidadão → "Emissão de NFS-e por WebService" → "Acesso ao Usuário" → Confirmar
 *    (NTE-35/2021 §3.2 / NTE-122/2025 §4.2)
 *
 * 4. Para retorno completo com todos os dados da nota:
 *    Acesse: Portal Prefeitura → Nota Fiscal → Personalização do Prestador →
 *    aba Webservice → habilite "Utiliza Retorno Completo na Importação de XML"
 *    (NTE-122/2025 §5.2)
 *
 * 5. Atenção ao NBS (Nomenclatura Brasileira de Serviços):
 *    A partir da obrigatoriedade da Reforma, o campo codigo_nbs é obrigatório.
 *    Para coleta de resíduos, o NBS mais comum é 1.09.01.00-00.
 *    Confirmar com o contador ou com a documentação CGNFS-e.
 *
 * 6. Simples Nacional:
 *    IBS/CBS NÃO se aplica aos optantes do Simples Nacional (NTE-122/2025 §2).
 *    Nesse caso, envie sem o bloco $ibsCbs.
 */
