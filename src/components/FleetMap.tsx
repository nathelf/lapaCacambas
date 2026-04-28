/**
 * FleetMap — Mapa interativo da frota com:
 *  • isolation:isolate no container → Leaflet não compete com Sheet/Modal
 *  • Marcador destacado (pulse + scale) quando selecionado
 *  • Sheet lateral com timeline embutida ao clicar no pin
 *  • Tooltip SVG no hover
 *  • Clustering opcional (leaflet.markercluster)
 *
 *  Instale para ativar clustering:
 *    npm install leaflet leaflet.markercluster
 *    npm install -D @types/leaflet @types/leaflet.markercluster
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { statusEfetivo, STATUS_META, diasParado, type CacambaStatus } from '@/lib/status';
import type { Unidade } from '@/hooks/useUnidades';
import { useUnidadeTimeline } from '@/hooks/useQuery';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  MapPin, ExternalLink, Navigation, Clock,
  User, Trash2, History, Loader2, Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Paleta ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<CacambaStatus, { fill: string; stroke: string }> = {
  disponivel:   { fill: '#22c55e', stroke: '#16a34a' },
  em_rota:      { fill: '#f59e0b', stroke: '#d97706' },
  no_cliente:   { fill: '#3b82f6', stroke: '#1d4ed8' },
  atrasada:     { fill: '#ef4444', stroke: '#dc2626' },
  manutencao:   { fill: '#f97316', stroke: '#ea580c' },
  indisponivel: { fill: '#9ca3af', stroke: '#6b7280' },
};

// ── SVG caçamba customizado ───────────────────────────────────────────────────

function binSvg(fill: string, stroke: string, size = 38): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 38 38">
  <ellipse cx="19" cy="36" rx="9" ry="2" fill="rgba(0,0,0,0.15)"/>
  <path d="M7,11 L31,11 L28,31 L10,31 Z"
    fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
  <rect x="6" y="8.5" width="26" height="4" rx="2" fill="${stroke}"/>
  <rect x="9.5" y="4"  width="5.5" height="5.5" rx="1.8" fill="${stroke}"/>
  <rect x="23"  y="4"  width="5.5" height="5.5" rx="1.8" fill="${stroke}"/>
  <line x1="15" y1="13" x2="13.5" y2="29" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>
  <line x1="19" y1="13" x2="19"   y2="29" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>
  <line x1="23" y1="13" x2="24.5" y2="29" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>
</svg>`.trim();
}

/**
 * Gera o divIcon para um marcador com 3 estados mutuamente exclusivos:
 *  selected    → scale up + pulse ring (cor do status)
 *  searchMatch → pulse ciano + glow dourado (busca ativa + match)
 *  dimmed      → opacidade 20% (busca ativa, mas sem match)
 */
