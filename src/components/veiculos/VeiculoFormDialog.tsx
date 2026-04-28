import { useEffect, useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useCreateVeiculo, useUpdateVeiculo } from '@/hooks/useQuery';
import { toast } from 'sonner';
import {
  TIPOS_VEICULO_SUGESTOES,
  formatKmBr,
  parseKmDigits,
  type VeiculoListaItem,
} from '@/lib/veiculos-ui';

export interface VeiculoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: VeiculoListaItem | null;
}

function emptyForm() {
  return {
    placa: '',
    marca: '',
    modelo: '',
    tipo: '',
    ano: '',
    km: 0,
    dataLic: '',
  };
}

export function VeiculoFormDialog({ open, onOpenChange, veiculo }: VeiculoFormDialogProps) {
  const listId = useId();
  const createMut = useCreateVeiculo();
  const updateMut = useUpdateVeiculo();
  const saving = createMut.isPending || updateMut.isPending;
  const isEdit = !!veiculo?.id;

  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipo, setTipo] = useState('');
  const [ano, setAno] = useState('');
  const [km, setKm] = useState(0);
  const [dataLic, setDataLic] = useState('');

  useEffect(() => {
    if (!open) return;
    if (veiculo) {
      setPlaca(veiculo.placa ?? '');
      setMarca(veiculo.marca ?? '');
      setModelo(veiculo.modelo ?? '');
      setTipo(veiculo.tipo ?? '');
      setAno(veiculo.anoFabricacao != null ? String(veiculo.anoFabricacao) : '');
      setKm(Math.max(0, Math.floor(Number(veiculo.kmAtual) || 0)));
      const d = veiculo.dataLicenciamento;
      setDataLic(d ? String(d).slice(0, 10) : '');
    } else {
      const z = emptyForm();
      setPlaca(z.placa);
      setMarca(z.marca);
      setModelo(z.modelo);
      setTipo(z.tipo);
      setAno(z.ano);
      setKm(z.km);
      setDataLic(z.dataLic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reabre formulário só quando troca o registro ou abre de novo
  }, [open, veiculo?.id]);

  const onKmInput = (raw: string) => {
    setKm(parseKmDigits(raw));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = placa.trim().toUpperCase();
    const m = modelo.trim();
    if (!p) {
      toast.error('Informe a placa.');
      return;
    }
    if (!m) {
      toast.error('Informe o modelo.');
      return;
    }
    const anoNum = ano.trim() ? Number(ano) : undefined;
    if (ano.trim() && (!Number.isFinite(anoNum) || anoNum! < 1970 || anoNum! > new Date().getFullYear() + 1)) {
      toast.error('Ano inválido.');
      return;
    }

    const base: Record<string, unknown> = {
      placa: p,
      modelo: m,
      marca: marca.trim() || undefined,
      tipo: tipo.trim() || undefined,
      anoFabricacao: anoNum,
      dataLicenciamento: dataLic.trim() || undefined,
    };

    if (isEdit && veiculo) {
      updateMut.mutate(
        {
          id: veiculo.id,
          data: { ...base, kmAtual: km },
        },
        {
          onSuccess: () => {
            toast.success('Veículo atualizado.');
            onOpenChange(false);
          },
          onError: (err: Error) => toast.error(err?.message ?? 'Erro ao salvar.'),
        },
      );
    } else {
      createMut.mutate(
        { ...base, kmInicial: km },
        {
          onSuccess: () => {
            toast.success('Veículo cadastrado.');
            onOpenChange(false);
          },
          onError: (err: Error) => toast.error(err?.message ?? 'Erro ao cadastrar.'),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5">
          <div className="grid gap-2">
            <Label htmlFor="v-placa">Placa</Label>
            <Input
              id="v-placa"
              value={placa}
              onChange={e => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC-1D23"
              maxLength={12}
              autoComplete="off"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="v-marca">Marca</Label>
              <Input id="v-marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Marca" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-modelo">Modelo</Label>
              <Input id="v-modelo" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Modelo" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="v-tipo">Tipo</Label>
            <Input
              id="v-tipo"
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              placeholder="Ex.: Roll-on/off"
              list={listId}
            />
            <datalist id={listId}>
              {TIPOS_VEICULO_SUGESTOES.map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="v-ano">Ano</Label>
              <Input
                id="v-ano"
                inputMode="numeric"
                value={ano}
                onChange={e => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Ex.: 2022"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-km">KM atual</Label>
              <Input
                id="v-km"
                inputMode="numeric"
                value={km ? km.toLocaleString('pt-BR') : ''}
                onChange={e => onKmInput(e.target.value)}
                placeholder="0"
              />
              <p className="text-[11px] text-muted-foreground">Somente números; ex.: {formatKmBr(150000)}</p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="v-lic">Data de licenciamento</Label>
            <Input id="v-lic" type="date" value={dataLic} onChange={e => setDataLic(e.target.value)} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
