import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building, EventModel, getBuildings, getEvents } from "../api/client";
import { CampusImageMap } from "../components/CampusMap/CampusImageMap";
import { mergeCampusMapBuildings } from "../components/CampusMap/campusMapData";

function isSameLocalDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString([], timeOpts)} - ${end.toLocaleTimeString([], timeOpts)}`;
}

export const BuildingFloorView: React.FC = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [b, e] = await Promise.all([getBuildings(), getEvents()]);
        if (cancelled) return;
        const mergedBuildings = mergeCampusMapBuildings(b);
        setBuildings(mergedBuildings);
        setEvents(e);
        const match = mergedBuildings.find((x) => x.id === buildingId);
        if (match) {
          setSelectedFloor(match.floors[0] ?? null);
          setSelectedRoom(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const building = useMemo(() => buildings.find((b) => b.id === buildingId) ?? null, [buildings, buildingId]);
  const now = useMemo(() => new Date(), [loading]);
  const today = useMemo(() => new Date(), [loading]);

  const eventsToday = useMemo(() => {
    if (!buildingId) return [];
    return events
      .filter((ev) => ev.building === buildingId)
      .filter((ev) => isSameLocalDate(new Date(ev.startTime), today))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, buildingId, today]);

  const activeEventsToday = useMemo(() => {
    return eventsToday.filter((ev) => new Date(ev.endTime).getTime() >= now.getTime());
  }, [eventsToday, now]);

  const activeCountsByBuilding = useMemo(() => {
    const byBuilding = new Map<string, number>();
    for (const ev of events) {
      if (!isSameLocalDate(new Date(ev.startTime), today)) continue;
      if (new Date(ev.endTime).getTime() < now.getTime()) continue;
      byBuilding.set(ev.building, (byBuilding.get(ev.building) ?? 0) + 1);
    }
    return byBuilding;
  }, [events, today, now]);

  const floorEventsToday = useMemo(() => {
    if (selectedFloor == null) return [];
    return eventsToday.filter((ev) => ev.floor === selectedFloor);
  }, [eventsToday, selectedFloor]);

  const floorActiveEventsToday = useMemo(() => {
    if (selectedFloor == null) return [];
    return activeEventsToday.filter((ev) => ev.floor === selectedFloor);
  }, [activeEventsToday, selectedFloor]);

  const roomsWithActiveOnFloor = useMemo(() => {
    const byRoom = new Map<string, number>();
    for (const ev of floorActiveEventsToday) {
      byRoom.set(ev.room, (byRoom.get(ev.room) ?? 0) + 1);
    }
    return Array.from(byRoom.entries())
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => a.room.localeCompare(b.room));
  }, [floorActiveEventsToday]);

  const filteredRoomEvents = useMemo(() => {
    if (!selectedRoom) return floorEventsToday;
    return floorEventsToday.filter((ev) => ev.room === selectedRoom);
  }, [floorEventsToday, selectedRoom]);

  if (loading) {
    return (
      <div className="page">
        <div className="placeholderCard">Loading building...</div>
      </div>
    );
  }

  if (!building || selectedFloor == null) {
    return (
      <div className="page">
        <div className="placeholderCard">No building found.</div>
      </div>
    );
  }

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">{building.name}</div>
        <div />
      </div>

      <div className="sectionBlock compact">
        <div className="buildingMapHeader">
          <div className="sectionTitle">Campus map</div>
          <div className="buildingMapMeta">
            {activeEventsToday.length} active event{activeEventsToday.length === 1 ? "" : "s"} today
          </div>
        </div>
        <CampusImageMap
          ariaLabel={`Campus map with ${building.name} highlighted`}
          buildings={buildings}
          countsByBuilding={activeCountsByBuilding}
          selectedBuildingId={building.id}
          onSelectBuilding={(nextBuilding) => navigate(`/building/${encodeURIComponent(nextBuilding.id)}`)}
        />
      </div>

      <div className="floorSelector">
        <div className="floorSelectorLabel">Floor</div>
        <div className="floorSelectorRow">
          {building.floors.map((f) => {
            const active = f === selectedFloor;
            return (
              <button key={f} type="button" className={`floorBtn ${active ? "active" : ""}`} onClick={() => setSelectedFloor(f)}>
                {f === 0 ? "G" : f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sectionBlock compact">
        <div className="sectionTitle">Rooms with active events</div>
        {roomsWithActiveOnFloor.length === 0 ? (
          <div className="mutedText">No active events on this floor.</div>
        ) : (
          <div className="roomList">
            {roomsWithActiveOnFloor.map((r) => {
              const active = r.room === selectedRoom;
              return (
                <button
                  key={r.room}
                  type="button"
                  className={`roomRow ${active ? "active" : ""}`}
                  onClick={() => setSelectedRoom(active ? null : r.room)}
                >
                  <div className="roomNum">{r.room}</div>
                  <div className="roomCount">{r.count} event{r.count === 1 ? "" : "s"}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="sectionBlock compact">
        <div className="sectionTitle">Today's events · Floor {selectedFloor}</div>
        {filteredRoomEvents.length === 0 ? (
          <div className="mutedText">No events today.</div>
        ) : (
          <div className="stack">
            {filteredRoomEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="eventRow"
                onClick={() => navigate(`/event/${encodeURIComponent(ev.id)}`)}
              >
                <div className="eventRowMain">
                  <div className="eventRowTitle">{ev.title}</div>
                  <div className="eventRowMeta">
                    {formatTimeRange(ev.startTime, ev.endTime)} · {ev.room}
                  </div>
                </div>
                <div className="eventRowBadges">
                  <div className="badge subtle">{ev.attendanceCount} attending</div>
                  {ev.foodAvailable ? <div className="badge">Food</div> : <div className="badge subtle">No food</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
