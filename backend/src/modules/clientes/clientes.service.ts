import { supabaseAdmin } from '../../lib/supabase';
import type { ClienteRow, ClienteDto, CreateClienteDto, UpdateClienteDto, ListClientesQuery } from './clientes.types';

// Converte snake_case do banco para camelCase do frontend
function toDto(row: ClienteRow): ClienteDto {
  return {
    id: row.id,
    nome: row.nome,
    fantasia: row.fantasia,
    referencia: row.referencia,
    status: row.status,
    motivoBloqueio: row.motivo_bloqueio,
    tipo: row.tipo,
    cpf: row.cpf,
    cnpj: row.cnpj,
    rg: row.rg,
    inscricaoMunicipal: row.inscricao_municipal,
    inscricaoEstadual: row.inscricao_estadual,
    telefone: row.telefone,
    fax: row.fax,
    celular: row.celular,
    email: row.email,
    endereco: row.endereco,
    numero: row.numero,
    complemento: row.complemento,
    cep: row.cep,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    observacao: row.observacao,
    enderecoCobranca: row.endereco_cobranca,
    numeroCobranca: row.numero_cobranca,
    complementoCobranca: row.complemento_cobranca,
    cepCobranca: row.cep_cobranca,
    bairroCobranca: row.bairro_cobranca,
    cidadeCobranca: row.cidade_cobranca,
    estadoCobranca: row.estado_cobranca,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listar(query: ListClientesQuery): Promise<{ data: ClienteDto[]; total: number }> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 50, 100); // máximo 100 por página
  const offset = (page - 1) * limit;

  let q = supabaseAdmin
    .from('clientes')
    .select('*', { count: 'exact' })
    .is('deleted_at', null) // ignora registros deletados
    .order('nome', { ascending: true })
    .range(offset, offset + limit - 1);

  if (query.busca) {
    q = q.or(`nome.ilike.%${query.busca}%,fantasia.ilike.%${query.busca}%,cpf.ilike.%${query.busca}%,cnpj.ilike.%${query.busca}%`);
  }
  if (query.status) {
    q = q.eq('status', query.status);
  }
  if (query.tipo) {
    q = q.eq('tipo', query.tipo);
  }

  const { data, error, count } = await q;

  if (error) throw new Error('Falha ao buscar clientes.');

  return {
    data: (data as ClienteRow[]).map(toDto),
    total: count ?? 0,
  };
}

export async function buscarPorId(id: number): Promise<ClienteDto> {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) throw new Error('Cliente não encontrado.');

  return toDto(data as ClienteRow);
}

export async function criar(dto: CreateClienteDto, userId: string): Promise<ClienteDto> {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .insert({
      nome: dto.nome,
      fantasia: dto.fantasia ?? null,
      referencia: dto.referencia ?? null,
      tipo: dto.tipo,
      cpf: dto.cpf ?? null,
      cnpj: dto.cnpj ?? null,
      rg: dto.rg ?? null,
      inscricao_municipal: dto.inscricaoMunicipal ?? null,
      inscricao_estadual: dto.inscricaoEstadual ?? null,
      telefone: dto.telefone ?? null,
      fax: dto.fax ?? null,
      celular: dto.celular ?? null,
      email: dto.email ?? null,
      endereco: dto.endereco ?? null,
      numero: dto.numero ?? null,
      complemento: dto.complemento ?? null,
      cep: dto.cep ?? null,
      bairro: dto.bairro ?? null,
      cidade: dto.cidade ?? null,
      estado: dto.estado ?? null,
      observacao: dto.observacao ?? null,
      endereco_cobranca: dto.enderecoCobranca ?? null,
      numero_cobranca: dto.numeroCobranca ?? null,
      complemento_cobranca: dto.complementoCobranca ?? null,
      cep_cobranca: dto.cepCobranca ?? null,
      bairro_cobranca: dto.bairroCobranca ?? null,
      cidade_cobranca: dto.cidadeCobranca ?? null,
      estado_cobranca: dto.estadoCobranca ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao criar cliente.');

  return toDto(data as ClienteRow);
}

export async function atualizar(id: number, dto: UpdateClienteDto, userId: string): Promise<ClienteDto> {
  // Monta apenas os campos que foram enviados (não sobrescreve com undefined)
  const updates: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };

  if (dto.nome !== undefined)                updates.nome = dto.nome;
  if (dto.fantasia !== undefined)             updates.fantasia = dto.fantasia;
  if (dto.referencia !== undefined)           updates.referencia = dto.referencia;
  if (dto.status !== undefined)              updates.status = dto.status;
  if (dto.motivoBloqueio !== undefined)      updates.motivo_bloqueio = dto.motivoBloqueio;
  if (dto.tipo !== undefined)                updates.tipo = dto.tipo;
  if (dto.cpf !== undefined)                 updates.cpf = dto.cpf;
  if (dto.cnpj !== undefined)                updates.cnpj = dto.cnpj;
  if (dto.rg !== undefined)                  updates.rg = dto.rg;
  if (dto.inscricaoMunicipal !== undefined)  updates.inscricao_municipal = dto.inscricaoMunicipal;
  if (dto.inscricaoEstadual !== undefined)   updates.inscricao_estadual = dto.inscricaoEstadual;
  if (dto.telefone !== undefined)            updates.telefone = dto.telefone;
  if (dto.fax !== undefined)                 updates.fax = dto.fax;
  if (dto.celular !== undefined)             updates.celular = dto.celular;
  if (dto.email !== undefined)               updates.email = dto.email;
  if (dto.endereco !== undefined)            updates.endereco = dto.endereco;
  if (dto.numero !== undefined)              updates.numero = dto.numero;
  if (dto.complemento !== undefined)         updates.complemento = dto.complemento;
  if (dto.cep !== undefined)                 updates.cep = dto.cep;
  if (dto.bairro !== undefined)              updates.bairro = dto.bairro;
  if (dto.cidade !== undefined)              updates.cidade = dto.cidade;
  if (dto.estado !== undefined)              updates.estado = dto.estado;
  if (dto.observacao !== undefined)          updates.observacao = dto.observacao;
  if (dto.enderecoCobranca !== undefined)    updates.endereco_cobranca = dto.enderecoCobranca;
  if (dto.numeroCobranca !== undefined)      updates.numero_cobranca = dto.numeroCobranca;
  if (dto.complementoCobranca !== undefined) updates.complemento_cobranca = dto.complementoCobranca;
  if (dto.cepCobranca !== undefined)         updates.cep_cobranca = dto.cepCobranca;
  if (dto.bairroCobranca !== undefined)      updates.bairro_cobranca = dto.bairroCobranca;
  if (dto.cidadeCobranca !== undefined)      updates.cidade_cobranca = dto.cidadeCobranca;
  if (dto.estadoCobranca !== undefined)      updates.estado_cobranca = dto.estadoCobranca;

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error || !data) throw new Error('Falha ao atualizar cliente.');

  return toDto(data as ClienteRow);
}

export async function deletar(id: number, userId: string): Promise<void> {
  // Soft delete — nunca apagamos registros reais do cliente
  const { error } = await supabaseAdmin
    .from('clientes')
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error('Falha ao remover cliente.');
}
