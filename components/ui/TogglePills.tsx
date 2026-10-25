"use client";

import { useState, useCallback } from "react";

interface TogglePillsOption<T extends string> {
  value: T;
  label: string;
}

interface TogglePillsSingleProps<T extends string> {
  options: TogglePillsOption<T>[];
  selected: T;
  onChange: (value: T) => void;
  mode: "single";
  layout?: "wrap" | "row";
}

interface TogglePillsMultiProps<T extends string> {
  options: TogglePillsOption<T>[];
  selected: T[];
  onChange: (values: T[]) => void;
  mode: "multi";
  max?: number;
  layout?: "wrap" | "row";
}

type TogglePillsProps<T extends string> =
  | TogglePillsSingleProps<T>
  | TogglePillsMultiProps<T>;

export function TogglePills<T extends string>(props: TogglePillsProps<T>) {
  const { options, mode } = props;
  const layout = props.layout ?? (mode === "multi" ? "wrap" : "row");

  const [shakingValue, setShakingValue] = useState<string | null>(null);

  const handleClick = useCallback(
    (value: T) => {
      if (mode === "single") {
        (props as TogglePillsSingleProps<T>).onChange(value);
        return;
      }

      const multi = props as TogglePillsMultiProps<T>;
      const selected = multi.selected;

      if (selected.includes(value)) {
        multi.onChange(selected.filter((v) => v !== value));
        return;
      }

      if (multi.max && selected.length >= multi.max) {
        setShakingValue(value);
        setTimeout(() => setShakingValue(null), 500);
        return;
      }

      multi.onChange([...selected, value]);
    },
    [props, mode]
  );

  const isSelected = (value: T): boolean => {
    if (mode === "single") {
      return (props as TogglePillsSingleProps<T>).selected === value;
    }
    return (props as TogglePillsMultiProps<T>).selected.includes(value);
  };

  const containerClass =
    layout === "row" ? "flex gap-1.5" : "flex flex-wrap gap-2";

  return (
    <div>
      <div className={containerClass}>
        {options.map((opt) => {
          const active = isSelected(opt.value);
          const isShaking = shakingValue === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleClick(opt.value)}
              className={`btn btn-sm transition-all ${
                layout === "row" ? "flex-1" : ""
              } ${
                active
                  ? mode === "single"
                    ? "btn-primary"
                    : "btn-primary"
                  : "btn-ghost border border-base-content/10"
              } ${isShaking ? "animate-shake" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {mode === "multi" && shakingValue && (
        <p className="text-xs text-warning/80 mt-2">
          Pick up to {(props as TogglePillsMultiProps<T>).max}
        </p>
      )}
    </div>
  );
}
