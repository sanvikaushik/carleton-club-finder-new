import React from "react";
import { Building, EventModel } from "../../api/client";

export function BuildingCardPopup(props: {
  building: Building;
  events: EventModel[];
  onClose: () => void;
  onViewEvent: (eventId: string) => void;
  onViewFloor: () => void;
}) {
  const { building, events, onClose, onViewEvent, onViewFloor } = props;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Building details">
      <div className="modalSheet">
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{building.name}</div>
            <div className="modalSub">{events.length} active event(s)</div>
          </div>
          <button className="iconBtn" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalActions">
          <button className="primaryBtn" type="button" onClick={onViewFloor}>
            View Floor
          </button>
        </div>

        <div className="modalBody">
          {events.length === 0 ? (
            <div className="mutedText">No events match the selected time filter.</div>
          ) : (
            <div className="stack">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className="eventRow"
                  onClick={() => onViewEvent(ev.id)}
                >
                  <div className="eventRowMain">
                    <div className="eventRowTitle">{ev.title}</div>
                    <div className="eventRowMeta">
                      {ev.room} · {ev.attendanceCount}/{ev.capacity} attending
                    </div>
                  </div>
                  <div className="eventRowBadges">
                    {ev.foodAvailable ? <div className="badge">Food</div> : <div className="badge subtle">No food</div>}
                    {ev.friendsGoing.length > 0 ? <div className="badge">{ev.friendsGoing.length} friends</div> : null}
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

