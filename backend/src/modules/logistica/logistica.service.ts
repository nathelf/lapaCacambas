import { supabaseAdmin } from '../../lib/supabase';
import { env } from '../../config/env';
import { corrigirMojibakeUtf8 } from '../../../../shared/mojibake';
import type {
  ExecucaoRow, ExecucaoDto, ListExecucoesResult,
  RotaRow, RotaDto, RotaParadaDto, RotaParadaRow,
  ListExecucoesQuery, AtribuirExecucaoDto, UpdateStatusExecucaoDto,
  ListRotasQuery, CreateRotaDto, CreateParadaDto, RouteOptimizeInput,
} from './logistica.types';

// ─── Helpers de conversão ─────────────────────────────────────────────────────

/** Monta uma linha única de endereço a partir de partes (ignora vazios). */
function linhaEndereco(...partes: Array<string | null | undefined>): string | null {
  const s = partes
    .map(p => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(', ');
  if (!s) return null;
  const corrigido = corrigirMojibakeUtf8(s);
  return corrigido || null;
}

function enderecoEntregaResolvido(p: ExecucaoRow['pedidos']): string | null {
  if (!p) return null;
  const end = p.enderecos_entrega;
  const entrega = end
    ? linhaEndereco(end.endereco, end.numero, end.bairro, end.cidade, end.estado)
    : null;
  const obra = p.obras
    ? linhaEndereco(p.obras.endereco, p.obras.numero, p.obras.bairro, p.obras.cidade, p.obras.estado)
    : null;
  const c = p.clientes;
  const clienteCadastro = c
    ? linhaEndereco(c.endereco, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep)
    : null;
  // Prioridade: entrega explícita no pedido → obra → cadastro do cliente
  return entrega || obra || clienteCadastro;
}

function execucaoToDto(row: ExecucaoRow): ExecucaoDto {
  const p = row.pedidos;
  const obraEnd = p?.obras
    ? linhaEndereco(p.obras.endereco, p.obras.numero, p.obras.bairro, p.obras.cidade, p.obras.estado)
    : null;
  const enderecoEntrega = enderecoEntregaResolvido(p);
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    pedidoNumero: p?.numero ?? null,
    pedidoTipo: p?.tipo ?? null,
    valorLocacao: p?.valor_total ?? null,
    dataProgramada: p?.data_programada ?? null,
    horaProgramada: p?.hora_programada ?? null,
    dataDesejada: p?.data_desejada ?? null,
    clienteNome: p?.clientes?.nome ? corrigirMojibakeUtf8(p.clientes.nome) : null,
    clienteTelefone: p?.clientes?.telefone ?? null,
    obraNome: p?.obras?.nome ?? null,
    obraEndereco: obraEnd,
    enderecoEntrega,
    cacambaNumero: p?.cacambas?.descricao ?? null,
    rotaParadaId: row.rota_parada_id,
    motoristaId: row.motorista_id,
    motoristaNome: row.motoristas?.nome ?? null,
    veiculoId: row.veiculo_id,
    veiculoPlaca: row.veiculos?.placa ?? null,
    tipo: row.tipo,
    status: row.status,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    observacao: row.observacao,
    evidenciaUrl: row.evidencia_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function paradaToDto(row: RotaParadaRow): RotaParadaDto {
  return {
    id: row.id,
    rotaId: row.rota_id,
    pedidoId: row.pedido_id,
    pedidoNumero: row.pedidos?.numero ?? null,
    pedidoTipo: row.pedidos?.tipo ?? null,
    clienteNome: row.pedidos?.clientes?.nome ?? null,
    obraNome: row.pedidos?.obras?.nome ?? null,
    ordem: row.ordem,
    endereco: row.endereco,
    tipo: row.tipo,
    status: row.status,
    horaChegada: row.hora_chegada,
    horaSaida: row.hora_saida,
    observacao: row.observacao,
  };
}

function rotaToDto(row: RotaRow): RotaDto {
  return {
    id: row.id,
    data: row.data,
    motoristaId: row.motorista_id,
    motoristaNome: row.motoristas?.nome ?? null,
    veiculoId: row.veiculo_id,
    veiculoPlaca: row.veiculos?.placa ?? null,
    status: row.status as RotaDto['status'],
    observacao: row.observacao,
    paradas: (row.rota_paradas ?? []).map(paradaToDto),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EXECUCAO_SELECT = `
  *,
  pedidos(numero, tipo, valor_total, data_programada, hora_programada, data_desejada, observacao,
    clientes(nome, telefone, endereco, numero, complemento, cep, bairro, cidade, estado),
    obras(nome, endereco, numero, bairro, cidade, estado),
    enderecos_entrega:enderecos_entrega(endereco, numero, bairro, cidade, estado),
    cacambas(descricao)
  ),
  motoristas(id, nome, celular),
  veiculos(id, placa, modelo)
`;

// ─── Execuções ────────────────────────────────────────────────────────────────

export async function listarExecucoes(query: ListExecucoesQuery): Promise<ExecucaoDto[] | ListExecucoesResult> {
  const isPaginado = query.page !== undefined;
  const limit = query.limit ?? 20;
  const page  = query.page  ?? 1;
  const from  = (page - 1) * limit;

  let q = supabaseAdmin
    .from('execucoes')
    .select(EXECUCAO_SELECT, isPaginado ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: false });

  if (query.status)        q = q.eq('status', query.status);
  if (query.semAtribuicao) q = q.is('motorista_id', null);
  if (query.dataInicio)    q = (q as any).gte('created_at', `${query.dataInicio}T00:00:00`);
  if (query.dataFim)       q = (q as any).lte('created_at', `${query.dataFim}T23:59:59`);
  if (isPaginado)          q = (q as any).range(from, from + limit - 1);

  const { data, error, count } = await q as any;
  if (error) throw new Error('Falha ao buscar execuções.');

  let rows = data as ExecucaoRow[];

  // filtro por data_programada exata (usado pela logística — feito em memória pois é join)
  if (query.data) {
    rows = rows.filter(r => r.pedidos?.data_programada?.startsWith(query.data!));
  }

  if (isPaginado) {
    return { data: rows.map(execucaoToDto), total: count ?? 0 };
  }
  return rows.map(execucaoToDto);
}

export async function buscarExecucaoPorId(id: number): Promise<ExecucaoDto> {
  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .select(EXECUCAO_SELECT)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Execução não encontrada.');
  return execucaoToDto(data as ExecucaoRow);
}

export async function criarExecucao(
  pedidoId: number,
  tipo: string,
  motoristaId?: number,
  veiculoId?: number,
): Promise<ExecucaoDto> {
  const { data: pedido, error: pedidoErr } = await supabaseAdmin
    .from('pedidos')
    .select('id')
    .eq('id', pedidoId)
    .is('deleted_at', null)
    .single();
  if (pedidoErr || !pedido) throw new Error('Pedido não encontrado.');

  const { data: existing } = await supabaseAdmin
    .from('execucoes')
    .select('id')
    .eq('pedido_id', pedidoId)
    .eq('tipo', tipo)
    .in('status', ['pendente', 'em_rota', 'no_local', 'executando'])
    .maybeSingle();
  if (existing) throw new Error('Já existe uma OS ativa para este pedido e tipo de serviço.');

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .insert({
      pedido_id:    pedidoId,
      tipo,
      status:       'pendente',
      motorista_id: motoristaId ?? null,
      veiculo_id:   veiculoId   ?? null,
    })
    .select(EXECUCAO_SELECT)
    .single();

  if (error || !data) {
    console.error('[criarExecucao] supabase error:', error);
    throw new Error('Falha ao criar OS.');
  }
  return execucaoToDto(data as ExecucaoRow);
}

export async function atribuirExecucao(id: number, dto: AtribuirExecucaoDto): Promise<ExecucaoDto> {
  // Verifica se o motorista não está bloqueado
  const { data: motorista } = await supabaseAdmin
    .from('motoristas')
    .select('status')
    .eq('id', dto.motoristaId)
    .single();

  if (motorista?.status === 'bloqueado' || motorista?.status === 'inativo') {
    throw new Error('Motorista bloqueado ou inativo não pode ser escalado.');
  }

  // Verifica se o veículo não está em manutenção
  const { data: veiculo } = await supabaseAdmin
    .from('veiculos')
    .select('status')
    .eq('id', dto.veiculoId)
    .single();

  if (veiculo?.status === 'manutencao' || veiculo?.status === 'inativo') {
    throw new Error('Veículo em manutenção ou inativo não pode receber rota.');
  }

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .update({
      motorista_id: dto.motoristaId,
      veiculo_id: dto.veiculoId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(EXECUCAO_SELECT)
    .single();

  if (error || !data) throw new Error('Falha ao atribuir execução.');
  return execucaoToDto(data as ExecucaoRow);
}

export async function atualizarStatusExecucao(id: number, dto: UpdateStatusExecucaoDto): Promise<ExecucaoDto> {
  const updates: Record<string, unknown> = {
    status: dto.status,
    updated_at: new Date().toISOString(),
  };

  if (dto.observacao !== undefined) updates.observacao = dto.observacao;
  if (dto.evidenciaUrl !== undefined) updates.evidencia_url = dto.evidenciaUrl;
  if (dto.latitude !== undefined)    updates.latitude = dto.latitude;
  if (dto.longitude !== undefined)   updates.longitude = dto.longitude;

  if (dto.status === 'em_rota' || dto.status === 'executando') {
    updates.data_inicio = updates.data_inicio ?? new Date().toISOString();
  }
  if (dto.status === 'concluida' || dto.status === 'cancelada') {
    updates.data_fim = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('execucoes')
    .update(updates)
    .eq('id', id)
    .select(EXECUCAO_SELECT)
    .single();

  if (error || !data) throw new Error('Falha ao atualizar status da execução.');

  // Se concluída, atualiza o pedido para "em_execucao" ou "concluido"
  if (dto.status === 'concluida') {
    await supabaseAdmin
      .from('pedidos')
      .update({ status: 'concluido', updated_at: new Date().toISOString() })
      .eq('id', (data as ExecucaoRow).pedido_id)
      .in('status', ['programado', 'em_rota', 'em_execucao']);
  }

  return execucaoToDto(data as ExecucaoRow);
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

export async function listarRotas(query: ListRotasQuery): Promise<RotaDto[]> {
  let q = supabaseAdmin
    .from('rotas')
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (query.data)        q = q.eq('data', query.data);
  if (query.dataInicio)  q = q.gte('data', query.dataInicio);
  if (query.dataFim)     q = q.lte('data', query.dataFim);
  if (query.motoristaId) q = q.eq('motorista_id', query.motoristaId);
  if (query.status)      q = q.eq('status', query.status);

  const { data, error } = await q;
  if (error) throw new Error('Falha ao buscar rotas.');
  return (data as RotaRow[]).map(rotaToDto);
}

export async function atualizarDataRota(id: number, data: string): Promise<RotaDto> {
  const { data: row, error } = await supabaseAdmin
    .from('rotas')
    .update({ data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .single();

  if (error || !row) throw new Error('Falha ao atualizar data da rota.');
  return rotaToDto(row as RotaRow);
}

export async function buscarRotaPorId(id: number): Promise<RotaDto> {
  const { data, error } = await supabaseAdmin
    .from('rotas')
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Rota não encontrada.');
  return rotaToDto(data as RotaRow);
}

export async function criarRota(dto: CreateRotaDto, userId: string): Promise<RotaDto> {
  const { data, error } = await supabaseAdmin
    .from('rotas')
    .insert({
      data: dto.data,
      motorista_id: dto.motoristaId,
      veiculo_id: dto.veiculoId,
      observacao: dto.observacao ?? null,
      status: 'planejada',
      created_by: userId,
    })
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*)
    `)
    .single();

  if (error || !data) throw new Error('Falha ao criar rota.');
  return rotaToDto(data as RotaRow);
}

export async function adicionarParada(rotaId: number, dto: CreateParadaDto): Promise<RotaParadaDto> {
  const { data, error } = await supabaseAdmin
    .from('rota_paradas')
    .insert({
      rota_id: rotaId,
      pedido_id: dto.pedidoId ?? null,
      ordem: dto.ordem,
      endereco: dto.endereco ?? null,
      tipo: dto.tipo ?? null,
      observacao: dto.observacao ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      status: 'pendente',
    })
    .select('*, pedidos(numero, tipo, clientes(nome), obras(nome))')
    .single();

  if (error || !data) throw new Error('Falha ao adicionar parada.');

  // Vincula a execução do pedido a esta parada
  if (dto.pedidoId) {
    await supabaseAdmin
      .from('execucoes')
      .update({ rota_parada_id: (data as RotaParadaRow).id, updated_at: new Date().toISOString() })
      .eq('pedido_id', dto.pedidoId)
      .eq('status', 'pendente');
  }

  return paradaToDto(data as RotaParadaRow);
}

export async function atualizarStatusRota(id: number, status: RotaDto['status']): Promise<RotaDto> {
  const { data, error } = await supabaseAdmin
    .from('rotas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      motoristas(nome, celular),
      veiculos(placa, modelo),
      rota_paradas(*, pedidos(numero, tipo, clientes(nome), obras(nome)))
    `)
    .single();

  if (error || !data) throw new Error('Falha ao atualizar status da rota.');
  return rotaToDto(data as RotaRow);
}

export async function removerParada(rotaId: number, paradaId: number): Promise<void> {
  // Desvincula execução antes de remover
  await supabaseAdmin
    .from('execucoes')
    .update({ rota_parada_id: null, updated_at: new Date().toISOString() })
    .eq('rota_parada_id', paradaId);

  const { error } = await supabaseAdmin
    .from('rota_paradas')
    .delete()
    .eq('id', paradaId)
    .eq('rota_id', rotaId);

  if (error) throw new Error('Falha ao remover parada.');
}

type RouteChoice = {
  id: string;
  nome: 'mais_rapida' | 'mais_curta' | 'economica';
  durationSec: number;
  distanceMeters: number;
  fuelLiters: number;
  custoDiesel: number;
  custoManutencao: number;
  custoOperacional: number;
  custoTotal: number;
  margemBruta: number | null;
  margemPercentual: number | null;
  polyline: { encoded: string; points: Array<{ lat: number; lng: number }> };
  warnings: string[];
};

function decodeGooglePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

async function saveRouteOptimizationLog(payload: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from('rotas_otimizacao_logs').insert(payload);
  if (error) {
    // Não bloqueia o fluxo operacional caso a tabela ainda não exista.
    console.warn('[route-optimizer] log insert failed:', error.message);
  }
}

export async function otimizarRotaInteligente(input: RouteOptimizeInput, userId: string) {
  if (!env.googleMapsApiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY não configurada no backend.');
  }

  const dieselPreco = Number(input.dieselPreco ?? 6.2);
  const consumoKmLitro = Math.max(0.1, Number(input.consumoKmLitro ?? 2.8));
  const custoManutencaoKm = Math.max(0, Number(input.custoManutencaoKm ?? 1.15));
  const custoHoraOperacao = Math.max(0, Number(input.custoHoraOperacao ?? 68));
  const valorLocacao = input.valorLocacao != null ? Number(input.valorLocacao) : null;

  const body = {
    origin: { location: { latLng: { latitude: input.origem.lat, longitude: input.origem.lng } } },
    destination: { location: { latLng: { latitude: input.destino.lat, longitude: input.destino.lng } } },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    computeAlternativeRoutes: true,
    routeModifiers: { avoidFerries: true },
    extraComputations: ['FUEL_CONSUMPTION'],
    languageCode: 'pt-BR',
    units: 'METRIC',
  };

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googleMapsApiKey,
      'X-Goog-FieldMask': [
        'routes.duration',
        'routes.distanceMeters',
        'routes.polyline.encodedPolyline',
        'routes.warnings',
        'routes.travelAdvisory.fuelConsumptionMicroliters',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(raw?.error?.message || 'Falha ao consultar Google Routes API.');
  }
  const routes = Array.isArray(raw?.routes) ? raw.routes : [];
  if (routes.length === 0) {
    throw new Error('Nenhuma rota retornada pela API.');
  }

  const parsed = routes.map((r: any, idx: number) => {
    const durationSec = Number(String(r.duration ?? '0s').replace('s', '')) || 0;
    const distanceMeters = Number(r.distanceMeters ?? 0);
    const fuelMicroliters = Number(r?.travelAdvisory?.fuelConsumptionMicroliters ?? 0);
    const fuelLitersApi = fuelMicroliters > 0 ? fuelMicroliters / 1_000_000 : null;
    const fuelLiters = fuelLitersApi ?? ((distanceMeters / 1000) / consumoKmLitro);
    const custoDiesel = fuelLiters * dieselPreco;
    const custoManutencao = (distanceMeters / 1000) * custoManutencaoKm;
    const custoOperacional = (durationSec / 3600) * custoHoraOperacao;
    const custoTotal = custoDiesel + custoManutencao + custoOperacional;
    const margemBruta = valorLocacao != null ? (valorLocacao - custoTotal) : null;
    const margemPercentual = (valorLocacao != null && valorLocacao > 0)
      ? (margemBruta! / valorLocacao) * 100
      : null;
    const encoded = String(r?.polyline?.encodedPolyline ?? '');
    return {
      idx,
      durationSec,
      distanceMeters,
      fuelLiters,
      custoDiesel,
      custoManutencao,
      custoOperacional,
      custoTotal,
      margemBruta,
      margemPercentual,
      polyline: { encoded, points: encoded ? decodeGooglePolyline(encoded) : [] },
      warnings: (r?.warnings ?? []) as string[],
    };
  });

  const byDuration = [...parsed].sort((a, b) => a.durationSec - b.durationSec)[0];
  const byDistance = [...parsed].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
  const byCost = [...parsed].sort((a, b) => a.custoTotal - b.custoTotal)[0];

  const choices: RouteChoice[] = [
    { id: `r-${byDuration.idx}`, nome: 'mais_rapida', ...byDuration },
    { id: `r-${byDistance.idx}`, nome: 'mais_curta', ...byDistance },
    { id: `r-${byCost.idx}`, nome: 'economica', ...byCost },
  ];

  const uniq = new Map<string, RouteChoice>();
  for (const c of choices) {
    if (!uniq.has(c.id)) uniq.set(c.id, c);
  }
  const opcoes = [...uniq.values()];
  const sugestao = [...opcoes].sort((a, b) => a.custoTotal - b.custoTotal)[0];

  const destino = `${input.destino.lat},${input.destino.lng}`;
  const origem = `${input.origem.lat},${input.origem.lng}`;
  const deepLinkGoogle = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
  const deepLinkWaze = `https://waze.com/ul?ll=${encodeURIComponent(destino)}&navigate=yes`;

  await saveRouteOptimizationLog({
    created_by: userId || null,
    veiculo_id: input.veiculoId ?? null,
    origem_label: input.origem.label ?? null,
    origem_lat: input.origem.lat,
    origem_lng: input.origem.lng,
    destino_label: input.destino.label ?? null,
    destino_lat: input.destino.lat,
    destino_lng: input.destino.lng,
    sugestao_nome: sugestao.nome,
    sugestao_custo_total: sugestao.custoTotal,
    sugestao_duracao_seg: sugestao.durationSec,
    sugestao_distancia_m: sugestao.distanceMeters,
    payload: { opcoes, input },
  });

  return {
    origem: input.origem,
    destino: input.destino,
    opcoes,
    sugestaoId: sugestao.id,
    deepLinks: { googleMaps: deepLinkGoogle, waze: deepLinkWaze },
    premissas: { dieselPreco, consumoKmLitro, custoManutencaoKm, custoHoraOperacao, valorLocacao },
  };
}
