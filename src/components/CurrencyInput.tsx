/**
 * CurrencyInput — input com máscara R$ (Real Brasileiro).
 * Exibe valor formatado, armazena e entrega número puro ao onChange.
 */
import { useRef } from 'react';
import { cn } from '@/lib/utils';

const fmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
});

function parseBRL(v: string): number {
  // "R$ 1.200,50" → 1200.50
  const digits = v.replace(/[^\d]/g, '');
  return digits.length === 0 ? 0 : Number(digits) / 100;
}

interface CurrencyInputProps {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  error?: boolean;
}

export function CurrencyInput({
  value, onChange, placeholder = 'R$ 0,00',
  className, disabled, id, error,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseBRL(e.target.value);
    onChange(parsed);
    // Mantém cursor no final
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.selectionStart = el.selectionEnd = el.value.length;
    });
  };

  const displayed = value === 0 ? '' : fmt.format(value);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={displayed}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-destructive focus-visible:ring-destructive',
        className,
      )}
    />
  );
}
