import React from "react";
import { Club, EventModel } from "../api/client";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ClubCard(props: {
  club: Club;
  favorite: boolean;
  onToggleFavorite: () => void;
  upcomingEvents: EventModel[];
  onOpenEvent: (eventId: string) => void;
  onOpenClub?: () => void;
  followLabel?: string;
}) {
  const { club, favorite, onToggleFavorite, upcomingEvents, onOpenEvent, onOpenClub, followLabel } = props;
  const nextEvent = upcomingEvents[0];
  const tags = [club.category, nextEvent?.happeningNow ? "Live" : null, (club.followerCount ?? 0) > 2 ? "Popular" : null].filter(Boolean);

  return (
    <div className="clubCard" role="article" aria-label={`Club: ${club.name}`}>
      <div className="clubVisualRow">
        <div className="clubAvatar">{initials(club.name)}</div>
        <div className="clubVisualText">
          <div className="clubName">{club.name}</div>
          <div className="clubCategory">{club.category} · {club.followerCount ?? 0} followers</div>
        </div>
        <button type="button" className={`followBtn ${favorite ? "active" : ""}`} onClick={onToggleFavorite} aria-label="Follow club">
          {followLabel ?? (favorite ? "Following" : "Follow")}
        </button>
      </div>

      <div className="tagRow compact">
        {tags.map((tag) => (
          <span key={tag} className="tag subtleTag">
            {tag}
          </span>
        ))}
      </div>

      <div className="clubDesc">{club.description}</div>

      <div className="clubCardFooter">
        {nextEvent ? (
          <div className="clubNext">
            <div className="clubNextLabel">Next up</div>
            <button type="button" className="clubNextButton" onClick={() => onOpenEvent(nextEvent.id)}>
              <div className="clubNextTitle">{nextEvent.title}</div>
              <div className="clubNextMeta">
                {nextEvent.building} · {nextEvent.room} · {formatTime(nextEvent.startTime)}
              </div>
            </button>
          </div>
        ) : (
          <div className="clubNoUpcoming mutedText">No upcoming events found.</div>
        )}

        {onOpenClub ? (
          <button type="button" className="secondaryBtn clubViewBtn" onClick={onOpenClub}>
            View Club
          </button>
        ) : null}
      </div>
    </div>
  );
}
