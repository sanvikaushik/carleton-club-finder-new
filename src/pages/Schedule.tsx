import React, { useEffect, useState } from "react";
import { getSchedule, ScheduleResponse } from "../api/client";
import { WeeklySchedule } from "../components/WeeklySchedule";

export const Schedule: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const s = await getSchedule();
        if (cancelled) return;
        setSchedule(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1 className="pageTitle">Schedule</h1>

      <div className="importCard">
        <div className="importTitle">Import / Upload</div>
        <div className="importSub">Mock flow only (no real file processing in this prototype).</div>
        <input type="file" className="fileInput" />
        <button
          type="button"
          className="primaryBtn"
          onClick={() => {
            // Prototype: intentionally does nothing.
            alert("Schedule import is mocked in this prototype.");
          }}
        >
          Import schedule (mock)
        </button>
      </div>

      <div className="spacer12" />

      {loading || !schedule ? <div className="placeholderCard">Loading timetable…</div> : <WeeklySchedule schedule={schedule} />}
    </div>
  );
};

