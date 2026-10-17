import type { ReactNode } from "react";
import { useI18n } from "../i18n";
export function Field({
  label,
  children,
  wide = false,
  hint,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  hint?: string;
}) {
  const { t } = useI18n();
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{t(label)}</span>
      {children}
      {hint && <small>{t(hint)}</small>}
    </label>
  );
}
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
  translateOptions = true,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Disable for option labels sourced from user card/project data. */
  translateOptions?: boolean;
}) {
  const { t } = useI18n();
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) =>
        onChange(
          (typeof value === "number"
            ? Number(e.target.value)
            : e.target.value) as T,
        )
      }
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {translateOptions ? t(l) : l}
        </option>
      ))}
    </select>
  );
}
export function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.valueAsNumber || 0)}
    />
  );
}
