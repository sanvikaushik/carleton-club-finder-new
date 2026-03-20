import React from "react";
import { Club, EventModel } from "../api/client";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ClubCard(props: {
  club: Club;
  favorite: boolean;
  onToggleFavorite: () => void;
  upcomingEvents: EventModel[];
  onOpenEvent: (eventId: string) => void;
}) {
  const { club, favorite, onToggleFavorite, upcomingEvents, onOpenEvent } = props;
  const nextEvent = upcomingEvents[0];

  return (
    <div className="clubCard" role="article" aria-label={`Club: ${club.name}`}>
      <div className="clubTopRow">
        <div className="clubName">{club.name}</div>
        <button type="button" className={`starBtn ${favorite ? "active" : ""}`} onClick={onToggleFavorite} aria-label="Favorite">
          {favorite ? "★" : "☆"}
        </button>
      </div>

      <div className="clubCategory">{club.category}</div>
      <div className="clubDesc">{club.description}</div>

      {nextEvent ? (
        <div className="clubNext">
          <div className="clubNextLabel">Next up</div>
          <button type="button" className="clubNextButton" onClick={() => onOpenEvent(nextEvent.id)}>
            <div className="clubNextTitle">{nextEvent.title}</div>
            <div className="clubNextMeta">
              🏫 {nextEvent.building} · {nextEvent.room} · {formatTime(nextEvent.startTime)}
            </div>
          </button>
        </div>
      ) : (
        <div className="clubNoUpcoming mutedText">No upcoming events found.</div>
      )}
    </div>
  );
}

