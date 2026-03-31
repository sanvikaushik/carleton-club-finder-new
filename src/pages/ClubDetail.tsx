import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClubDetailPayload, getClubDetail } from "../api/client";
import { ClubSpotlightCard } from "../components/ClubSpotlightCard";
import { EventCard } from "../components/EventCard";
import { useAppState } from "../state/appState";

export const ClubDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { authUser, favoriteClubIds, isEventGoing, toggleFavoriteClub, toggleGoingEvent } = useAppState();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<ClubDetailPayload | null>(null);

  const clubId = id ? decodeURIComponent(id) : null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clubId) return;
      setLoading(true);
      try {
        const result = await getClubDetail(clubId);
        if (!cancelled) {
          setPayload(result);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (!clubId) {
    return null;
  }

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Club</div>
        <div />
      </div>

      {loading || !payload ? (
        <div className="placeholderCard">Loading club...</div>
      ) : (
        <>
          <div className="clubHeroCard">
            <div className="clubHeroHeader">
              <div>
                <div className="detailTitle">{payload.club.name}</div>
                <div className="detailClub">
                  {payload.club.category} · {payload.club.followerCount ?? 0} followers
                </div>
              </div>
              <button
                type="button"
                className={`followBtn ${favoriteClubIds.has(payload.club.id) ? "active" : ""}`}
                onClick={() => {
                  if (!authUser) {
                    navigate("/login");
                    return;
                  }
                  toggleFavoriteClub(payload.club.id);
                }}
              >
                {favoriteClubIds.has(payload.club.id) ? "Following" : "Follow"}
              </button>
            </div>

            <div className="tagRow">
              {payload.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="detailDesc">{payload.club.description}</div>

            <div className="clubHeroStats">
              <div className="socialBadge">{payload.upcomingEvents.length} upcoming</div>
              {payload.friendFollowerCount > 0 ? <div className="socialBadge subtle">{payload.friendFollowerCount} friends follow</div> : null}
              {payload.club.meetingLocation ? <div className="socialBadge subtle">{payload.club.meetingLocation}</div> : null}
            </div>
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Upcoming Events</div>
            {payload.upcomingEvents.length === 0 ? (
              <div className="mutedText">No upcoming events scheduled right now.</div>
            ) : (
              <div className="stack">
                {payload.upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    clubName={payload.club.name}
                    friends={[]}
                    isGoing={isEventGoing(event.id)}
                    onToggleGoing={() => toggleGoingEvent(event.id)}
                    onOpen={() => navigate(`/event/${encodeURIComponent(event.id)}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">You Might Also Like</div>
            {payload.relatedClubs.length === 0 ? (
              <div className="mutedText">No related clubs available yet.</div>
            ) : (
              <div className="spotlightGrid">
                {payload.relatedClubs.map((club) => (
                  <ClubSpotlightCard key={club.id} club={club} reason="Same category" onOpen={() => navigate(`/clubs/${encodeURIComponent(club.id)}`)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
