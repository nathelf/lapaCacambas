import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, Marker, useApiIsLoaded, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { AlertTriangle, Fuel, Navigation, Route, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RouteOptimizationResult, RouteOptionResult } from '@/lib/api';
import { corrigirMojibakeUtf8 } from '../../../shared/mojibake';

const SEDE_LAPA = {
  label: 'Lapa Caçambas — Sede',
  lat: -24.9578,
  lng: -53.4595,
};

function fmtKm(meters: number) {
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

function fmtTempo(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

function fmtMoney(v: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function RoutePolyline({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  const lineRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    if (!lineRef.current) {
      const g = (window as any).google;
      lineRef.current = new g.maps.Polyline({
        map,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
    }
    lineRef.current.setPath(points);
    if (points.length > 1) {
      const g = (window as any).google;
      const bounds = new g.maps.LatLngBounds();
      points.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, 56);
    }
    return () => {
      lineRef.current?.setMap(null);
      lineRef.current = null;
    };
  }, [map, points]);

  return null;
}

type PlaceSug = { placeId: string; description: string };

interface PlaceAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: { placeId: string; description: string; lat: number; lng: number }) => void;
}

function PlacesAutocomplete({ value, onChange, onSelect }: PlaceAutocompleteProps) {
  const placesLib = useMapsLibrary('places');
  const [items, setItems] = useState<PlaceSug[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!placesLib || value.trim().length < 3) {
      setItems([]);
      return;
    }
    const handle = setTimeout(() => {
      setLoading(true);
      const g = (window as any).google;
      const service = new g.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'br' },
          locationBias: { center: { lat: SEDE_LAPA.lat, lng: SEDE_LAPA.lng }, radius: 50000 },
        },
        (preds, status) => {
          setLoading(false);
          if (status !== g.maps.places.PlacesServiceStatus.OK || !preds) {
            setItems([]);
            return;
          }
          setItems(preds.slice(0, 6).map(p => ({ placeId: p.place_id, description: p.description })));
          setOpen(true);
        },
      );
    }, 260);
    return () => clearTimeout(handle);
  }, [placesLib, value]);

  const selectItem = (it: PlaceSug) => {
    const g = (window as any).google;
    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ placeId: it.placeId }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) return;
      const loc = results[0].geometry.location;
      onChange(it.description);
      onSelect({ placeId: it.placeId, description: it.description, lat: loc.lat(), lng: loc.lng() });
      setOpen(false);
    });
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder="Digite o endereço do cliente…"
      />
      {open && (items.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-sm max-h-56 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {items.map(it => (
            <button
              key={it.placeId}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              type="button"
              onClick={() => selectItem(it)}
            >
              {it.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface RoutePlannerPanelProps {
  veiculoId?: number;
  presetAddress?: string;
  consumoKmLitro: number;
  dieselPreco: number;
  custoManutencaoKm: number;
  custoHoraOperacao: number;
  valorLocacao: string;
  canEditValorLocacao: boolean;
  onValorLocacaoChange: (value: string) => void;
  onOptimize: (args: {
    destino: { lat: number; lng: number; label: string };
    consumoKmLitro: number;
    dieselPreco: number;
    custoManutencaoKm: number;
    custoHoraOperacao: number;
    valorLocacao?: number;
  }) => void;
  onDestinationResolved?: (dest: { lat: number; lng: number; label: string } | null) => void;
  result: RouteOptimizationResult | null;
  loading: boolean;
}

/** Conteúdo do painel; quando `mapsApiKey` existe, deve estar dentro de `APIProvider`. */
function RoutePlannerBody({
  mapsApiKey,
  veiculoId,
  presetAddress,
  consumoKmLitro,
  dieselPreco,
  custoManutencaoKm,
  custoHoraOperacao,
  valorLocacao,
  canEditValorLocacao,
  onValorLocacaoChange,
  onOptimize,
  onDestinationResolved,
  result,
  loading,
}: RoutePlannerPanelProps & { mapsApiKey?: string }) {
  const mapsReady = mapsApiKey ? useApiIsLoaded() : false;
  const presetNorm = useMemo(
    () => corrigirMojibakeUtf8((presetAddress ?? '').trim()),
    [presetAddress],
  );

  const [destInput, setDestInput] = useState('');
  const [destino, setDestino] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [validandoEndereco, setValidandoEndereco] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  useEffect(() => {
    if (result?.sugestaoId) setSelectedRouteId(result.sugestaoId);
  }, [result?.sugestaoId]);

  const selectedRoute = useMemo<RouteOptionResult | undefined>(() => {
    if (!result) return undefined;
    return result.opcoes.find(o => o.id === selectedRouteId) ?? result.opcoes[0];
  }, [result, selectedRouteId]);

  useEffect(() => {
    onDestinationResolved?.(destino);
  }, [destino, onDestinationResolved]);

  useEffect(() => {
    if (!presetNorm) {
      setDestInput('');
      setDestino(null);
      setValidandoEndereco(false);
      return;
    }
    setDestInput(presetNorm);
    if (!mapsApiKey || !mapsReady) {
      setDestino(null);
      setValidandoEndereco(false);
      return;
    }
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) {
      setDestino(null);
      setValidandoEndereco(false);
      return;
    }
    setValidandoEndereco(true);
    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ address: presetNorm, region: 'BR' }, (results: any[], status: string) => {
      setValidandoEndereco(false);
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        setDestino(null);
        return;
      }
      const loc = results[0].geometry.location;
      setDestino({ lat: loc.lat(), lng: loc.lng(), label: presetNorm });
    });
  }, [presetNorm, mapsApiKey, mapsReady]);

  const optimize = () => {
    if (!destino) return;
    onOptimize({
      destino,
      consumoKmLitro: Number(consumoKmLitro || 0),
      dieselPreco: Number(dieselPreco || 0),
      custoManutencaoKm: Number(custoManutencaoKm || 0),
      custoHoraOperacao: Number(custoHoraOperacao || 0),
      valorLocacao: valorLocacao.trim() ? Number(valorLocacao.replace(',', '.')) : undefined,
    });
  };

  const lucroEstimado = selectedRoute?.margemBruta ?? null;
  const margemEstimda = selectedRoute?.margemPercentual ?? null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>Origem</Label>
        <Input value={SEDE_LAPA.label} disabled readOnly />
      </div>
      <div className="grid gap-2">
        <Label>Destino</Label>
        {presetNorm ? (
          <Input value={destInput} disabled readOnly />
        ) : mapsApiKey ? (
          <PlacesAutocomplete
            value={destInput}
            onChange={setDestInput}
            onSelect={p => setDestino({ lat: p.lat, lng: p.lng, label: p.description })}
          />
        ) : (
          <Input
            value={destInput}
            placeholder="Busca de endereço indisponível no momento."
            disabled
            readOnly
          />
        )}
        {presetNorm && (
          <p className={`text-xs ${destino ? 'text-green-700' : 'text-amber-700'}`}>
            {!mapsApiKey
              ? 'Configure VITE_GOOGLE_MAPS_API_KEY para validar o endereço automaticamente.'
              : !mapsReady
                ? 'Carregando mapa…'
                : validandoEndereco
                  ? 'Validando endereço selecionado…'
                  : destino
                    ? 'Endereço validado com sucesso.'
                    : 'Não foi possível validar o endereço.'}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">KM estimado</div>
          <div className="text-sm font-medium">{selectedRoute ? fmtKm(selectedRoute.distanceMeters) : '—'}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">Tempo previsto</div>
          <div className="text-sm font-medium">{selectedRoute ? fmtTempo(selectedRoute.durationSec) : '—'}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">Custo estimado de combustível</div>
          <div className="text-sm font-medium">{selectedRoute ? fmtMoney(selectedRoute.custoDiesel) : '—'}</div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Valor da locação</Label>
        <Input
          value={valorLocacao ?? ''}
          onChange={e => onValorLocacaoChange(e.target.value.replace(/[^\d.,]/g, ''))}
          disabled={!canEditValorLocacao}
          placeholder="Valor da locação"
        />
      </div>

      <Button type="button" className="w-full" onClick={optimize} disabled={!destino || loading || !veiculoId}>
        <Navigation className="w-4 h-4 mr-1.5" /> {loading ? 'Analisando viabilidade…' : 'Analisar viabilidade'}
      </Button>

      {mapsApiKey && mapsReady && (
        <div className="rounded-lg border overflow-hidden h-72">
          <Map defaultCenter={SEDE_LAPA} defaultZoom={12} gestureHandling="greedy" disableDefaultUI>
            <Marker position={SEDE_LAPA} />
            {destino && <Marker position={destino} />}
            {selectedRoute && <RoutePolyline points={selectedRoute.polyline.points} />}
          </Map>
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-3 space-y-3 bg-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugestão IA</div>
          <div className="grid gap-2">
            {result.opcoes.map(op => {
              const isSug = op.id === result.sugestaoId;
              const selected = op.id === selectedRoute?.id;
              return (
                <button
                  type="button"
                  key={op.id}
                  onClick={() => setSelectedRouteId(op.id)}
                  className={`rounded-md border p-2 text-left text-sm ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{op.nome.replace('_', ' ')}</span>
                    {isSug && <span className="text-[11px] text-primary font-semibold">Sugestão IA</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span><Route className="inline w-3 h-3 mr-1" />{fmtKm(op.distanceMeters)}</span>
                    <span>{fmtTempo(op.durationSec)}</span>
                    <span><Fuel className="inline w-3 h-3 mr-1" />{op.fuelLiters.toFixed(1)} L</span>
                    <span>{fmtMoney(op.custoTotal)}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedRoute?.warnings?.length ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <div className="font-medium mb-1"><AlertTriangle className="inline w-3.5 h-3.5 mr-1" /> Alertas de via</div>
              <ul className="space-y-0.5">
                {selectedRoute.warnings.map((w, idx) => <li key={idx}>- {w}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="flex gap-2">
            <a href={result.deepLinks.googleMaps} target="_blank" rel="noreferrer" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Abrir no Google Maps</Button>
            </a>
            <a href={result.deepLinks.waze} target="_blank" rel="noreferrer" className="flex-1">
              <Button type="button" variant="outline" className="w-full"><Send className="w-4 h-4 mr-1.5" />Enviar ao Motorista</Button>
            </a>
          </div>
          <div className="rounded-md border bg-muted/30 p-2 text-sm">
            <strong>Lucro estimado para esta viagem:</strong> {fmtMoney(lucroEstimado)}{' '}
            {margemEstimda != null && (
              <span className="text-muted-foreground">({margemEstimda.toFixed(1)}%)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RoutePlannerPanel(props: RoutePlannerPanelProps) {
  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  if (!mapsApiKey) {
    return <RoutePlannerBody {...props} mapsApiKey={undefined} />;
  }
  return (
    <APIProvider apiKey={mapsApiKey} libraries={['places', 'geometry']}>
      <RoutePlannerBody {...props} mapsApiKey={mapsApiKey} />
    </APIProvider>
  );
}

export { SEDE_LAPA };
