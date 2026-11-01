import { Input } from '@/shared/components/ui/input';
import { ExportField, ReportFilters } from './report-options';

type Props = {
  fields: ExportField[];
  values: ReportFilters;
  disabled: boolean;
  onChange: (key: string, value: string) => void;
};

export function ReportFilterFields({ fields, values, disabled, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className="space-y-1.5 text-sm font-medium text-slate-700">
          <span>{field.label}</span>
          {field.options ? (
            <select
              className="input w-full"
              disabled={disabled}
              value={values[field.key] ?? field.options[0][0]}
              onChange={(event) => onChange(field.key, event.target.value)}
            >
              {field.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {values[field.key] &&
                !field.options.some(([value]) => value === values[field.key]) && (
                  <option value={values[field.key]}>Produto #{values[field.key]}</option>
                )}
            </select>
          ) : (
            <Input
              type={field.type ?? 'text'}
              disabled={disabled}
              value={values[field.key] ?? ''}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}
