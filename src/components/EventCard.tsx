import React from "react";
import { EventModel, Friend } from "../api/client";

function formatTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const timeA = start.toLocaleTimeString([], timeOpts);
  const timeB = end.toLocaleTimeString([], timeOpts);
  return `${timeA} - ${timeB}`;
}

function formatAttendanceCount(count: number, capacity: number) {
  return `${count}/${capacity}`;
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

  return (
    <div
      className="eventCard"
      role="group"
      aria-label={`Event: ${event.title}`}
      onClick={onOpen}
      style={{ cursor: onOpen ? "pointer" : "default" }}
    >
      <div className="eventCardHeader">
        <div className="eventCardTitleRow">
          <div className="eventCardTitle">{event.title}</div>
        </div>
        <div className="eventCardClub">{clubName}</div>
      </div>

      <div className="eventCardMeta">
        <div className="eventCardLine">🏛️ {event.building} · {event.room}</div>
        <div className="eventCardLine">🕒 {formatTimeRange(event.startTime, event.endTime)}</div>
        <div className="eventCardLine">👥 Attendance: {formatAttendanceCount(event.attendanceCount, event.capacity)}</div>
        <div className="eventCardLine">
          {event.foodAvailable ? "🍽️ Food available" : "🚫 No food"}{" "}
          {event.foodAvailable && event.foodType ? `(${event.foodType})` : ""}
        </div>
      </div>

      <div className="eventCardFooter">
        <div className="friendChips" aria-label="Friends attending">
          {friendCount > 0 ? (
            <>
              <div className="friendCount">{friendCount} friend{friendCount === 1 ? "" : "s"} going</div>
              <div className="friendChipRow">
                {shownFriends.map((f) => (
                  <div
                    key={f.id}
                    className="friendChip"
                    title={f.name}
                    style={{ background: f.avatarColor ?? "rgba(255,255,255,0.2)" }}
                  >
                    {initials(f.name)}
                  </div>
                ))}
                {extra > 0 ? <div className="friendChip extra">+{extra}</div> : null}
              </div>
            </>
          ) : (
            <div className="friendCount muted">No friends going</div>
          )}
        </div>

        <button
          type="button"
          className={`goingBtn ${isGoing ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGoing();
          }}
        >
          I’m Going
        </button>
      </div>
    </div>
  );
}

