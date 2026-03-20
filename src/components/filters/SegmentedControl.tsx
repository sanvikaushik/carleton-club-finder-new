import React from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>(props: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
}) {
  const { value, options, onChange } = props;
  return (
    <div className="segmentedControl" role="tablist" aria-label="Time filter">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`segmentedItem ${active ? "active" : ""}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

