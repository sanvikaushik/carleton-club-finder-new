import React from "react";
import { FriendRequest } from "../api/client";

function formatWhen(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function FriendRequestsPanel(props: {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  actingRequestId: string | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}) {
  const { incoming, outgoing, actingRequestId, onAccept, onDecline } = props;

  if (incoming.length === 0 && outgoing.length === 0) {
    return <div className="placeholderCard">No pending friend requests.</div>;
  }

  return (
    <div className="socialStack">
      {incoming.map((request) => (
        <div key={request.id} className="socialCard">
          <div className="socialCardTop">
            <div>
              <div className="socialCardTitle">{request.user?.name ?? "Student"}</div>
              <div className="socialCardMeta">
                Wants to connect {request.user?.program ? `· ${request.user.program}` : ""} · {formatWhen(request.createdAt)}
              </div>
            </div>
            <div className="socialActionRow">
              <button
                type="button"
                className="secondaryBtn socialActionBtn"
                onClick={() => onDecline(request.id)}
                disabled={actingRequestId === request.id}
              >
                Decline
              </button>
              <button
                type="button"
                className="primaryBtn socialPrimaryBtn"
                onClick={() => onAccept(request.id)}
                disabled={actingRequestId === request.id}
              >
                {actingRequestId === request.id ? "Saving..." : "Accept"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {outgoing.map((request) => (
        <div key={request.id} className="socialCard">
          <div className="socialCardTop">
            <div>
              <div className="socialCardTitle">{request.user?.name ?? "Student"}</div>
              <div className="socialCardMeta">Request sent · {formatWhen(request.createdAt)}</div>
            </div>
            <div className="socialBadge">Requested</div>
          </div>
        </div>
      ))}
    </div>
  );
}
