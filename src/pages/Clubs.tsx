import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Club, EventModel, getClubs, getEvents } from "../api/client";
import { useAppState } from "../state/appState";
import { ClubCard } from "../components/ClubCard";

export const Clubs: React.FC = () => {
  const navigate = useNavigate();
  const { favoriteClubIds, toggleFavoriteClub, isClubFavorite } = useAppState();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [loading, setLoading] = useState(true);

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

  const now = useMemo(() => new Date(), []);

  const clubsWithUpcoming = useMemo(() => {
    return clubs.map((club) => {
      const upcoming = events
        .filter((ev) => ev.clubId === club.id)
        .filter((ev) => new Date(ev.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      return { club, upcoming };
    });
  }, [clubs, events, now]);

  return (
    <div className="page">
      <h1 className="pageTitle">Clubs</h1>

      {loading ? (
        <div className="placeholderCard">Loading clubs…</div>
      ) : (
        <div className="clubGrid">
          {clubsWithUpcoming.map(({ club, upcoming }) => (
            <ClubCard
              key={club.id}
              club={club}
              favorite={isClubFavorite(club.id)}
              onToggleFavorite={() => toggleFavoriteClub(club.id)}
              upcomingEvents={upcoming}
              onOpenEvent={(eventId) => navigate(`/event/${encodeURIComponent(eventId)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

