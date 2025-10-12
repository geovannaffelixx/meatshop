import { Input } from "@/components/ui/input";

interface DateRange {
  de: string;
  ate: string;
}

export function DateRangeFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <Input
          type="date"
          value={value.de}
          onChange={(e) => onChange({ ...value, de: e.target.value })}
        />
        <Input
          type="date"
          value={value.ate}
          onChange={(e) => onChange({ ...value, ate: e.target.value })}
        />
      </div>
    </div>
  );
}