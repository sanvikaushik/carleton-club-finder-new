import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Club, EventModel, getClubs, getDiscovery, getEvents } from "../api/client";
import { ClubCard } from "../components/ClubCard";
import { ClubSpotlightCard } from "../components/ClubSpotlightCard";
import { DiscoveryPanel } from "../components/DiscoveryPanel";
import { useAppState } from "../state/appState";

export const Clubs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, toggleFavoriteClub, isClubFavorite } = useAppState();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [recommendedClubs, setRecommendedClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const createdClubName = ((location.state as { createdClubName?: string } | null) ?? {}).createdClubName;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [clubRows, eventRows, discovery] = await Promise.all([getClubs(), getEvents(), getDiscovery()]);
        if (cancelled) return;
        setClubs(clubRows);
        setEvents(eventRows);
        setRecommendedClubs(discovery.recommendedClubs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  const clubsWithUpcoming = useMemo(() => {
    return clubs
      .map((club) => {
        const upcoming = events
          .filter((event) => event.clubId === club.id)
          .filter((event) => new Date(event.endTime) >= now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return { club, upcoming };
      })
      .sort((left, right) => (right.club.followerCount ?? 0) - (left.club.followerCount ?? 0));
  }, [clubs, events, now]);

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 className="pageTitle">Clubs</h1>
          <div className="pageSubtitle">Browse student communities, discover rising clubs, and add your own profile.</div>
        </div>
        <button type="button" className="headerActionBtn" onClick={() => navigate("/clubs/create")}>
          Create Club
        </button>
      </div>

      {createdClubName ? <div className="statusBanner success">{createdClubName} was created successfully.</div> : null}

      <DiscoveryPanel title="Recommended Clubs" subtitle="A personalized mix based on your network and recent activity.">
        {loading ? (
          <div className="placeholderCard">Loading club recommendations...</div>
        ) : (
          <div className="spotlightGrid">
            {recommendedClubs.slice(0, 3).map((club) => (
              <ClubSpotlightCard key={club.id} club={club} reason="Strong match for your profile" onOpen={() => navigate(`/clubs/${encodeURIComponent(club.id)}`)} />
            ))}
          </div>
        )}
      </DiscoveryPanel>

      <div className="spacer12" />

      {loading ? (
        <div className="placeholderCard">Loading clubs...</div>
      ) : (
        <div className="clubGrid">
          {clubsWithUpcoming.map(({ club, upcoming }) => (
            <ClubCard
              key={club.id}
              club={club}
              favorite={isClubFavorite(club.id)}
              onToggleFavorite={() => {
                if (!authUser) {
                  navigate("/login");
                  return;
                }
                toggleFavoriteClub(club.id);
              }}
              upcomingEvents={upcoming}
              onOpenEvent={(eventId) => navigate(`/event/${encodeURIComponent(eventId)}`)}
              onOpenClub={() => navigate(`/clubs/${encodeURIComponent(club.id)}`)}
              followLabel={!authUser ? "Login to Follow" : isClubFavorite(club.id) ? "Following" : "Follow"}
            />
          ))}
        </div>
      )}
    </div>
  );
};
