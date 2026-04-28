/**
 * CacambaFormDialog — Modal CRUD para criar e editar tipos de caçamba.
 * Validação via zod, máscara de moeda, estados de loading, sem clique duplo.
 */
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/CurrencyInput';
import { Loader2 } from 'lucide-react';
import { useCreateCacamba, useUpdateCacamba } from '@/hooks/useQuery';
import { toast } from 'sonner';

// ── Schema de validação ────────────────────────────────────────────────────────

const schema = z.object({
  descricao:     z.string().min(3, 'Mínimo 3 caracteres'),
  capacidade:    z.string().optional(),
  precoDia:      z.number({ invalid_type_error: 'Informe o valor' }).min(0.01, 'Valor deve ser positivo'),
  precoSemana:   z.number({ invalid_type_error: 'Informe o valor' }).min(0.01, 'Valor deve ser positivo'),
  precoQuinzena: z.number({ invalid_type_error: 'Informe o valor' }).min(0.01, 'Valor deve ser positivo'),
  precoMes:      z.number({ invalid_type_error: 'Informe o valor' }).min(0.01, 'Valor deve ser positivo'),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface CacambaFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Se fornecido, abre em modo edição. */
  cacamba?: {
    id: number;
    descricao: string;
    capacidade?: string | null;
    precoDia: number;
    precoSemana: number;
    precoQuinzena: number;
    precoMes: number;
  } | null;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CacambaFormDialog({ open, onClose, cacamba }: CacambaFormDialogProps) {
  const isEdit = !!cacamba;

  const create = useCreateCacamba();
  const update = useUpdateCacamba();
  const isPending = create.isPending || update.isPending;

  const {
    register, handleSubmit, control, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao: '', capacidade: '',
      precoDia: 0, precoSemana: 0, precoQuinzena: 0, precoMes: 0,
    },
  });

  // Preenche o form ao abrir em modo edição
  useEffect(() => {
    if (open && cacamba) {
      reset({
        descricao:     cacamba.descricao,
        capacidade:    cacamba.capacidade ?? '',
        precoDia:      cacamba.precoDia,
        precoSemana:   cacamba.precoSemana,
        precoQuinzena: cacamba.precoQuinzena,
        precoMes:      cacamba.precoMes,
      });
    } else if (open && !cacamba) {
      reset({ descricao: '', capacidade: '', precoDia: 0, precoSemana: 0, precoQuinzena: 0, precoMes: 0 });
    }
  }, [open, cacamba, reset]);

  const onSubmit = (values: FormValues) => {
    const dto = {
      descricao:     values.descricao,
      capacidade:    values.capacidade || undefined,
      precoDia:      values.precoDia,
      precoSemana:   values.precoSemana,
      precoQuinzena: values.precoQuinzena,
      precoMes:      values.precoMes,
    };

    if (isEdit && cacamba) {
      update.mutate(
        { id: cacamba.id, dto },
        {
          onSuccess: () => {
            toast.success('Caçamba atualizada!');
            onClose();
          },
          onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
        },
      );
    } else {
      create.mutate(dto, {
        onSuccess: () => {
          toast.success('Caçamba criada!');
          onClose();
        },
        onError: (e: any) => toast.error(e?.message ?? 'Erro ao criar.'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar caçamba' : 'Nova caçamba'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Altere os dados do tipo de caçamba. Os preços serão aplicados apenas a novos pedidos.'
              : 'Preencha os dados do novo tipo. Os preços são copiados para cada pedido no momento da criação.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Descrição + Capacidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="descricao" className="text-xs">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Caçamba 10m³"
                {...register('descricao')}
                className={errors.descricao ? 'border-destructive' : ''}
              />
              {errors.descricao && (
                <p className="text-xs text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacidade" className="text-xs">Capacidade</Label>
              <div className="flex">
                <Input
                  id="capacidade"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  className="rounded-r-none"
                  {...register('capacidade')}
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-xs text-muted-foreground">
                  m³
                </span>
              </div>
            </div>
          </div>

          {/* Preços */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tabela de preços
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { field: 'precoDia'      as const, label: 'Dia *' },
                { field: 'precoSemana'   as const, label: 'Semana *' },
                { field: 'precoQuinzena' as const, label: 'Quinzena *' },
                { field: 'precoMes'      as const, label: 'Mês *' },
              ]).map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field} className="text-xs">{label}</Label>
                  <Controller
                    name={field}
                    control={control}
                    render={({ field: f }) => (
                      <CurrencyInput
                        id={field}
                        value={f.value}
                        onChange={f.onChange}
                        error={!!errors[field]}
                      />
                    )}
                  />
                  {errors[field] && (
                    <p className="text-xs text-destructive">{errors[field]?.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Salvando…</>
              : isEdit ? 'Salvar alterações' : 'Criar caçamba'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
