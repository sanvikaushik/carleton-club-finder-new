import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBuildings, getEvents, Building, EventModel } from "../../api/client";
import { SegmentedControl, SegmentedOption } from "../filters/SegmentedControl";
import { BuildingCardPopup } from "./BuildingCardPopup";
import { useEffect } from "react";
import { useAppState, HomeTimeFilter } from "../../state/appState";

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
          setBuildings(b);
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

  const userLocation = useMemo(() => ({ x: 48, y: 40 }), []);
  const buildingsNearbyOrder = useMemo(() => {
    const withDistance = buildings.map((b) => {
      const pos = b.mapPosition ?? { x: 0, y: 0 };
      const dx = pos.x - userLocation.x;
      const dy = pos.y - userLocation.y;
      return { building: b, d2: dx * dx + dy * dy };
    });
    withDistance.sort((a, b) => a.d2 - b.d2);
    return withDistance.map((x) => x.building.id);
  }, [buildings, userLocation.x, userLocation.y]);

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

      <div className="mapCard">
        {loading ? (
          <div className="mapLoading">Loading campus events…</div>
        ) : (
          <svg className="campusMap" viewBox="0 0 100 80" role="img" aria-label="Campus map">
            {/* Simple campus grid background */}
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
              </pattern>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0.7" stdDeviation="1.0" floodColor="rgba(0,0,0,0.6)" />
              </filter>
            </defs>
            <rect x="0" y="0" width="100" height="80" fill="rgba(255,255,255,0.04)" />
            <rect x="0" y="0" width="100" height="80" fill="url(#grid)" opacity="0.65" />

            {/* Roads / campus lanes (visual only) */}
            <path d="M0 55 C 18 45, 35 60, 55 52 C 70 46, 82 41, 100 44" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" fill="none" />
            <path d="M0 28 C 20 18, 40 36, 60 30 C 76 25, 88 20, 100 22" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" fill="none" />

            {/* Mock "user location" marker */}
            <circle cx={userLocation.x} cy={userLocation.y} r="1.8" fill="#3B82F6" />
            <circle cx={userLocation.x} cy={userLocation.y} r="3.6" fill="rgba(59,130,246,0.22)" />

            {/* Buildings */}
            {buildings.map((b) => {
              const pos = b.mapPosition ?? { x: 0, y: 0 };
              const hasEvents = (eventsByBuilding.get(b.id)?.length ?? 0) > 0;
              const nearbyRank = buildingsNearbyOrder.indexOf(b.id);
              const isNearby = nearbyRank !== -1 && nearbyRank < 2;

              const width = 12;
              const height = 8;
              const x = pos.x - width / 2;
              const y = pos.y - height / 2;

              return (
                <g
                  key={b.id}
                  onClick={() => setPopupBuilding(b)}
                  style={{ cursor: "pointer" }}
                  filter={hasEvents ? "url(#shadow)" : undefined}
                >
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="2.2"
                    fill={hasEvents ? "rgba(200,16,46,0.35)" : isNearby ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)"}
                    stroke={hasEvents ? "rgba(200,16,46,0.95)" : isNearby ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.12)"}
                    strokeWidth={hasEvents ? 1.1 : 0.7}
                  />

                  {/* Event pin */}
                  {hasEvents ? (
                    <>
                      <circle cx={pos.x} cy={y - 1.3} r="2.1" fill="#c8102e" />
                      <circle cx={pos.x} cy={y - 1.3} r="4.2" fill="rgba(200,16,46,0.22)" />
                      <text x={pos.x} y={y - 0.05} textAnchor="middle" fill="white" fontSize="2.4" fontWeight="800">
                        {(eventsByBuilding.get(b.id)?.length ?? 0) > 9 ? "9+" : eventsByBuilding.get(b.id)?.length ?? 0}
                      </text>
                    </>
                  ) : null}

                  {/* Building label */}
                  <text x={pos.x} y={y + height + 3} textAnchor="middle" fill="rgba(255,255,255,0.78)" fontSize="2.2">
                    {b.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

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

