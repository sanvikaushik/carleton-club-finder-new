import React from "react";
import { EventModel, Friend } from "../api/client";
import { AttendanceMeter } from "./AttendanceMeter";

function formatTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString([], timeOpts)} - ${end.toLocaleTimeString([], timeOpts)}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function EventCard(props: {
  event: EventModel;
  clubName: string;
  friends: Friend[];
  isGoing: boolean;
  onToggleGoing: () => void;
  onOpen?: () => void;
}) {
  const { event, clubName, friends, isGoing, onToggleGoing, onOpen } = props;

  const attendingFriends = event.friendsGoing
    .map((id) => friends.find((f) => f.id === id))
    .filter(Boolean) as Friend[];

  const friendCount = attendingFriends.length;
  const shownFriends = attendingFriends.slice(0, 3);
  const extra = Math.max(0, friendCount - shownFriends.length);
  const shownNames = shownFriends.map((friend) => friend.name).join(", ");
  const crowdRatio = event.capacity > 0 ? event.attendanceCount / event.capacity : 0;
  const trending = event.happeningNow || crowdRatio > 0.5 || friendCount >= 2;

  return (
    <div
      className={`eventCard ${event.happeningNow ? "isLive" : ""}`}
      role="group"
      aria-label={`Event: ${event.title}`}
      onClick={onOpen}
      style={{ cursor: onOpen ? "pointer" : "default" }}
    >
      {event.imageUrl ? <img className="eventCardImage" src={event.imageUrl} alt="" /> : null}
      <div className="eventCardHeader">
        <div className="eventCardTitleRow">
          <div className="eventCardTitle">{event.title}</div>
          <div className="eventBadgeRow">
            {event.happeningNow ? <span className="liveBadge">Happening Now</span> : null}
            {trending ? <span className="eventBadge">Trending</span> : null}
          </div>
        </div>
        <div className="eventCardClub">{clubName}</div>
      </div>

      <div className="tagRow compact">
        {event.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag subtleTag">
            #{tag}
          </span>
        ))}
      </div>

      <div className="eventCardMeta">
        <div className="eventCardLine">{event.building} · {event.room}</div>
        <div className="eventCardLine">{formatTimeRange(event.startTime, event.endTime)}</div>
        <div className="eventCardLine">{event.foodAvailable ? `Food: ${event.foodType ?? "Available"}` : "No food listed"}</div>
      </div>

      <AttendanceMeter
        eventId={event.id}
        attendanceCount={event.attendanceCount}
        capacity={event.capacity}
        startTime={event.startTime}
        endTime={event.endTime}
        compact
      />

      <div className="eventCardFooter">
        <div className="friendChips" aria-label="Friends attending">
          {friendCount > 0 ? (
            <>
              <div className="friendCount">{friendCount} friend{friendCount === 1 ? "" : "s"} going</div>
              <div className="friendChipRow">
                {shownFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="friendChip"
                    title={friend.name}
                    style={{ background: friend.avatarColor ?? "rgba(255,255,255,0.2)" }}
                  >
                    {initials(friend.name)}
                  </div>
                ))}
                {extra > 0 ? <div className="friendChip extra">+{extra}</div> : null}
              </div>
              <div className="friendNamesLine">
                {shownNames}
                {extra > 0 ? ` and ${extra} more` : ""}
              </div>
            </>
          ) : (
            <div className="friendCount muted">No friends going</div>
          )}
        </div>

        <button
          type="button"
          className={`goingBtn ${isGoing ? "active" : ""}`}
          onClick={(eventClick) => {
            eventClick.stopPropagation();
            onToggleGoing();
          }}
        >
          {isGoing ? "Going" : "I'm Going"}
        </button>
      </div>
    </div>
  );
}
