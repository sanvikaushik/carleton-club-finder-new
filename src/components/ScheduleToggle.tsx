import React from "react";

export function ScheduleToggle(props: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggleRow">
      <span className="toggleLabel">Check schedule conflicts</span>
      <span className="toggleSwitchWrap">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
          className="toggleInput"
          aria-label="Check schedule conflicts"
        />
        <span className="toggleSwitch" aria-hidden />
      </span>
    </label>
  );
}

