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
}) {
  const { friends, events, onOpenEvent } = props;

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  return (
    <div className="friendList">
      {friends.map((f) => {
        const attended = f.attendingEventIds.map((id) => eventById.get(id)).filter(Boolean) as EventModel[];

        return (
          <div key={f.id} className="friendCard">
            <div className="friendTop">
              <div className="friendAvatar" style={{ background: f.avatarColor ?? "rgba(255,255,255,0.18)" }}>
                {initials(f.name)}
              </div>
              <div className="friendNameBlock">
                <div className="friendName">{f.name}</div>
                <div className="friendMeta">{attended.length} attending</div>
              </div>
            </div>

            <div className="friendEvents">
              {attended.length === 0 ? (
                <div className="mutedText">No events yet</div>
              ) : (
                attended.map((ev) => (
                  <button key={ev.id} type="button" className="friendEventChip" onClick={() => onOpenEvent(ev.id)}>
                    <span className="friendEventTitle">{ev.title}</span>
                    <span className="friendEventMeta">
                      {ev.building} · {ev.room}
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

