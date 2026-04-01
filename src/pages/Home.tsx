import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityFeedItem, Club, DiscoveryPayload, Friend, getClubs, getDiscovery, getFriends } from "../api/client";
import { ActivityFeed } from "../components/ActivityFeed";
import { ClubSpotlightCard } from "../components/ClubSpotlightCard";
import { DiscoveryPanel } from "../components/DiscoveryPanel";
import { EventCard } from "../components/EventCard";
import { FriendSearchResults } from "../components/FriendSearchResults";
import { HomeMap } from "../components/HomeMap/HomeMap";
import { useAppState } from "../state/appState";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isEventGoing, toggleGoingEvent, unreadNotificationCount, isAuthenticated } = useAppState();

  const [loading, setLoading] = useState(true);
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [discoveryPayload, friendRows, clubRows] = await Promise.all([getDiscovery(), getFriends(), getClubs()]);
        if (cancelled) return;
        setDiscovery(discoveryPayload);
        setFriends(friendRows);
        setClubs(clubRows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clubNameById = useMemo(() => new Map(clubs.map((club) => [club.id, club.name] as const)), [clubs]);
  const unreadCount = isAuthenticated ? unreadNotificationCount : 0;

  return (
    <div className="page mapPage homePage">
      <div className="pageHeaderRow">
        <div>
          <h1 className="pageTitle">Campus Pulse</h1>
          <div className="pageSubtitle">A more social, live view of clubs, friends, and what is happening right now.</div>
        </div>
        <div className="headerActionGroup">
          <button type="button" className="secondaryBtn headerSecondaryBtn" onClick={() => navigate("/search")}>
            Search
          </button>
          <button type="button" className="headerActionBtn" onClick={() => navigate("/notifications")}>
            Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        </div>
      </div>

      <div className="heroBanner">
        <div className="heroBannerTitle">For You</div>
        <div className="heroBannerText">
          {loading
            ? "Loading recommendations..."
            : discovery?.interests.length
              ? `Built from your recent interests: ${discovery.interests.slice(0, 3).join(", ")}`
              : "Follow clubs and join events to unlock smarter recommendations."}
        </div>
        <div className="heroStatGrid">
          <div className="heroStatCard">
            <div className="heroStatValue">{discovery?.trendingEvents.length ?? 0}</div>
            <div className="heroStatLabel">Trending events</div>
          </div>
          <div className="heroStatCard">
            <div className="heroStatValue">{friends.filter((friend) => friend.attendingEventIds.length > 0).length}</div>
            <div className="heroStatLabel">Friends out tonight</div>
          </div>
          <div className="heroStatCard">
            <div className="heroStatValue">{discovery?.recommendedClubs.length ?? 0}</div>
            <div className="heroStatLabel">Club picks</div>
          </div>
        </div>
      </div>

      <HomeMap />

      <DiscoveryPanel title="For You" subtitle="Ranked from clubs you follow, event tags, and friend activity." actionLabel="Explore" onAction={() => navigate("/explore")}>
        {loading || !discovery ? (
          <div className="placeholderCard">Loading personalized events...</div>
        ) : (
          <div className="stack">
            {discovery.forYouEvents.slice(0, 2).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                clubName={clubNameById.get(event.clubId) ?? "Club"}
                friends={friends}
                isGoing={isEventGoing(event.id)}
                onToggleGoing={() => toggleGoingEvent(event.id)}
                onOpen={() => navigate(`/event/${encodeURIComponent(event.id)}`)}
              />
            ))}
          </div>
        )}
      </DiscoveryPanel>

      <DiscoveryPanel title="Trending Now" subtitle="Fast-moving events with crowd energy and social momentum.">
        {loading || !discovery ? (
          <div className="placeholderCard">Loading trending events...</div>
        ) : (
          <div className="stack">
            {discovery.trendingEvents.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                clubName={clubNameById.get(event.clubId) ?? "Club"}
                friends={friends}
                isGoing={isEventGoing(event.id)}
                onToggleGoing={() => toggleGoingEvent(event.id)}
                onOpen={() => navigate(`/event/${encodeURIComponent(event.id)}`)}
              />
            ))}
          </div>
        )}
      </DiscoveryPanel>

      <DiscoveryPanel title="Recommended Clubs" subtitle="A mix of what your friends follow and what matches your vibe." actionLabel="All Clubs" onAction={() => navigate("/clubs")}>
        {loading || !discovery ? (
          <div className="placeholderCard">Loading club recommendations...</div>
        ) : (
          <div className="spotlightGrid">
            {discovery.recommendedClubs.map((club) => (
              <ClubSpotlightCard
                key={club.id}
                club={club}
                reason="Friend-backed recommendation"
                onOpen={() => navigate(`/clubs/${encodeURIComponent(club.id)}`)}
              />
            ))}
          </div>
        )}
      </DiscoveryPanel>

      <DiscoveryPanel title="Suggested Friends" subtitle="People you may want to add based on shared clubs and campus overlap." actionLabel="Open Friends" onAction={() => navigate("/friends")}>
        {loading || !discovery ? (
          <div className="placeholderCard">Loading suggested friends...</div>
        ) : (
          <FriendSearchResults results={discovery.suggestedFriends} loading={false} actionUserId={null} onPrimaryAction={() => navigate("/friends")} />
        )}
      </DiscoveryPanel>

      <DiscoveryPanel title="Friends Activity" subtitle="A live-looking feed of what your network is joining next.">
        <ActivityFeed
          items={(discovery?.activityFeed ?? []) as ActivityFeedItem[]}
          onOpenEvent={(eventId) => navigate(`/event/${encodeURIComponent(eventId)}`)}
          onOpenClub={(clubId) => navigate(`/clubs/${encodeURIComponent(clubId)}`)}
        />
      </DiscoveryPanel>
    </div>
  );
};
