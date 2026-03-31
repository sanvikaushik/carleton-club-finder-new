import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClubs, getEvents, Club, EventModel } from "../api/client";
import { useAppState } from "../state/appState";

function formatDayTime(startIso: string) {
  const date = new Date(startIso);
  return `${date.toLocaleDateString([], { weekday: "short" })} · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, authUser, isAuthenticated, favoriteClubIds, goingEventIds, toggleFavoriteClub, isEventGoing, logOutUser } = useAppState();

  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [clubRows, eventRows] = await Promise.all([getClubs(), getEvents()]);
        if (cancelled) return;
        setClubs(clubRows);
        setEvents(eventRows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteClubs = useMemo(() => clubs.filter((club) => favoriteClubIds.has(club.id)), [clubs, favoriteClubIds]);
  const goingEvents = useMemo(() => events.filter((event) => goingEventIds.has(event.id)), [events, goingEventIds]);
  const streak = Math.min(goingEvents.length, 7);
  const badges = [
    { id: "explorer", label: "Explorer", unlocked: goingEvents.length >= 2 },
    { id: "social", label: "Social", unlocked: favoriteClubs.length >= 3 },
    { id: "pulse", label: "Pulse", unlocked: goingEvents.some((event) => event.happeningNow) },
  ];

  return (
    <div className="page">
      <h1 className="pageTitle">Profile</h1>

      {loading ? (
        <div className="placeholderCard">Loading profile...</div>
      ) : (
        <>
          <div className="profileHero upgraded">
            <div className="profileName">{user?.name ?? "Student"}</div>
            <div className="profileProgram">{[user?.program, user?.year].filter(Boolean).join(" · ") || "Carleton student"}</div>

            <div className="heroStatGrid compactStats">
              <div className="heroStatCard">
                <div className="heroStatValue">{favoriteClubs.length}</div>
                <div className="heroStatLabel">Followed clubs</div>
              </div>
              <div className="heroStatCard">
                <div className="heroStatValue">{goingEvents.length}</div>
                <div className="heroStatLabel">Events joined</div>
              </div>
              <div className="heroStatCard">
                <div className="heroStatValue">{streak}</div>
                <div className="heroStatLabel">Campus streak</div>
              </div>
            </div>

            <div className="profileSessionRow">
              {isAuthenticated ? (
                <>
                  <div className="profileSessionMeta">{authUser?.email ?? "Signed in"}</div>
                  <button type="button" className="secondaryBtn profileSessionBtn" onClick={() => void logOutUser()}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="profileSessionMeta">Demo mode. Log in to make this profile yours.</div>
                  <div className="profileAuthActions">
                    <button type="button" className="secondaryBtn profileSessionBtn" onClick={() => navigate("/login")}>
                      Login
                    </button>
                    <button type="button" className="primaryBtn profileSessionPrimary" onClick={() => navigate("/signup")}>
                      Sign Up
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Badges</div>
            <div className="badgeShelf">
              {badges.map((badge) => (
                <div key={badge.id} className={`badgeCard ${badge.unlocked ? "unlocked" : ""}`}>
                  <div className="badgeCardTitle">{badge.label}</div>
                  <div className="badgeCardMeta">{badge.unlocked ? "Unlocked" : "Keep exploring"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Followed Clubs</div>
            {favoriteClubs.length === 0 ? (
              <div className="mutedText">{isAuthenticated ? "No followed clubs yet." : "Log in to follow clubs with your own account."}</div>
            ) : (
              <div className="listStack">
                {favoriteClubs.map((club) => (
                  <div key={club.id} className="profileListRow">
                    <div className="profileListMain">
                      <div className="profileListName">{club.name}</div>
                      <div className="profileListMeta">
                        {club.category} · {club.followerCount ?? 0} followers
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`followBtn small ${favoriteClubIds.has(club.id) ? "active" : ""}`}
                      onClick={() => {
                        if (!authUser) {
                          navigate("/login");
                          return;
                        }
                        toggleFavoriteClub(club.id);
                      }}
                    >
                      {favoriteClubIds.has(club.id) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Events You're Going To</div>
            {goingEvents.length === 0 ? (
              <div className="mutedText">No events marked as going.</div>
            ) : (
              <div className="listStack">
                {goingEvents.map((event) => (
                  <div key={event.id} className="profileEventRow">
                    <div className="profileEventMain">
                      <div className="profileEventTitle">{event.title}</div>
                      <div className="profileEventMeta">
                        {event.building} · {event.room} · {formatDayTime(event.startTime)}
                      </div>
                    </div>
                    <div className="goingPill">{isEventGoing(event.id) ? "Going" : "Saved"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
