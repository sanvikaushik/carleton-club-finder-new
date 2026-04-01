import React from "react";

export const InterestPicker: React.FC<{
  options: string[];
  selected: string[];
  onToggle: (interest: string) => void;
}> = ({ options, selected, onToggle }) => {
  const selectedSet = new Set(selected);

  return (
    <div className="interestChipGrid">
      {options.map((interest) => (
        <button
          key={interest}
          type="button"
          className={`interestChip ${selectedSet.has(interest) ? "active" : ""}`}
          onClick={() => onToggle(interest)}
        >
          {interest}
        </button>
      ))}
    </div>
  );
};
