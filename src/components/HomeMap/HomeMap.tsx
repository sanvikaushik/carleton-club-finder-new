import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBuildings, getEvents, getFriends, Building, EventModel, Friend } from "../../api/client";
import { useAppState, HomeTimeFilter } from "../../state/appState";
import { CampusImageMap } from "../CampusMap/CampusImageMap";
import { mergeCampusMapBuildings } from "../CampusMap/campusMapData";
import { SegmentedControl, SegmentedOption } from "../filters/SegmentedControl";
import { BuildingCardPopup } from "./BuildingCardPopup";

function withinRange(start: Date, end: Date, a: Date, b: Date) {
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

  return events.filter((event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    if (filter === "now") return start <= now && end >= now;
    if (filter === "next2h") return withinRange(start, end, now, next2h);
    return withinRange(start, end, startOfToday, endOfToday) && isSameLocalDate(start, now);
  });
}

export const HomeMap: React.FC = () => {
  const navigate = useNavigate();
  const { homeTimeFilter, setHomeTimeFilter } = useAppState();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupBuilding, setPopupBuilding] = useState<Building | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [buildingRows, eventRows, friendRows] = await Promise.all([getBuildings(), getEvents(), getFriends()]);
        if (!cancelled) {
          setBuildings(mergeCampusMapBuildings(buildingRows));
          setEvents(eventRows);
          setFriends(friendRows);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), [homeTimeFilter, loading]);
  const filteredEvents = useMemo(() => filterEvents(events, homeTimeFilter, now), [events, homeTimeFilter, now]);

  const eventsByBuilding = useMemo(() => {
    const map = new Map<string, EventModel[]>();
    for (const event of filteredEvents) {
      const list = map.get(event.building) ?? [];
      list.push(event);
      map.set(event.building, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [filteredEvents]);

  const friendCountsByBuilding = useMemo(() => {
    const counts = new Map<string, number>();
    const eventById = new Map(events.map((event) => [event.id, event] as const));
    for (const friend of friends) {
      for (const eventId of friend.attendingEventIds) {
        const event = eventById.get(eventId);
        if (!event) continue;
        counts.set(event.building, (counts.get(event.building) ?? 0) + 1);
      }
    }
    return counts;
  }, [events, friends]);

  const eventCountsByBuilding = useMemo(
    () => new Map(Array.from(eventsByBuilding.entries()).map(([id, list]) => [id, list.length])),
    [eventsByBuilding],
  );

  const timeOptions: SegmentedOption<HomeTimeFilter>[] = [
    { value: "now", label: "Now" },
    { value: "next2h", label: "Next 2 Hours" },
    { value: "today", label: "Today" },
  ];

  const activeCount = filteredEvents.filter((event) => event.happeningNow).length;
  const friendHotspotCount = Array.from(friendCountsByBuilding.values()).filter((count) => count > 0).length;

  return (
    <div className="homeMapWrap">
      <div className="homeMapHeader enhanced">
        <div>
          <div className="homeMapTitle">Campus Activity Map</div>
          <div className="homeMapSub">{activeCount} live events · {friendHotspotCount} friend hotspots</div>
        </div>
        <div className="homeMapTimeFilter">
          <SegmentedControl value={homeTimeFilter} options={timeOptions} onChange={setHomeTimeFilter} />
        </div>
      </div>

      <div className="mapPulseRow">
        <div className="mapPulseChip">Live now: {activeCount}</div>
        <div className="mapPulseChip subtle">Busy buildings: {Array.from(eventCountsByBuilding.values()).filter((count) => count > 1).length}</div>
        <div className="mapPulseChip subtle">Friends here: {Array.from(friendCountsByBuilding.values()).reduce((total, count) => total + count, 0)}</div>
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
          friendCountsByBuilding={friendCountsByBuilding}
          selectedBuildingId={popupBuilding?.id ?? null}
          onSelectBuilding={setPopupBuilding}
        />
      )}

      {popupBuilding ? (
        <BuildingCardPopup
          building={popupBuilding}
          events={eventsByBuilding.get(popupBuilding.id) ?? []}
          friendCount={friendCountsByBuilding.get(popupBuilding.id) ?? 0}
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
