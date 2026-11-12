import { ReportFilterFields } from './report-filter-fields';
import { ReportFilters, ReportKind, reportFields } from './report-options';

export type ExportFormState = {
  open: boolean;
  kind: ReportKind;
  values: ReportFilters;
  format: string;
  unit: string;
};
export type ExportFormChange = (patch: Partial<ExportFormState>) => void;

export function ExportScope({
  admin,
  units,
  state,
  unitName,
  disabled,
  onChange,
}: {
  admin: boolean;
  units: { id: number; name: string }[];
  state: ExportFormState;
  unitName?: string;
  disabled: boolean;
  onChange: ExportFormChange;
}) {
  if (!admin)
    return (
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        Unidade: <strong>{unitName}</strong>
      </p>
    );
  return (
    <label className="space-y-1.5 text-sm font-medium">
      Unidade
      <select
        className="input w-full"
        disabled={disabled}
        value={state.unit}
        onChange={(event) => onChange({ unit: event.target.value })}
      >
        <option value="">Selecione a unidade</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ExportKind({
  state,
  disabled,
  onChange,
}: {
  state: ExportFormState;
  disabled: boolean;
  onChange: ExportFormChange;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      Relatório
      <select
        className="input w-full"
        disabled={disabled}
        value={state.kind}
        onChange={(event) => onChange({ kind: event.target.value as ReportKind })}
      >
        <option value="catalog">Catálogo e estoque atual</option>
        <option value="performance">Desempenho por produto</option>
      </select>
    </label>
  );
}

export function ExportFormat({
  state,
  admin,
  disabled,
  onChange,
}: {
  state: ExportFormState;
  admin: boolean;
  disabled: boolean;
  onChange: ExportFormChange;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      Formato
      <select
        className="input w-full"
        value={state.format}
        disabled={disabled}
        onChange={(event) => onChange({ format: event.target.value })}
      >
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="pdf">PDF (.pdf)</option>
        {admin && <option value="json">JSON (.json)</option>}
      </select>
    </label>
  );
}

export function ExportFilters({
  state,
  disabled,
  products,
  onChange,
}: {
  state: ExportFormState;
  disabled: boolean;
  products?: { id: number; name: string }[];
  onChange: ExportFormChange;
}) {
  const fields = fieldsWithProducts(state.kind, products);
  return (
    <>
      {state.kind === 'performance' && (
        <p className="text-sm text-slate-500">
          Quantidade e venda bruta dos itens de pedidos entregues e com pagamento recebido, sem
          frete e sem rateio dos descontos.
        </p>
      )}
      {state.kind === 'support' && (
        <p className="text-sm text-slate-500">
          Inclui todos os chamados vinculados à unidade escolhida.
        </p>
      )}
      <ReportFilterFields
        fields={fields}
        values={state.values}
        disabled={disabled}
        onChange={(key, value) => onChange({ values: { ...state.values, [key]: value } })}
      />
    </>
  );
}

function fieldsWithProducts(kind: ReportKind, products?: { id: number; name: string }[]) {
  return reportFields(kind).map((field) =>
    field.key === 'product_id' && products
      ? {
          ...field,
          options: [
            ...field.options!,
            ...products.map((product) => [String(product.id), product.name] as [string, string]),
          ],
        }
      : field,
  );
}
