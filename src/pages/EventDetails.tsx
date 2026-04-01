import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { AttendanceMeter } from "../components/AttendanceMeter";
import { cancelClubEvent, Club, EventModel, Friend, getClubs, getEvent, getEventFriendsGoing, getFriends } from "../api/client";
import { useAppState } from "../state/appState";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} | ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const REACTION_OPTIONS = ["🔥", "🎉", "🧠"];

export const EventDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleGoingEvent, isEventGoing, isAuthenticated } = useAppState();

  const eventId = id ? decodeURIComponent(id) : null;
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [eventFriends, setEventFriends] = useState<Friend[] | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState<"cancel" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!eventId) return;
      setLoading(true);
      try {
        const [eventRow, clubRows, friendRows, friendsGoingPayload] = await Promise.all([
          getEvent(eventId),
          getClubs(),
          getFriends(),
          isAuthenticated ? getEventFriendsGoing(eventId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setEvent(eventRow);
        setClubs(clubRows);
        setFriends(friendRows);
        setEventFriends(friendsGoingPayload?.friends ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, isAuthenticated]);

  useEffect(() => {
    if (!eventId) return;
    const saved = window.localStorage.getItem(`event-reaction:${eventId}`);
    setReaction(saved);
  }, [eventId]);

  const clubName = useMemo(() => {
    if (!event) return "";
    return clubs.find((club) => club.id === event.clubId)?.name ?? "Club";
  }, [clubs, event]);

  const friendsGoing = useMemo(() => {
    if (eventFriends) return eventFriends;
    if (!event) return [];
    const byId = new Map(friends.map((friend) => [friend.id, friend] as const));
    return event.friendsGoing.map((friendId) => byId.get(friendId)).filter(Boolean) as Friend[];
  }, [event, eventFriends, friends]);

  const handleCancelEvent = async () => {
    if (!eventId || !event) return;
    if (!window.confirm("Cancel this event? Attendees will keep their history and receive a notification.")) {
      return;
    }
    setBusyAction("cancel");
    setActionError("");
    try {
      const cancelled = await cancelClubEvent(eventId);
      setEvent(cancelled);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        setActionError(error.response?.data?.error ?? "Could not cancel this event.");
      } else {
        setActionError("Could not cancel this event.");
      }
    } finally {
      setBusyAction(null);
    }
  };

  if (!eventId) {
    return null;
  }

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
        <div className="placeholderCard">Loading event...</div>
      ) : (
        <>
          <div className={`detailBanner enriched ${event.happeningNow ? "live" : ""}`} aria-hidden />

          {event.isCancelled ? <div className="statusBanner error">This event has been cancelled.</div> : null}
          {actionError ? <div className="statusBanner error">{actionError}</div> : null}

          <div className="detailTitleRow">
            <div>
              <div className="detailTitle">{event.title}</div>
              <div className="detailClub">{clubName}</div>
            </div>
            <div className="eventBadgeRow">
              {event.happeningNow ? <div className="liveBadge">Happening Now</div> : null}
              {event.isCancelled ? <div className="eventBadge">Cancelled</div> : null}
            </div>
          </div>

          <div className="tagRow">
            {event.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>

          <div className="detailMetaGrid">
            <div className="detailMetaCard">
              <div className="detailMetaLabel">When</div>
              <div className="detailMetaValue">{formatDateTime(event.startTime)}</div>
              <div className="detailMetaSmall">Ends {formatDateTime(event.endTime)}</div>
            </div>
            <div className="detailMetaCard">
              <div className="detailMetaLabel">Where</div>
              <div className="detailMetaValue">{event.building}</div>
              <div className="detailMetaSmall">
                Floor {event.floor} | {event.room}
              </div>
            </div>
            <div className="detailMetaCard">
              <div className="detailMetaLabel">Crowd</div>
              <div className="detailMetaValue">{event.attendanceCount}/{event.capacity}</div>
              <div className="detailMetaSmall">{friendsGoing.length} friends spotted</div>
            </div>
          </div>

          {event.canManage ? (
            <div className="organizerActionRow">
              <button type="button" className="secondaryBtn organizerActionBtn" onClick={() => navigate(`/events/${encodeURIComponent(event.id)}/edit`)}>
                Edit Event
              </button>
              {!event.isCancelled ? (
                <button type="button" className="secondaryBtn organizerDangerBtn" onClick={() => void handleCancelEvent()} disabled={busyAction === "cancel"}>
                  {busyAction === "cancel" ? "Cancelling..." : "Cancel Event"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="detailSection">
            <div className="detailSectionTitle">Campus energy</div>
            <AttendanceMeter
              eventId={event.id}
              attendanceCount={event.attendanceCount}
              capacity={event.capacity}
              startTime={event.startTime}
              endTime={event.endTime}
            />
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">About</div>
            <div className="detailDesc">{event.description}</div>
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">Friends attending</div>
            {friendsGoing.length === 0 ? (
              <div className="mutedText">No friends going yet.</div>
            ) : (
              <>
                <div className="friendChipRow">
                  {friendsGoing.map((friend) => (
                    <div key={friend.id} className="friendChip sm" style={{ background: friend.avatarColor ?? "rgba(255,255,255,0.2)" }} title={friend.name}>
                      {initials(friend.name)}
                    </div>
                  ))}
                </div>
                <div className="friendNamesLine detailFriendNames">{friendsGoing.map((friend) => friend.name).join(", ")}</div>
              </>
            )}
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">Quick reactions</div>
            <div className="reactionRow">
              {REACTION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`reactionChip ${reaction === option ? "active" : ""}`}
                  onClick={() => {
                    setReaction(option);
                    window.localStorage.setItem(`event-reaction:${event.id}`, option);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {!event.isCancelled ? (
            <button type="button" className={`joinBtn ${isEventGoing(event.id) ? "active" : ""}`} onClick={() => toggleGoingEvent(event.id)}>
              {isEventGoing(event.id) ? "Leave Event" : "Join Event"}
            </button>
          ) : null}

          <div className="bottomSpace" />
        </>
      )}
    </div>
  );
};
