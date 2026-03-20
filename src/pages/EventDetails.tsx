import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Club, EventModel, Friend, getClubs, getEvent, getFriends } from "../api/client";
import { useAppState } from "../state/appState";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { date, time };
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const EventDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleGoingEvent, isEventGoing } = useAppState();

  const eventId = id ? decodeURIComponent(id) : null;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!eventId) return;
      setLoading(true);
      try {
        const [e, c, f] = await Promise.all([getEvent(eventId), getClubs(), getFriends()]);
        if (cancelled) return;
        setEvent(e);
        setClubs(c);
        setFriends(f);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const clubName = useMemo(() => {
    if (!event) return "";
    return clubs.find((c) => c.id === event.clubId)?.name ?? "Club";
  }, [clubs, event]);

  const friendsGoing = useMemo(() => {
    if (!event) return [];
    const byId = new Map(friends.map((f) => [f.id, f] as const));
    return event.friendsGoing.map((id) => byId.get(id)).filter(Boolean) as Friend[];
  }, [event, friends]);

  const isGoing = eventId ? isEventGoing(eventId) : false;

  if (!eventId) return null;

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Event</div>
        <div />
      </div>

      {loading || !event ? (
        <div className="placeholderCard">Loading event…</div>
      ) : (
        <>
          <div className="detailBanner" aria-hidden />

          <div className="detailTitle">{event.title}</div>
          <div className="detailClub">{clubName}</div>

          <div className="detailMetaBlock">
            <div className="detailMetaLine">
              📅 {formatDateTime(event.startTime).date} · {formatDateTime(event.startTime).time} -{" "}
              {formatDateTime(event.endTime).time}
            </div>
            <div className="detailMetaLine">📍 {event.building} · {event.room}</div>
            <div className="detailMetaLine">
              👥 Attendance: {event.attendanceCount}/{event.capacity}
            </div>
            <div className="detailMetaLine">
              {event.foodAvailable ? `🍽️ Food available${event.foodType ? `: ${event.foodType}` : ""}` : "🚫 No food available"}
            </div>
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">About</div>
            <div className="detailDesc">{event.description}</div>
            {event.tags.length ? <div className="tagRow">{event.tags.slice(0, 4).map((t) => <span key={t} className="tag">#{t}</span>)}</div> : null}
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">Friends attending</div>
            {friendsGoing.length === 0 ? (
              <div className="mutedText">No friends going (yet).</div>
            ) : (
              <div className="friendChipRow">
                {friendsGoing.map((f) => (
                  <div key={f.id} className="friendChip sm" style={{ background: f.avatarColor ?? "rgba(255,255,255,0.2)" }}>
                    {initials(f.name)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={`joinBtn ${isGoing ? "active" : ""}`}
            onClick={() => toggleGoingEvent(event.id)}
          >
            Join Event
          </button>

          <div className="bottomSpace" />
        </>
      )}
    </div>
  );
};

