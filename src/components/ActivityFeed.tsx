import React from "react";
import { ActivityFeedItem } from "../api/client";

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const diffHours = Math.max(0, Math.round((then - Date.now()) / 3600000));
  if (diffHours === 0) return "Soon";
  if (diffHours === 1) return "In 1 hour";
  return `In ${diffHours} hours`;
}

export const ActivityFeed: React.FC<{
  items: ActivityFeedItem[];
  onOpenEvent?: (eventId: string) => void;
  onOpenClub?: (clubId: string) => void;
}> = ({ items, onOpenEvent, onOpenClub }) => {
  if (items.length === 0) {
    return <div className="placeholderCard">Activity will show up here once your friends start joining events and clubs.</div>;
  }

  return (
    <div className="activityFeed">
      {items.map((item) => {
        const targetEventId = item.payload.eventId;
        const targetClubId = item.payload.clubId;
        const canOpen = (targetEventId && onOpenEvent) || (targetClubId && onOpenClub);
        return (
          <button
            key={item.id}
            type="button"
            className={`activityRow ${canOpen ? "interactive" : ""}`}
            onClick={() => {
              if (targetEventId && onOpenEvent) onOpenEvent(targetEventId);
              if (!targetEventId && targetClubId && onOpenClub) onOpenClub(targetClubId);
            }}
            disabled={!canOpen}
          >
            <div className={`activityIcon ${item.kind}`}>{item.kind === "event_join" ? "Live" : "Club"}</div>
            <div className="activityMain">
              <div className="activityText">{item.text}</div>
              <div className="activityMeta">{formatRelative(item.time)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
