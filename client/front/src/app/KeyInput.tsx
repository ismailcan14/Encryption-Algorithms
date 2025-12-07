import type { AlgoKeyConfig } from "./types";

type KeyInputProps = {
  config: AlgoKeyConfig;
  value: string;
  onChange: (v: string) => void;
};

export function KeyInput({ config, value, onChange }: KeyInputProps) {
  if (!config.required) return null;

  return (
    <label style={{ display: "grid", gap: 4 }}>
      {config.label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.placeholder}
        style={{ width: "100%" }}
      />
      {config.helpText && (
        <span style={{ fontSize: 11, opacity: 0.8 }}>{config.helpText}</span>
      )}
    </label>
  );
}
