import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { SegmentedControl, SegmentedOption } from "../components/filters/SegmentedControl";
import { ScheduleToggle } from "../components/ScheduleToggle";
import { getClubs, getEvents, getFriends, getSchedule, EventModel, Friend, Club, ScheduleResponse } from "../api/client";
import { useAppState, ExploreFilter } from "../state/appState";

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export const Explore: React.FC = () => {
  const navigate = useNavigate();
  const {
    exploreFilter,
    setExploreFilter,
    scheduleConflictEnabled,
    setScheduleConflictEnabled,
    favoriteClubIds,
    toggleGoingEvent,
    isEventGoing,
  } = useAppState();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [e, c, f, s] = await Promise.all([getEvents(), getClubs(), getFriends(), getSchedule()]);
        if (cancelled) return;
        setEvents(e);
        setClubs(c);
        setFriends(f);
        setSchedule(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c] as const)), [clubs]);

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const nowLocal = now;

    const eventsForSegment = events.filter((ev) => {
      const start = new Date(ev.startTime);
      const end = new Date(ev.endTime);

      const isNow = start <= nowLocal && end >= nowLocal;
      const isUpcoming = start > nowLocal;

      if (exploreFilter === "now") return isNow;
      if (exploreFilter === "upcoming") return isUpcoming;
      if (exploreFilter === "myclubs") return favoriteClubIds.has(ev.clubId) && (isNow || isUpcoming);
      return true;
    });

    if (!schedule || !scheduleConflictEnabled) return eventsForSegment;

    return eventsForSegment.filter((ev) => {
      const eStart = new Date(ev.startTime);
      const eEnd = new Date(ev.endTime);
      return !schedule.classes.some((cls) => {
        const cStart = new Date(cls.startDateTime);
        const cEnd = new Date(cls.endDateTime);
        return overlaps(eStart, eEnd, cStart, cEnd);
      });
    });
  }, [events, exploreFilter, schedule, scheduleConflictEnabled, favoriteClubIds, now]);

  const segmentOptions: SegmentedOption<ExploreFilter>[] = [
    { value: "now", label: "Now" },
    { value: "upcoming", label: "Upcoming" },
    { value: "myclubs", label: "My Clubs" },
  ];

  return (
    <div className="page">
      <h1 className="pageTitle">Explore</h1>

      <SegmentedControl value={exploreFilter} options={segmentOptions} onChange={setExploreFilter} />

      <div className="spacer12" />

      <ScheduleToggle checked={scheduleConflictEnabled} onChange={setScheduleConflictEnabled} />

      <div className="spacer12" />

      {loading ? (
        <div className="placeholderCard">Loading events…</div>
      ) : filtered.length === 0 ? (
        <div className="placeholderCard">No events match your filters.</div>
      ) : (
        <div className="stack">
          {filtered.map((ev) => {
            const club = clubById.get(ev.clubId);
            if (!club) return null;
            return (
              <EventCard
                key={ev.id}
                event={ev}
                clubName={club.name}
                friends={friends}
                isGoing={isEventGoing(ev.id)}
                onToggleGoing={() => toggleGoingEvent(ev.id)}
                onOpen={() => navigate(`/event/${encodeURIComponent(ev.id)}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

