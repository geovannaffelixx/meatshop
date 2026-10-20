import type { ReactNode } from 'react';

export function LegalCheckbox({
  checked,
  onChange,
  children,
  disabled = false,
  required = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 has-[:checked]:border-red-200 has-[:checked]:bg-red-50/50 has-[:disabled]:cursor-not-allowed">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-red-700"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        required={required}
      />
      {children}
    </label>
  );
}
