import React, { useMemo } from "react";
import { EventModel, Friend } from "../api/client";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function FriendList(props: {
  friends: Friend[];
  events: EventModel[];
  onOpenEvent: (eventId: string) => void;
  onRemoveFriend?: (friendId: string) => void;
  removingFriendId?: string | null;
  emptyMessage?: string;
}) {
  const { friends, events, onOpenEvent, onRemoveFriend, removingFriendId, emptyMessage } = props;

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e] as const)), [events]);

  if (friends.length === 0) {
    return <div className="placeholderCard">{emptyMessage ?? "No friends yet."}</div>;
  }

  return (
    <div className="friendList">
      {friends.map((friend) => {
        const attended = friend.attendingEventIds.map((id) => eventById.get(id)).filter(Boolean) as EventModel[];
        return (
          <div key={friend.id} className="friendCard">
            <div className="friendTopRow">
              <div className="friendTop">
                <div className="friendAvatar" style={{ background: friend.avatarColor ?? "rgba(255,255,255,0.18)" }}>
                  {initials(friend.name)}
                </div>
                <div className="friendNameBlock">
                  <div className="friendName">{friend.name}</div>
                  <div className="friendMeta">
                    {friend.program || friend.year ? [friend.program, friend.year].filter(Boolean).join(" · ") : "Student"}
                  </div>
                </div>
              </div>
              {onRemoveFriend ? (
                <button
                  type="button"
                  className="secondaryBtn socialActionBtn"
                  onClick={() => onRemoveFriend(friend.id)}
                  disabled={removingFriendId === friend.id}
                >
                  {removingFriendId === friend.id ? "Removing..." : "Remove"}
                </button>
              ) : null}
            </div>

            <div className="friendStatRow">
              <span className="socialBadge">{attended.length} events</span>
              {friend.sharedClubCount > 0 ? <span className="socialBadge subtle">{friend.sharedClubCount} shared clubs</span> : null}
              {friend.mutualFriendsCount > 0 ? <span className="socialBadge subtle">{friend.mutualFriendsCount} mutual friends</span> : null}
            </div>

            <div className="friendEvents">
              {attended.length === 0 ? (
                <div className="mutedText">No upcoming events yet</div>
              ) : (
                attended.map((event) => (
                  <button key={event.id} type="button" className="friendEventChip" onClick={() => onOpenEvent(event.id)}>
                    <span className="friendEventTitle">{event.title}</span>
                    <span className="friendEventMeta">
                      {event.building} · {event.room}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
