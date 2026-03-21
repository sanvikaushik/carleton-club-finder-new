import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBuildings, getEvents, Building, EventModel } from "../../api/client";
import { useAppState, HomeTimeFilter } from "../../state/appState";
import { CampusImageMap } from "../CampusMap/CampusImageMap";
import { mergeCampusMapBuildings } from "../CampusMap/campusMapData";
import { SegmentedControl, SegmentedOption } from "../filters/SegmentedControl";
import { BuildingCardPopup } from "./BuildingCardPopup";

function withinRange(start: Date, end: Date, a: Date, b: Date) {
  // Overlap check: [start,end] overlaps [a,b]
  return start < b && end > a;
}

function isSameLocalDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function filterEvents(events: EventModel[], filter: HomeTimeFilter, now: Date) {
  const next2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return events.filter((ev) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    if (filter === "now") {
      return start <= now && end >= now;
    }
    if (filter === "next2h") {
      return withinRange(start, end, now, next2h);
    }
    // today: overlapping today's window
    return withinRange(start, end, startOfToday, endOfToday) && isSameLocalDate(start, now);
  });
}

export const HomeMap: React.FC = () => {
  const navigate = useNavigate();
  const { homeTimeFilter, setHomeTimeFilter } = useAppState();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupBuilding, setPopupBuilding] = useState<Building | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [b, e] = await Promise.all([getBuildings(), getEvents()]);
        if (!cancelled) {
          setBuildings(mergeCampusMapBuildings(b));
          setEvents(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), [homeTimeFilter, loading]);
  const filteredEvents = useMemo(() => filterEvents(events, homeTimeFilter, now), [events, homeTimeFilter, now]);

  const eventsByBuilding = useMemo(() => {
    const map = new Map<string, EventModel[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.building) ?? [];
      list.push(ev);
      map.set(ev.building, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [filteredEvents]);

  const eventCountsByBuilding = useMemo(
    () => new Map(Array.from(eventsByBuilding.entries()).map(([id, list]) => [id, list.length])),
    [eventsByBuilding],
  );

  const timeOptions: SegmentedOption<HomeTimeFilter>[] = [
    { value: "now", label: "Now" },
    { value: "next2h", label: "Next 2 Hours" },
    { value: "today", label: "Today" },
  ];

  return (
    <div className="homeMapWrap">
      <div className="homeMapHeader">
        <div>
          <div className="homeMapTitle">Herzberg (HP)</div>
          <div className="homeMapSub">All Carleton University</div>
        </div>
        <div className="homeMapTimeFilter">
          <SegmentedControl value={homeTimeFilter} options={timeOptions} onChange={setHomeTimeFilter} />
        </div>
      </div>

      {loading ? (
        <div className="mapCard">
          <div className="mapLoading">Loading campus events...</div>
        </div>
      ) : (
        <CampusImageMap
          ariaLabel="Campus map"
          buildings={buildings}
          countsByBuilding={eventCountsByBuilding}
          selectedBuildingId={popupBuilding?.id ?? null}
          onSelectBuilding={setPopupBuilding}
        />
      )}

      {popupBuilding ? (
        <BuildingCardPopup
          building={popupBuilding}
          events={eventsByBuilding.get(popupBuilding.id) ?? []}
          onClose={() => setPopupBuilding(null)}
          onViewEvent={(eventId) => {
            setPopupBuilding(null);
            navigate(`/event/${encodeURIComponent(eventId)}`);
          }}
          onViewFloor={() => {
            setPopupBuilding(null);
            navigate(`/building/${encodeURIComponent(popupBuilding.id)}`);
          }}
        />
      ) : null}
    </div>
  );
};
