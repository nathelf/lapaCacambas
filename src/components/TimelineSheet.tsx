import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUnidadeTimeline } from '@/hooks/useQuery';
import { STATUS_META, statusEfetivo } from '@/lib/status';
import { Loader2, MapPin, Camera, ExternalLink } from 'lucide-react';
import type { Unidade } from '@/hooks/useUnidades';

const TIPO_LABEL: Record<string, string> = {
  retirada_patio:    'Retirada do pátio',
  entrega_cliente:   'Entregue ao cliente',
  coleta_cliente:    'Coleta no cliente',
  chegada_patio:     'Chegada ao pátio',
  entrada_manutencao:'Entrou em manutenção',
  saida_manutencao:  'Saiu da manutenção',
};

interface TimelineSheetProps {
  unidade: Unidade | null;
  onClose: () => void;
}

export function TimelineSheet({ unidade, onClose }: TimelineSheetProps) {
  const { data: timeline = [], isLoading } = useUnidadeTimeline(unidade?.id ?? undefined);

  return (
    <Sheet open={!!unidade} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{unidade?.codigo_patrimonio}</span>
            {unidade && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                STATUS_META[statusEfetivo(unidade.status, unidade.ultima_atualizacao)]?.bgClass ?? ''
              } ${STATUS_META[statusEfetivo(unidade.status, unidade.ultima_atualizacao)]?.textClass ?? ''}`}>
                {STATUS_META[statusEfetivo(unidade.status, unidade.ultima_atualizacao)]?.label}
              </span>
            )}
          </SheetTitle>
          {unidade?.tipo && (
            <p className="text-sm text-muted-foreground">{unidade.tipo.descricao}</p>
          )}
        </SheetHeader>

        {/* Localização atual */}
        {unidade?.endereco_atual && (
          <div className="mb-5 p-3 rounded-lg bg-muted/50 border border-border/60 flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Localização atual</p>
              <p className="truncate">{unidade.endereco_atual}</p>
            </div>
            {unidade.lat && unidade.lng && (
              <a
                href={`https://www.google.com/maps?q=${unidade.lat},${unidade.lng}`}
                target="_blank" rel="noreferrer"
                className="shrink-0 text-primary hover:underline flex items-center gap-0.5 text-xs"
              >
                <ExternalLink className="h-3 w-3" />Mapa
              </a>
            )}
          </div>
        )}

        {/* Timeline */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Histórico de movimentações
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma movimentação registrada.
          </p>
        ) : (
          <ol className="relative border-l-2 border-border ml-2 space-y-4">
            {timeline.map((evt: any) => {
              const novoMeta = STATUS_META[evt.statusNovo as keyof typeof STATUS_META];
              return (
                <li key={evt.id} className="ml-4">
                  <span
                    className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-background"
                    style={{ backgroundColor: novoMeta?.pinColor ?? '#888' }}
                  />
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium">
                      {TIPO_LABEL[evt.tipo] ?? evt.tipo}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {new Date(evt.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {evt.motoristaNome && (
                    <p className="text-xs text-muted-foreground">
                      Motorista: {evt.motoristaNome}
                    </p>
                  )}
                  {evt.clienteNome && (
                    <p className="text-xs text-muted-foreground">
                      Cliente: {evt.clienteNome}
                    </p>
                  )}
                  {evt.pedidoNumero && (
                    <p className="text-xs text-muted-foreground">
                      Pedido: {evt.pedidoNumero}
                    </p>
                  )}
                  {evt.observacao && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">{evt.observacao}</p>
                  )}

                  <div className="flex items-center gap-3 mt-1">
                    {evt.latitude && evt.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${evt.latitude},${evt.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                        onClick={e => e.stopPropagation()}
                      >
                        <MapPin className="h-3 w-3" />GPS
                      </a>
                    )}
                    {evt.fotoUrl && (
                      <a
                        href={evt.fotoUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                        onClick={e => e.stopPropagation()}
                      >
                        <Camera className="h-3 w-3" />Foto
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}
