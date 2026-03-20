import React, { useEffect, useMemo, useState } from "react";
import { getClubs, getEvents, Club, EventModel } from "../api/client";
import { useAppState } from "../state/appState";

function formatDayTime(startIso: string) {
  const d = new Date(startIso);
  const day = d.toLocaleDateString([], { weekday: "short" });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export const Profile: React.FC = () => {
  const { user, favoriteClubIds, goingEventIds, toggleFavoriteClub, isEventGoing } = useAppState();

  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [c, e] = await Promise.all([getClubs(), getEvents()]);
        if (cancelled) return;
        setClubs(c);
        setEvents(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteClubs = useMemo(() => clubs.filter((c) => favoriteClubIds.has(c.id)), [clubs, favoriteClubIds]);
  const goingEvents = useMemo(() => events.filter((e) => goingEventIds.has(e.id)), [events, goingEventIds]);

  return (
    <div className="page">
      <h1 className="pageTitle">Profile</h1>

      {loading ? (
        <div className="placeholderCard">Loading profile…</div>
      ) : (
        <>
          <div className="profileHero">
            <div className="profileName">{user?.name ?? "Student"}</div>
            <div className="profileProgram">{user?.program ?? "Program"}</div>
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Favorite Clubs</div>
            {favoriteClubs.length === 0 ? (
              <div className="mutedText">No favorites yet.</div>
            ) : (
              <div className="listStack">
                {favoriteClubs.map((club) => (
                  <div key={club.id} className="profileListRow">
                    <div className="profileListMain">
                      <div className="profileListName">{club.name}</div>
                      <div className="profileListMeta">{club.category}</div>
                    </div>
                    <button
                      type="button"
                      className={`starBtn small ${favoriteClubIds.has(club.id) ? "active" : ""}`}
                      onClick={() => toggleFavoriteClub(club.id)}
                      aria-label="Toggle favorite"
                    >
                      {favoriteClubIds.has(club.id) ? "★" : "☆"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Events You’re Going To</div>
            {goingEvents.length === 0 ? (
              <div className="mutedText">No events marked “I’m Going”.</div>
            ) : (
              <div className="listStack">
                {goingEvents.map((ev) => (
                  <div key={ev.id} className="profileEventRow">
                    <div className="profileEventMain">
                      <div className="profileEventTitle">{ev.title}</div>
                      <div className="profileEventMeta">
                        🏫 {ev.building} · {ev.room} · {formatDayTime(ev.startTime)}
                      </div>
                    </div>
                    <div className="goingPill">{isEventGoing(ev.id) ? "Going" : "Saved"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Settings</div>
            <div className="settingsRow">Notifications (placeholder)</div>
            <div className="settingsRow">Map preferences (placeholder)</div>
            <div className="settingsRow">Accessibility (placeholder)</div>
          </div>
        </>
      )}
    </div>
  );
};

