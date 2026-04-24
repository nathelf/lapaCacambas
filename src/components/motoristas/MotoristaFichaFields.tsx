import { Label } from '@/components/ui/label';
import { StatusMotorista } from '../../../shared/enums';

export type MotoristaFichaValues = {
  nome: string;
  cpf: string;
  cnh: string;
  categorias: string[];
  dataNascimento: string;
  dataVencimentoCnh: string;
  telefone: string;
  celular: string;
  email: string;
  status: string;
};

export const MOTORISTA_FICHA_EMPTY: MotoristaFichaValues = {
  nome: '',
  cpf: '',
  cnh: '',
  categorias: [],
  dataNascimento: '',
  dataVencimentoCnh: '',
  telefone: '',
  celular: '',
  email: '',
  status: StatusMotorista.ATIVO,
};

const CAT_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export function motoristaApiToFichaValues(m: Record<string, unknown>): MotoristaFichaValues {
  const cats = m.categorias;
  return {
    nome: String(m.nome ?? ''),
    cpf: String(m.cpf ?? ''),
    cnh: String(m.cnh ?? ''),
    categorias: Array.isArray(cats) ? (cats as string[]) : [],
    dataNascimento: String(m.dataNascimento ?? m.data_nascimento ?? ''),
    dataVencimentoCnh: String(m.dataVencimentoCnh ?? m.data_vencimento_cnh ?? ''),
    telefone: String(m.telefone ?? ''),
    celular: String(m.celular ?? ''),
    email: String(m.email ?? ''),
    status: String(m.status ?? StatusMotorista.ATIVO),
  };
}

export function fichaValuesToUpdateDto(v: MotoristaFichaValues): Record<string, unknown> {
  return {
    nome: v.nome.trim() || undefined,
    cpf: v.cpf.trim() || null,
    cnh: v.cnh.trim() || null,
    categorias: v.categorias.length ? v.categorias : [],
    dataNascimento: v.dataNascimento.trim() || null,
    dataVencimentoCnh: v.dataVencimentoCnh.trim() || null,
    telefone: v.telefone.trim() || null,
    celular: v.celular.trim() || null,
    email: v.email.trim() || null,
    status: v.status,
  };
}

type Props = {
  value: MotoristaFichaValues;
  onChange: (patch: Partial<MotoristaFichaValues>) => void;
  disabled?: boolean;
};

const inputClass =
  'w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function MotoristaFichaFields({ value, onChange, disabled }: Props) {
  function toggleCat(letter: string) {
    const up = letter.toUpperCase();
    const has = value.categorias.includes(up);
    onChange({
      categorias: has ? value.categorias.filter((c) => c !== up) : [...value.categorias, up],
    });
  }

  return (
    <div className="space-y-4 pt-2 border-t">
      <p className="text-sm font-medium text-foreground">Dados da frota (CNH e contato)</p>

      <div className="space-y-1">
        <Label>Nome na ficha</Label>
        <input
          type="text"
          className={inputClass}
          value={value.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>CPF</Label>
          <input
            type="text"
            className={inputClass}
            value={value.cpf}
            onChange={(e) => onChange({ cpf: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label>CNH</Label>
          <input
            type="text"
            className={inputClass}
            value={value.cnh}
            onChange={(e) => onChange({ cnh: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categorias CNH</Label>
        <div className="flex flex-wrap gap-3">
          {CAT_LETTERS.map((letter) => (
            <label key={letter} className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={value.categorias.includes(letter)}
                onChange={() => toggleCat(letter)}
                disabled={disabled}
                className="rounded"
              />
              {letter}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Data de nascimento</Label>
          <input
            type="date"
            className={inputClass}
            value={value.dataNascimento ? value.dataNascimento.slice(0, 10) : ''}
            onChange={(e) => onChange({ dataNascimento: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label>Vencimento CNH</Label>
          <input
            type="date"
            className={inputClass}
            value={value.dataVencimentoCnh ? value.dataVencimentoCnh.slice(0, 10) : ''}
            onChange={(e) => onChange({ dataVencimentoCnh: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Telefone</Label>
          <input
            type="text"
            className={inputClass}
            value={value.telefone}
            onChange={(e) => onChange({ telefone: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label>Celular</Label>
          <input
            type="text"
            className={inputClass}
            value={value.celular}
            onChange={(e) => onChange({ celular: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>E-mail (ficha)</Label>
        <input
          type="email"
          className={inputClass}
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <Label>Status na frota</Label>
        <select
          className={inputClass}
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value })}
          disabled={disabled}
        >
          {Object.values(StatusMotorista).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