function makeBinIcon(
  L: any,
  fill: string,
  stroke: string,
  selected:    boolean,
  searchMatch: boolean = false,
  dimmed:      boolean = false,
) {
  const size   = selected ? 46 : 38;
  const anchor = size / 2;

  // Anel do estado selecionado (cor do status)
  const selRing = selected ? `<div style="
    position:absolute;inset:-5px;border-radius:50%;
    border:3px solid ${fill};opacity:.7;
    animation:leaflet-bin-pulse 1.4s ease-out infinite;
  "></div>` : '';

  // Anel ciano do resultado de busca
  const searchRing = searchMatch ? `<div style="
    position:absolute;inset:-9px;border-radius:50%;
    border:2.5px solid #00e5ff;
    animation:fleet-search-ring 1s ease-in-out infinite;
    pointer-events:none;
  "></div>` : '';

  // Halo ciano difuso por trás
  const searchHalo = searchMatch ? `<div style="
    position:absolute;inset:-14px;border-radius:50%;
    background:radial-gradient(circle, #00e5ff55 0%, transparent 70%);
    animation:fleet-search-halo 1s ease-in-out infinite;
    pointer-events:none;
  "></div>` : '';

  const opacity = dimmed ? 'opacity:.18;' : '';
  const anim    = searchMatch && !selected
    ? 'animation:fleet-search-scale 1s ease-in-out infinite;'
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;${opacity}${anim}">
      ${searchHalo}${selRing}${searchRing}${binSvg(fill, stroke, size)}
    </div>`,
    iconSize:   [size, size],
    iconAnchor: [anchor, size],
  });
}

// ── Componente principal ───────────────────────────────────────────────────────

export interface FleetMapProps {
  unidades: Unidade[];
  height?: number;
  onSelect?: (u: Unidade) => void;
  /**
   * Quando definido, a busca na página de caçambas está ativa (pode ser Set vazio = 0 resultados).
   * `undefined` = sem busca — todos os pins no estado normal.
   */
  highlightedIds?: Set<number>;
}

export function FleetMap({ unidades, height = 420, onSelect, highlightedIds }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const layerRef     = useRef<any>(null);
  const markersMap   = useRef<Map<number, any>>(new Map());  // id → marker

  const [mapReady,  setMapReady]  = useState(false);
  const [noLib,     setNoLib]     = useState(false);
  const [selected,  setSelected]  = useState<Unidade | null>(null);

  // ── Inicia mapa ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L: any) => {
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(containerRef.current!, {
        zoomControl:    true,
        preferCanvas:   true,
      });

      // Tile claro CartoDB Positron
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© <a href="https://www.openstreetmap.org/">OSM</a> © <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      ).addTo(map);

      map.setView([-24.9578, -53.4595], 12);
      mapRef.current = map;

      // Clustering opcional
      const loadCluster = new Function('return import("leaflet.markercluster")') as () => Promise<unknown>;
      loadCluster().then(() => {
        const L2: any = (window as any).L ?? L;
        layerRef.current = (L2.markerClusterGroup ?? L.layerGroup)({
          showCoverageOnHover: false,
          maxClusterRadius:    50,
          iconCreateFunction: (cluster: any) => L.divIcon({
            className: '',
            html: `<div style="
              width:36px;height:36px;border-radius:50%;
              background:#1e293b;color:#fff;
              display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:13px;
              border:2.5px solid #fff;
              box-shadow:0 2px 8px rgba(0,0,0,.3);
            ">${cluster.getChildCount()}</div>`,
            iconSize:   [36, 36],
            iconAnchor: [18, 18],
          }),
        });
        layerRef.current.addTo(map);
        setMapReady(true);
      }).catch(() => {
        layerRef.current = L.layerGroup().addTo(map);
        setMapReady(true);
      });
    }).catch(() => setNoLib(true));

    return () => {
      mapRef.current?.remove();
      mapRef.current  = null;
      layerRef.current = null;
      markersMap.current.clear();
    };
  }, []);

  // ── Recria marcadores quando unidades mudam ────────────────────────────────
  useEffect(() => {
    if (!mapReady || !layerRef.current) return;

    import('leaflet').then((L: any) => {
      layerRef.current.clearLayers();
      markersMap.current.clear();

      const bounds: [number, number][] = [];

      unidades
        .filter(u => u.lat != null && u.lng != null)
        .forEach(u => {
          const eff    = statusEfetivo(u.status, u.ultima_atualizacao);
          const colors = STATUS_COLORS[eff] ?? STATUS_COLORS.disponivel;
          const meta   = STATUS_META[eff]   ?? STATUS_META.disponivel;
          const isSel  = selected?.id === u.id;

          const icon = makeBinIcon(L, colors.fill, colors.stroke, isSel);

          const tooltip = `
            <div style="font-family:inherit;min-width:160px;line-height:1.4">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">
                ${u.codigo_patrimonio}
              </div>
              <span style="
                display:inline-flex;align-items:center;gap:4px;
                background:${colors.fill}22;color:${colors.stroke};
                border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600
              ">
                <span style="width:6px;height:6px;border-radius:50%;background:${colors.fill};display:inline-block"></span>
                ${meta.label}
              </span>
              ${u.cliente?.nome
                ? `<div style="margin-top:4px;font-size:11px;color:#475569">${u.cliente.nome}</div>`
                : ''}
              ${u.tipo?.descricao
                ? `<div style="font-size:11px;color:#94a3b8">${u.tipo.descricao}</div>`
                : ''}
            </div>`;

          const marker = L.marker([u.lat!, u.lng!], { icon })
            .bindTooltip(tooltip, {
              direction:  'top',
              offset:     [0, -42],
              opacity:    1,
              className:  'fleet-tooltip',
            });

          marker.on('click', () => {
            setSelected(u);
            onSelect?.(u);
          });

          layerRef.current.addLayer(marker);
          markersMap.current.set(u.id, marker);
          bounds.push([u.lat!, u.lng!]);
        });

      const buscaNoMapa = highlightedIds !== undefined && highlightedIds !== null;
      if (bounds.length > 0 && !selected && !buscaNoMapa) {
        mapRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, unidades, highlightedIds]);

  // ── Atualiza ícones: seleção + resultado de busca (sem recriar markers) ─────
  useEffect(() => {
    if (!mapReady) return;
    import('leaflet').then((L: any) => {
      const buscaAtiva = highlightedIds !== undefined && highlightedIds !== null;
      const temMatch   = buscaAtiva && highlightedIds.size > 0;
      markersMap.current.forEach((marker, id) => {
        const u = unidades.find(u => u.id === id);
        if (!u) return;
        const eff    = statusEfetivo(u.status, u.ultima_atualizacao);
        const colors = STATUS_COLORS[eff] ?? STATUS_COLORS.disponivel;
        const isSel    = selected?.id === id;
        const noBusca  = !buscaAtiva;
        const isMatch  = noBusca || highlightedIds.has(id);
        marker.setIcon(makeBinIcon(
          L, colors.fill, colors.stroke,
          isSel,
          buscaAtiva && temMatch && isMatch && !isSel,
          buscaAtiva && !isMatch,
        ));
      });
    });
  }, [selected, highlightedIds, mapReady, unidades]);

  // ── Busca com resultados: aproxima o mapa dos pins que batem com o termo ─────
  useEffect(() => {
    if (!mapReady || !mapRef.current || highlightedIds === undefined) return;
    if (highlightedIds.size === 0) return;
    const coords: [number, number][] = [];
    for (const u of unidades) {
      if (u.lat != null && u.lng != null && highlightedIds.has(u.id)) {
        coords.push([u.lat, u.lng]);
      }
    }
    if (coords.length === 0) return;
    import('leaflet').then((L: any) => {
      const b = L.latLngBounds(coords);
      mapRef.current.fitBounds(b, { padding: [52, 52], maxZoom: 16, animate: true });
    });
  }, [highlightedIds, mapReady, unidades]);

  const handleClose = useCallback(() => setSelected(null), []);

  // ── Sem biblioteca ─────────────────────────────────────────────────────────
  if (noLib) return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg bg-muted/50 border border-dashed text-muted-foreground"
      style={{ height }}
    >
      <Trash2 className="h-9 w-9 opacity-25" strokeWidth={1.2} />
      <div className="text-sm text-center space-y-2">
        <p className="font-medium">Mapa não disponível</p>
        <code className="text-xs bg-background border px-2 py-1 rounded block">
          npm install leaflet leaflet.markercluster
        </code>
        <code className="text-xs bg-background border px-2 py-1 rounded block">
          npm install -D @types/leaflet @types/leaflet.markercluster
        </code>
      </div>
    </div>
  );

  return (
    <>
      {/* CSS do Leaflet */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" crossOrigin="" />

      {/* Keyframe para pulse do marcador selecionado */}
      <style>{`
        @keyframes leaflet-bin-pulse {
          0%   { transform:scale(1);   opacity:.7; }
          60%  { transform:scale(1.6); opacity:.2; }
          100% { transform:scale(1.6); opacity:0;  }
        }
        /* Busca: scale do ícone */
        @keyframes fleet-search-scale {
          0%,100% { transform:scale(1);    }
          50%     { transform:scale(1.22); }
        }
        /* Busca: anel ciano pulsante */
        @keyframes fleet-search-ring {
          0%,100% { transform:scale(1);   opacity:.9; }
          50%     { transform:scale(1.35);opacity:.4; }
        }
        /* Busca: halo difuso ciano */
        @keyframes fleet-search-halo {
          0%,100% { transform:scale(.8);  opacity:.3; }
          50%     { transform:scale(1.25);opacity:.65; }
        }
        .fleet-tooltip {
          background:#fff !important;
          border:1px solid #e2e8f0 !important;
          border-radius:10px !important;
          box-shadow:0 4px 20px rgba(0,0,0,.11) !important;
          padding:10px 13px !important;
          pointer-events:none;
        }
        .fleet-tooltip::before { display:none !important; }
        .leaflet-tooltip-top.fleet-tooltip::before {
          display:block !important;
          border-top-color:#e2e8f0 !important;
        }
      `}</style>

      {/*
        ─── isolation:isolate ──────────────────────────────────────────────────
        Cria um stacking context isolado: os z-indexes do Leaflet (até 1000)
        ficam confinados dentro deste div e não competem com o Sheet/Modal
        que renderiza em portal no <body>.
      */}
      <div style={{ isolation: 'isolate', position: 'relative' }}>
        <div
          ref={containerRef}
          style={{ height }}
          className="w-full rounded-lg overflow-hidden border border-border/40"
        />
      </div>

      {/* Sheet lateral — renderiza em portal acima de tudo */}
      <UnitDetailSheet
        unidade={selected}
        onClose={handleClose}
      />
    </>
  );
}

// ── Sheet lateral com timeline embutida ───────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  retirada_patio:     'Retirada do pátio',
  entrega_cliente:    'Entregue ao cliente',
  coleta_cliente:     'Coleta no cliente',
  chegada_patio:      'Chegada ao pátio',
  entrada_manutencao: 'Entrou em manutenção',
  saida_manutencao:   'Saiu da manutenção',
};

function UnitDetailSheet({ unidade, onClose }: { unidade: Unidade | null; onClose: () => void }) {
  const { data: timeline = [], isLoading } = useUnidadeTimeline(unidade?.id);

  if (!unidade) return null;

  const eff    = statusEfetivo(unidade.status, unidade.ultima_atualizacao);
  const meta   = STATUS_META[eff]   ?? STATUS_META.disponivel;
  const colors = STATUS_COLORS[eff] ?? STATUS_COLORS.disponivel;
  const dias   = diasParado(unidade.ultima_atualizacao);

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0"
        // SheetContent já usa portal — garante z-index acima do mapa
      >
        {/* Faixa de cor */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: colors.fill }} />

        {/* Cabeçalho */}
        <SheetHeader className="px-5 pt-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span className="font-mono tracking-tight">{unidade.codigo_patrimonio}</span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: `${colors.fill}20`, color: colors.stroke }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.fill }} />
              {meta.label}
            </span>
          </SheetTitle>
          {unidade.tipo && (
            <p className="text-sm text-muted-foreground -mt-1">{unidade.tipo.descricao}</p>
          )}
        </SheetHeader>

        {/* Corpo — scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Card: localização atual */}
          {(unidade.endereco_atual || unidade.lat) && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />Localização atual
                </span>
                {unidade.lat && unidade.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${unidade.lat},${unidade.lng}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    <ExternalLink className="h-3 w-3" />Mapa
                  </a>
                )}
              </div>
              {unidade.endereco_atual && (
                <p className="text-sm">{unidade.endereco_atual}</p>
              )}
              {unidade.lat && unidade.lng && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  {unidade.lat.toFixed(6)}, {unidade.lng.toFixed(6)}
                </p>
              )}
            </div>
          )}

          {/* Metadados */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {unidade.cliente?.nome && (
              <DetailBlock icon={User} label="Cliente">{unidade.cliente.nome}</DetailBlock>
            )}
            {unidade.ultima_atualizacao && (
              <DetailBlock icon={Clock} label="Atualizado em">
                {new Date(unidade.ultima_atualizacao).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </DetailBlock>
            )}
            {dias > 0 && (
              <DetailBlock icon={Clock} label="Dias no cliente">
                <span className={cn('font-semibold', dias > 15 ? 'text-destructive' : 'text-foreground')}>
                  {dias}d {dias > 15 ? '⚠ Vencido' : ''}
                </span>
              </DetailBlock>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="flex gap-2">
            {unidade.lat && unidade.lng && (
              <a
                href={`https://waze.com/ul?ll=${unidade.lat},${unidade.lng}&navigate=yes`}
                target="_blank" rel="noreferrer"
                className="flex-1 h-9 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90"
                style={{ background: colors.fill }}
              >
                <Navigation className="h-3.5 w-3.5" />Navegar
              </a>
            )}
          </div>

          {/* ── Timeline de movimentações ───────────────────────────────── */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <History className="h-3.5 w-3.5" />Histórico de movimentações
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 italic">
                Nenhuma movimentação registrada.
              </p>
            ) : (
              <ol className="relative border-l-2 border-border/60 ml-1.5 space-y-4 pb-2">
                {(timeline as any[]).map((evt, i) => {
                  const evtColor = STATUS_COLORS[evt.statusNovo as CacambaStatus]?.fill ?? '#94a3b8';
                  return (
                    <li key={evt.id ?? i} className="ml-4">
                      {/* Ponto colorido na linha */}
                      <span
                        className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-background"
                        style={{ background: evtColor }}
                      />

                      {/* Data/hora */}
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className="text-sm font-semibold">
                          {TIPO_LABEL[evt.tipo] ?? evt.tipo}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {new Date(evt.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Detalhes */}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {evt.motoristaNome && <p>Motorista: {evt.motoristaNome}</p>}
                        {evt.clienteNome   && <p>Cliente: {evt.clienteNome}</p>}
                        {evt.pedidoNumero  && <p>Pedido: {evt.pedidoNumero}</p>}
                        {evt.observacao    && <p className="italic">{evt.observacao}</p>}
                      </div>

                      {/* Links */}
                      <div className="flex items-center gap-3 mt-1">
                        {evt.latitude && evt.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${evt.latitude},${evt.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                          >
                            <MapPin className="h-3 w-3" />GPS
                          </a>
                        )}
                        {evt.fotoUrl && (
                          <a
                            href={evt.fotoUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Helper visual ─────────────────────────────────────────────────────────────

function DetailBlock({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
        <Icon className="h-3 w-3" />{label}
      </p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
