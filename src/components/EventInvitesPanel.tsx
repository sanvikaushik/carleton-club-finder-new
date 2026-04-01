import React from "react";
import { EventInvite } from "../api/client";

function formatInviteTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

type Props = {
  incoming: EventInvite[];
  outgoing: EventInvite[];
  history: EventInvite[];
  busyInviteId: string | null;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  onOpenEvent: (eventId: string) => void;
};

export const EventInvitesPanel: React.FC<Props> = ({ incoming, outgoing, history, busyInviteId, onAccept, onDecline, onOpenEvent }) => {
  if (incoming.length === 0 && outgoing.length === 0 && history.length === 0) {
    return <div className="placeholderCard">No event invites yet.</div>;
  }

  return (
    <div className="socialStack">
      {incoming.map((invite) => (
        <div key={invite.id} className="socialCard">
          <div className="socialCardTop">
            <div>
              <button type="button" className="textActionBtn socialCardTitleBtn" onClick={() => onOpenEvent(invite.eventId)}>
                {invite.event.title}
              </button>
              <div className="socialCardMeta">
                {invite.sender?.name ?? "A friend"} invited you · {formatInviteTime(invite.createdAt)}
              </div>
              {invite.message ? <div className="socialSubMeta">“{invite.message}”</div> : null}
            </div>
            <div className="socialActionRow">
              <button
                type="button"
                className="secondaryBtn socialActionBtn"
                onClick={() => onDecline(invite.id)}
                disabled={busyInviteId === invite.id}
              >
                Decline
              </button>
              <button
                type="button"
                className="primaryBtn socialPrimaryBtn"
                onClick={() => onAccept(invite.id)}
                disabled={busyInviteId === invite.id}
              >
                {busyInviteId === invite.id ? "Saving..." : "Accept"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {outgoing.map((invite) => (
        <div key={invite.id} className="socialCard">
          <div className="socialCardTop">
            <div>
              <button type="button" className="textActionBtn socialCardTitleBtn" onClick={() => onOpenEvent(invite.eventId)}>
                {invite.event.title}
              </button>
              <div className="socialCardMeta">Invite sent to {invite.recipient?.name ?? "friend"} · {formatInviteTime(invite.createdAt)}</div>
              {invite.message ? <div className="socialSubMeta">Plan note: {invite.message}</div> : null}
            </div>
            <div className="socialBadge">Pending</div>
          </div>
        </div>
      ))}

      {history.slice(0, 6).map((invite) => (
        <div key={invite.id} className="socialCard">
          <div className="socialCardTop">
            <div>
              <button type="button" className="textActionBtn socialCardTitleBtn" onClick={() => onOpenEvent(invite.eventId)}>
                {invite.event.title}
              </button>
              <div className="socialCardMeta">
                {invite.status === "accepted"
                  ? `${invite.senderUserId === invite.recipient?.id ? invite.sender?.name : invite.recipient?.name ?? "Friend"} is going with you`
                  : `${invite.sender?.name ?? invite.recipient?.name ?? "Invite"} declined`}
              </div>
            </div>
            <div className={`socialBadge ${invite.status === "accepted" ? "" : "subtle"}`}>
              {invite.status === "accepted" ? "Accepted" : "Declined"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
