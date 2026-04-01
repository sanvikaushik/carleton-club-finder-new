import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { AttendanceMeter } from "../components/AttendanceMeter";
import { InviteFriendsSheet } from "../components/InviteFriendsSheet";
import {
  acceptEventInvite,
  cancelClubEvent,
  Club,
  declineEventInvite,
  EventInviteSummary,
  EventModel,
  Friend,
  getClubs,
  getEvent,
  getEventFriendsGoing,
  getEventInvites,
  getFriends,
  sendEventInvite,
  SocialUser,
} from "../api/client";
import { useAppState } from "../state/appState";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} | ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const REACTION_OPTIONS = ["🔥", "🎉", "🧠"];

export const EventDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authUser, toggleGoingEvent, isEventGoing, isAuthenticated, refreshSessionState } = useAppState();

  const eventId = id ? decodeURIComponent(id) : null;
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [eventFriends, setEventFriends] = useState<Friend[] | null>(null);
  const [inviteSummary, setInviteSummary] = useState<EventInviteSummary | null>(null);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"cancel" | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!eventId) return;
      setLoading(true);
      try {
        const [eventRow, clubRows, friendRows, friendsGoingPayload] = await Promise.all([
          getEvent(eventId),
          getClubs(),
          getFriends(),
          isAuthenticated ? getEventFriendsGoing(eventId) : Promise.resolve(null),
        ]);
        const eventInvitesPayload = isAuthenticated ? await getEventInvites(eventId) : null;
        if (cancelled) return;
        setEvent(eventRow);
        setClubs(clubRows);
        setFriends(friendRows);
        setEventFriends(friendsGoingPayload?.friends ?? null);
        setInviteSummary(eventInvitesPayload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, isAuthenticated]);

  useEffect(() => {
    if (!eventId) return;
    const saved = window.localStorage.getItem(`event-reaction:${eventId}`);
    setReaction(saved);
  }, [eventId]);

  const clubName = useMemo(() => {
    if (!event) return "";
    return clubs.find((club) => club.id === event.clubId)?.name ?? "Club";
  }, [clubs, event]);

  const friendsGoing = useMemo(() => {
    if (eventFriends) return eventFriends;
    if (!event) return [];
    const byId = new Map(friends.map((friend) => [friend.id, friend] as const));
    return event.friendsGoing.map((friendId) => byId.get(friendId)).filter(Boolean) as Friend[];
  }, [event, eventFriends, friends]);

  const acceptedPartners = useMemo(() => {
    if (!inviteSummary || !authUser) return [];
    const partnerMap = new Map<string, SocialUser>();
    inviteSummary.accepted.forEach((invite) => {
      const partner = invite.senderUserId === authUser.id ? invite.recipient : invite.sender;
      if (partner?.id) {
        partnerMap.set(partner.id, partner);
      }
    });
    return [...partnerMap.values()];
  }, [authUser, inviteSummary]);

  const handleCancelEvent = async () => {
    if (!eventId || !event) return;
    if (!window.confirm("Cancel this event? Attendees will keep their history and receive a notification.")) {
      return;
    }
    setBusyAction("cancel");
    setActionError("");
    try {
      const cancelled = await cancelClubEvent(eventId);
      setEvent(cancelled);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        setActionError(error.response?.data?.error ?? "Could not cancel this event.");
      } else {
        setActionError("Could not cancel this event.");
      }
    } finally {
      setBusyAction(null);
    }
  };

  const refreshSocial = async () => {
    if (!eventId) return;
    const [eventRow, friendsGoingPayload, eventInvitesPayload] = await Promise.all([
      getEvent(eventId),
      isAuthenticated ? getEventFriendsGoing(eventId) : Promise.resolve(null),
      isAuthenticated ? getEventInvites(eventId) : Promise.resolve(null),
    ]);
    setEvent(eventRow);
    setEventFriends(friendsGoingPayload?.friends ?? null);
    setInviteSummary(eventInvitesPayload);
  };

  const handleSendInvites = async (friendIds: string[], message: string) => {
    if (!eventId) return;
    setInviteBusy(true);
    setActionError("");
    setStatusMessage("");
    try {
      await Promise.all(friendIds.map((friendId) => sendEventInvite(eventId, friendId, message)));
      await refreshSocial();
      setInviteSheetOpen(false);
      setStatusMessage(`Invite${friendIds.length > 1 ? "s" : ""} sent.`);
    } catch (error: any) {
      setActionError(error?.response?.data?.error ?? "Could not send invites.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    setActingInviteId(inviteId);
    setActionError("");
    setStatusMessage("");
    try {
      if (accept) {
        await acceptEventInvite(inviteId);
        await refreshSessionState();
      } else {
        await declineEventInvite(inviteId);
      }
      await refreshSocial();
      setStatusMessage(accept ? "Invite accepted. You're now going." : "Invite declined.");
    } catch (error: any) {
      setActionError(error?.response?.data?.error ?? "Could not update the invite.");
    } finally {
      setActingInviteId(null);
    }
  };

  if (!eventId) {
    return null;
  }

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Event</div>
        <div />
      </div>

      {loading || !event ? (
        <div className="placeholderCard">Loading event...</div>
      ) : (
        <>
          {event.imageUrl ? (
            <img className={`detailBannerImage ${event.happeningNow ? "live" : ""}`} src={event.imageUrl} alt="" />
          ) : (
            <div className={`detailBanner enriched ${event.happeningNow ? "live" : ""}`} aria-hidden />
          )}

          {event.isCancelled ? <div className="statusBanner error">This event has been cancelled.</div> : null}
          {actionError ? <div className="statusBanner error">{actionError}</div> : null}
          {statusMessage ? <div className="statusBanner success">{statusMessage}</div> : null}

          <div className="detailTitleRow">
            <div>
              <div className="detailTitle">{event.title}</div>
              <div className="detailClub">{clubName}</div>
            </div>
            <div className="eventBadgeRow">
              {event.happeningNow ? <div className="liveBadge">Happening Now</div> : null}
              {event.isCancelled ? <div className="eventBadge">Cancelled</div> : null}
            </div>
          </div>

          <div className="tagRow">
            {event.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>

          <div className="detailMetaGrid">
            <div className="detailMetaCard">
              <div className="detailMetaLabel">When</div>
              <div className="detailMetaValue">{formatDateTime(event.startTime)}</div>
              <div className="detailMetaSmall">Ends {formatDateTime(event.endTime)}</div>
            </div>
            <div className="detailMetaCard">
              <div className="detailMetaLabel">Where</div>
              <div className="detailMetaValue">{event.building}</div>
              <div className="detailMetaSmall">
                Floor {event.floor} | {event.room}
              </div>
            </div>
            <div className="detailMetaCard">
              <div className="detailMetaLabel">Crowd</div>
              <div className="detailMetaValue">{event.attendanceCount}/{event.capacity}</div>
              <div className="detailMetaSmall">{friendsGoing.length} friends spotted</div>
            </div>
          </div>

          {event.canManage ? (
            <div className="organizerActionRow">
              <button type="button" className="secondaryBtn organizerActionBtn" onClick={() => navigate(`/events/${encodeURIComponent(event.id)}/edit`)}>
                Edit Event
              </button>
              {!event.isCancelled ? (
                <button type="button" className="secondaryBtn organizerDangerBtn" onClick={() => void handleCancelEvent()} disabled={busyAction === "cancel"}>
                  {busyAction === "cancel" ? "Cancelling..." : "Cancel Event"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="detailSection">
            <div className="detailSectionTitle">Campus energy</div>
            <AttendanceMeter
              eventId={event.id}
              attendanceCount={event.attendanceCount}
              capacity={event.capacity}
              startTime={event.startTime}
              endTime={event.endTime}
            />
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">About</div>
            <div className="detailDesc">{event.description}</div>
          </div>

          <div className="detailSection">
            <div className="detailSectionTitle">Friends attending</div>
            {friendsGoing.length === 0 ? (
              <div className="mutedText">No visible friends going yet.</div>
            ) : (
              <>
                <div className="friendChipRow">
                  {friendsGoing.map((friend) => (
                    <div key={friend.id} className="friendChip sm" style={{ background: friend.avatarColor ?? "rgba(255,255,255,0.2)" }} title={friend.name}>
                      {initials(friend.name)}
                    </div>
                  ))}
                </div>
                <div className="friendNamesLine detailFriendNames">{friendsGoing.map((friend) => friend.name).join(", ")}</div>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="detailSection">
              <div className="detailSectionHeader">
                <div className="detailSectionTitle">Go with friends</div>
                {!event.isCancelled ? (
                  <button
                    type="button"
                    className="secondaryBtn organizerActionBtn"
                    onClick={() => setInviteSheetOpen(true)}
                    disabled={(inviteSummary?.invitableFriends.length ?? 0) === 0}
                  >
                    Invite Friends
                  </button>
                ) : null}
              </div>

              {acceptedPartners.length > 0 ? (
                <>
                  <div className="friendChipRow">
                    {acceptedPartners.map((partner) => (
                      <div key={partner.id} className="friendChip" style={{ background: partner.avatarColor ?? "rgba(255,255,255,0.18)" }} title={partner.name}>
                        {initials(partner.name)}
                      </div>
                    ))}
                  </div>
                  <div className="friendNamesLine detailFriendNames">{acceptedPartners.map((partner) => partner.name).join(", ")}</div>
                </>
              ) : (
                <div className="mutedText">No shared plans yet for this event.</div>
              )}

              {inviteSummary && inviteSummary.invitableFriends.length === 0 ? (
                <div className="mutedText socialRestrictionNote">No friends are currently available for invites on this event.</div>
              ) : null}

              {inviteSummary && inviteSummary.incoming.length > 0 ? (
                <div className="socialStack eventInviteStack">
                  {inviteSummary.incoming.map((invite) => (
                    <div key={invite.id} className="socialCard">
                      <div className="socialCardTop">
                        <div>
                          <div className="socialCardTitle">{invite.sender?.name ?? "A friend"} invited you</div>
                          <div className="socialCardMeta">{invite.message || "Accept to automatically mark yourself as going."}</div>
                        </div>
                        <div className="socialActionRow">
                          <button
                            type="button"
                            className="secondaryBtn socialActionBtn"
                            onClick={() => void handleInviteResponse(invite.id, false)}
                            disabled={actingInviteId === invite.id}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            className="primaryBtn socialPrimaryBtn"
                            onClick={() => void handleInviteResponse(invite.id, true)}
                            disabled={actingInviteId === invite.id}
                          >
                            {actingInviteId === invite.id ? "Saving..." : "Accept"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {inviteSummary && inviteSummary.outgoing.length > 0 ? (
                <div className="inviteMetaList">
                  {inviteSummary.outgoing.map((invite) => (
                    <div key={invite.id} className="inviteMetaRow">
                      Waiting on {invite.recipient?.name ?? "friend"} to respond
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="detailSection">
            <div className="detailSectionTitle">Quick reactions</div>
            <div className="reactionRow">
              {REACTION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`reactionChip ${reaction === option ? "active" : ""}`}
                  onClick={() => {
                    setReaction(option);
                    window.localStorage.setItem(`event-reaction:${event.id}`, option);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {!event.isCancelled ? (
            <button type="button" className={`joinBtn ${isEventGoing(event.id) ? "active" : ""}`} onClick={() => toggleGoingEvent(event.id)}>
              {isEventGoing(event.id) ? "Leave Event" : "Join Event"}
            </button>
          ) : null}

          <div className="bottomSpace" />
          <InviteFriendsSheet
            open={inviteSheetOpen}
            friends={inviteSummary?.invitableFriends ?? []}
            busy={inviteBusy}
            onClose={() => setInviteSheetOpen(false)}
            onSubmit={handleSendInvites}
          />
        </>
      )}
    </div>
  );
};
