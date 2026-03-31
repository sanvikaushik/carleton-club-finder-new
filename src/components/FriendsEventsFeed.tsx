import React from "react";
import { FriendsEventsFeedItem } from "../api/client";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function FriendsEventsFeed(props: {
  items: FriendsEventsFeedItem[];
  loading: boolean;
  onOpenEvent: (eventId: string) => void;
}) {
  const { items, loading, onOpenEvent } = props;

  if (loading) {
    return <div className="placeholderCard">Loading friends' events...</div>;
  }

  if (items.length === 0) {
    return <div className="placeholderCard">Your friends are not marked as going to any events yet.</div>;
  }

  return (
    <div className="socialStack">
      {items.map((item) => (
        <button key={item.eventId} type="button" className="socialCard socialFeedCard" onClick={() => onOpenEvent(item.eventId)}>
          <div className="socialCardTop">
            <div>
              <div className="socialCardTitle">{item.title}</div>
              <div className="socialCardMeta">
                {item.clubName} · {item.building} · {item.room}
              </div>
              <div className="socialSubMeta">{formatTimeRange(item.startTime, item.endTime)}</div>
            </div>
            <div className="socialBadge">{item.friendCount} going</div>
          </div>
          <div className="friendChipRow">
            {item.friends.slice(0, 4).map((friend) => (
              <div
                key={friend.id}
                className="friendChip"
                title={friend.name}
                style={{ background: friend.avatarColor ?? "rgba(255,255,255,0.2)" }}
              >
                {initials(friend.name)}
              </div>
            ))}
          </div>
          <div className="friendNamesLine">
            {item.friends.slice(0, 3).map((friend) => friend.name).join(", ")}
            {item.friends.length > 3 ? ` and ${item.friends.length - 3} more` : ""}
          </div>
        </button>
      ))}
    </div>
  );
}
