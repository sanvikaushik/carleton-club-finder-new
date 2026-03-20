import React, { useMemo } from "react";
import { ScheduleClass, ScheduleResponse } from "../api/client";

function timeRange(cls: ScheduleClass) {
  return `${cls.startTime} - ${cls.endTime}`;
}

const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function WeeklySchedule(props: { schedule: ScheduleResponse }) {
  const { schedule } = props;

  const classesByDay = useMemo(() => {
    const map = new Map<string, ScheduleClass[]>();
    for (const c of schedule.classes) {
      const list = map.get(c.dayOfWeek) ?? [];
      list.push(c);
      map.set(c.dayOfWeek, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [schedule.classes]);

  return (
    <div className="weekSchedule">
      {dayOrder.map((day) => {
        const list = classesByDay.get(day) ?? [];
        return (
          <div key={day} className="dayBlock">
            <div className="dayHeader">{day}</div>
            {list.length === 0 ? (
              <div className="dayEmpty mutedText">No classes</div>
            ) : (
              <div className="dayList">
                {list.map((cls) => (
                  <div key={cls.id} className="classBlock">
                    <div className="classTime">{timeRange(cls)}</div>
                    <div className="classMain">
                      <div className="classTitle">{cls.title}</div>
                      <div className="classLocation">{cls.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

