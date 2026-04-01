import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { DiscoveryPanel } from "../components/DiscoveryPanel";
import { SegmentedControl, SegmentedOption } from "../components/filters/SegmentedControl";
import { ScheduleToggle } from "../components/ScheduleToggle";
import { getClubs, getDiscovery, getEvents, getFriends, getSchedule, EventModel, Friend, Club, ScheduleResponse } from "../api/client";
import { useAppState, ExploreFilter } from "../state/appState";

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { exploreFilter, setExploreFilter, scheduleConflictEnabled, setScheduleConflictEnabled, favoriteClubIds, toggleGoingEvent, isEventGoing } = useAppState();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [forYou, setForYou] = useState<EventModel[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [eventRows, clubRows, friendRows, scheduleRows, discovery] = await Promise.all([getEvents(), getClubs(), getFriends(), getSchedule(), getDiscovery()]);
        if (cancelled) return;
        setEvents(eventRows);
        setClubs(clubRows);
        setFriends(friendRows);
        setSchedule(scheduleRows);
        setForYou(discovery.forYouEvents);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clubById = useMemo(() => new Map(clubs.map((club) => [club.id, club] as const)), [clubs]);
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const eventsForSegment = events.filter((event) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const isNow = start <= now && end >= now;
      const isUpcoming = start > now;

      if (exploreFilter === "now") return isNow;
      if (exploreFilter === "upcoming") return isUpcoming;
      if (exploreFilter === "myclubs") return favoriteClubIds.has(event.clubId) && (isNow || isUpcoming);
      return true;
    });

    if (!schedule || !scheduleConflictEnabled) return eventsForSegment;

    return eventsForSegment.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return !schedule.classes.some((scheduleClass) => {
        const classStart = new Date(scheduleClass.startDateTime);
        const classEnd = new Date(scheduleClass.endDateTime);
        return overlaps(eventStart, eventEnd, classStart, classEnd);
      });
    });
  }, [events, exploreFilter, favoriteClubIds, now, schedule, scheduleConflictEnabled]);

  const segmentOptions: SegmentedOption<ExploreFilter>[] = [
    { value: "now", label: "Now" },
    { value: "upcoming", label: "Upcoming" },
    { value: "myclubs", label: "My Clubs" },
  ];

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 className="pageTitle">Explore</h1>
          <div className="pageSubtitle">Browse the live event stream or jump straight into global search.</div>
        </div>
        <button type="button" className="secondaryBtn headerSecondaryBtn" onClick={() => navigate("/search")}>
          Search
        </button>
      </div>

      <SegmentedControl value={exploreFilter} options={segmentOptions} onChange={setExploreFilter} />

      <div className="spacer12" />

      <ScheduleToggle checked={scheduleConflictEnabled} onChange={setScheduleConflictEnabled} />

      <div className="spacer12" />

      <DiscoveryPanel title="For You" subtitle="Quick picks before the full event feed.">
        {loading ? (
          <div className="placeholderCard">Loading recommendations...</div>
        ) : (
          <div className="stack">
            {forYou.slice(0, 2).map((event) => (
              <EventCard
                key={`foryou-${event.id}`}
                event={event}
                clubName={clubById.get(event.clubId)?.name ?? "Club"}
                friends={friends}
                isGoing={isEventGoing(event.id)}
                onToggleGoing={() => toggleGoingEvent(event.id)}
                onOpen={() => navigate(`/event/${encodeURIComponent(event.id)}`)}
              />
            ))}
          </div>
        )}
      </DiscoveryPanel>

      <div className="spacer12" />

      {loading ? (
        <div className="placeholderCard">Loading events...</div>
      ) : filtered.length === 0 ? (
        <div className="placeholderCard">No events match your filters.</div>
      ) : (
        <div className="stack">
          {filtered.map((event) => {
            const club = clubById.get(event.clubId);
            if (!club) return null;
            return (
              <EventCard
                key={event.id}
                event={event}
                clubName={club.name}
                friends={friends}
                isGoing={isEventGoing(event.id)}
                onToggleGoing={() => toggleGoingEvent(event.id)}
                onOpen={() => navigate(`/event/${encodeURIComponent(event.id)}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
