import React, { useEffect, useMemo, useState } from "react";

function hashSeed(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

export const AttendanceMeter: React.FC<{
  eventId: string;
  attendanceCount: number;
  capacity: number;
  startTime: string;
  endTime: string;
  compact?: boolean;
}> = ({ eventId, attendanceCount, capacity, startTime, endTime, compact = false }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 6000);
    return () => window.clearInterval(interval);
  }, []);

  const displayCount = useMemo(() => {
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const happeningNow = start <= now && now <= end;
    if (!happeningNow) {
      return attendanceCount;
    }

    const seed = hashSeed(eventId) % 5;
    const extra = Math.min(seed + (tick % 3), Math.max(0, capacity - attendanceCount));
    return Math.min(capacity, attendanceCount + extra);
  }, [attendanceCount, capacity, endTime, eventId, startTime, tick]);

  const fill = capacity > 0 ? Math.min(100, Math.round((displayCount / capacity) * 100)) : 0;

  return (
    <div className={`attendanceMeter ${compact ? "compact" : ""}`}>
      <div className="attendanceMeterTop">
        <span>{displayCount} attending</span>
        <span>{fill}% full</span>
      </div>
      <div className="attendanceMeterTrack">
        <div className="attendanceMeterFill" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
};
