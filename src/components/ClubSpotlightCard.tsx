import React from "react";
import { Club } from "../api/client";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const ClubSpotlightCard: React.FC<{
  club: Club;
  reason?: string;
  onOpen: () => void;
}> = ({ club, reason, onOpen }) => {
  return (
    <button type="button" className="clubSpotlightCard" onClick={onOpen}>
      {club.imageUrl ? <img className="clubSpotlightAvatar image" src={club.imageUrl} alt="" /> : <div className="clubSpotlightAvatar">{initials(club.name)}</div>}
      <div className="clubSpotlightMain">
        <div className="clubSpotlightTitle">{club.name}</div>
        <div className="clubSpotlightMeta">
          {club.category} · {club.followerCount ?? 0} followers
        </div>
        {reason ? <div className="clubSpotlightReason">{reason}</div> : null}
      </div>
    </button>
  );
};
