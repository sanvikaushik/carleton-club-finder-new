import React from "react";
import { FriendSearchResult } from "../api/client";

function renderActionLabel(result: FriendSearchResult) {
  if (result.status === "friends") return "Friends";
  if (result.status === "requested") return "Requested";
  if (result.status === "incoming_request") return "Accept";
  return "Add Friend";
}

export function FriendSearchResults(props: {
  results: FriendSearchResult[];
  loading: boolean;
  actionUserId: string | null;
  onPrimaryAction: (result: FriendSearchResult) => void;
}) {
  const { results, loading, actionUserId, onPrimaryAction } = props;

  if (loading) {
    return <div className="placeholderCard">Searching students...</div>;
  }

  if (results.length === 0) {
    return <div className="placeholderCard">No students matched your search.</div>;
  }

  return (
    <div className="socialStack">
      {results.map((result) => {
        const requestBlocked = result.status === "none" && result.canReceiveFriendRequests === false;
        const disabled = result.status === "friends" || result.status === "requested" || requestBlocked;
        return (
          <div key={result.id} className="socialCard">
            <div className="socialCardTop">
              <div>
                <div className="socialCardTitle">{result.name}</div>
                <div className="socialCardMeta">
                  {[result.email, result.program, result.year].filter(Boolean).join(" | ") || "Carleton student"}
                </div>
                <div className="socialSubMeta">
                  {result.sharedClubCount > 0 ? `${result.sharedClubCount} shared clubs` : "No shared clubs yet"}
                  {result.mutualFriendsCount > 0 ? ` | ${result.mutualFriendsCount} mutual friends` : ""}
                </div>
                {requestBlocked ? <div className="socialSubMeta">This student is not accepting friend requests.</div> : null}
                {result.privacyNote && result.isProfileRestricted ? <div className="socialSubMeta">{result.privacyNote}</div> : null}
              </div>
              <button
                type="button"
                className={`followBtn ${result.status === "friends" ? "active" : ""}`}
                onClick={() => onPrimaryAction(result)}
                disabled={disabled || actionUserId === result.id}
              >
                {actionUserId === result.id ? "Saving..." : requestBlocked ? "Unavailable" : renderActionLabel(result)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
