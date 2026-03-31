import React from "react";
import { Building, EventModel } from "../../api/client";

export function BuildingCardPopup(props: {
  building: Building;
  events: EventModel[];
  friendCount: number;
  onClose: () => void;
  onViewEvent: (eventId: string) => void;
  onViewFloor: () => void;
}) {
  const { building, events, friendCount, onClose, onViewEvent, onViewFloor } = props;
  const topEvents = events.slice(0, 3);

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Building details">
      <div className="modalSheet">
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{building.name}</div>
            <div className="modalSub">
              {events.length} active event{events.length === 1 ? "" : "s"}
              {friendCount > 0 ? ` · ${friendCount} friends here` : ""}
            </div>
          </div>
          <button className="iconBtn" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modalActions modalActionRow">
          <button className="primaryBtn" type="button" onClick={onViewFloor}>
            View Floor
          </button>
          {friendCount > 0 ? <div className="socialBadge">Your friends are here</div> : null}
        </div>

        <div className="modalBody">
          {topEvents.length === 0 ? (
            <div className="mutedText">No events match the selected time filter.</div>
          ) : (
            <div className="stack">
              {topEvents.map((event) => (
                <button key={event.id} type="button" className="eventRow alive" onClick={() => onViewEvent(event.id)}>
                  <div className="eventRowMain">
                    <div className="eventRowTitle">{event.title}</div>
                    <div className="eventRowMeta">
                      {event.room} · {event.attendanceCount}/{event.capacity} attending
                    </div>
                  </div>
                  <div className="eventRowBadges">
                    {event.happeningNow ? <div className="badge">Live</div> : null}
                    {event.foodAvailable ? <div className="badge">Food</div> : <div className="badge subtle">No food</div>}
                    {event.friendsGoing.length > 0 ? <div className="badge">{event.friendsGoing.length} friends</div> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
