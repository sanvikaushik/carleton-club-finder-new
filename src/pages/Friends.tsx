import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptFriendRequest,
  acceptEventInvite,
  createConversation,
  declineEventInvite,
  declineFriendRequest,
  EventInvite,
  EventModel,
  Friend,
  FriendRequest,
  FriendSearchResult,
  FriendsEventsFeedItem,
  getEvents,
  getFriends,
  getFriendRequests,
  getMyEventInvites,
  getMyFriendsEvents,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "../api/client";
import { EventInvitesPanel } from "../components/EventInvitesPanel";
import { FriendList } from "../components/FriendList";
import { FriendRequestsPanel } from "../components/FriendRequestsPanel";
import { FriendSearchResults } from "../components/FriendSearchResults";
import { FriendsEventsFeed } from "../components/FriendsEventsFeed";
import { useAppState } from "../state/appState";

export const Friends: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshSessionState } = useAppState();

  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [friendsEvents, setFriendsEvents] = useState<FriendsEventsFeedItem[]>([]);
  const [friendsEventsLoading, setFriendsEventsLoading] = useState(false);
  const [eventInvites, setEventInvites] = useState<{ incoming: EventInvite[]; outgoing: EventInvite[]; history: EventInvite[] }>({
    incoming: [],
    outgoing: [],
    history: [],
  });
  const [eventInvitesLoading, setEventInvitesLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [actingEventInviteId, setActingEventInviteId] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);

  const loadBaseData = async () => {
    const [friendRows, eventRows] = await Promise.all([getFriends(), getEvents()]);
    setFriends(friendRows);
    setEvents(eventRows);
  };

  const loadSocialData = async (query: string) => {
    if (!isAuthenticated) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setFriendsEvents([]);
      setSearchResults([]);
      setEventInvites({ incoming: [], outgoing: [], history: [] });
      return;
    }

    setRequestsLoading(true);
    setFriendsEventsLoading(true);
    setEventInvitesLoading(true);
    try {
      const [requests, feed, results, invites] = await Promise.all([
        getFriendRequests(),
        getMyFriendsEvents(),
        searchUsers(query),
        getMyEventInvites(),
      ]);
      setIncomingRequests(requests.incoming);
      setOutgoingRequests(requests.outgoing);
      setFriendsEvents(feed);
      setSearchResults(results);
      setEventInvites(invites);
    } finally {
      setRequestsLoading(false);
      setFriendsEventsLoading(false);
      setEventInvitesLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        await loadBaseData();
        if (!cancelled) {
          await loadSocialData("");
        }
      } catch {
        if (!cancelled) {
          setStatusMessage({ type: "error", text: "Could not load the friends page." });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handle = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchUsers(searchValue);
        setSearchResults(results);
      } catch {
        setStatusMessage({ type: "error", text: "Could not search for students." });
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [isAuthenticated, searchValue]);

  const refreshAllSocial = async (query = searchValue) => {
    await Promise.all([loadBaseData(), loadSocialData(query)]);
  };

  const handlePrimarySearchAction = async (result: FriendSearchResult) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setActingUserId(result.id);
    setStatusMessage(null);
    try {
      if (result.status === "incoming_request" && result.requestId) {
        await acceptFriendRequest(result.requestId);
        setStatusMessage({ type: "success", text: `You and ${result.name} are now friends.` });
      } else if (result.status === "none") {
        await sendFriendRequest(result.id);
        setStatusMessage({ type: "success", text: `Friend request sent to ${result.name}.` });
      }
      await refreshAllSocial(searchValue);
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "That action could not be completed." });
    } finally {
      setActingUserId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setActingRequestId(requestId);
    setStatusMessage(null);
    try {
      await acceptFriendRequest(requestId);
      setStatusMessage({ type: "success", text: "Friend request accepted." });
      await refreshAllSocial(searchValue);
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "Could not accept the request." });
    } finally {
      setActingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setActingRequestId(requestId);
    setStatusMessage(null);
    try {
      await declineFriendRequest(requestId);
      setStatusMessage({ type: "success", text: "Friend request declined." });
      await refreshAllSocial(searchValue);
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "Could not decline the request." });
    } finally {
      setActingRequestId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setRemovingFriendId(friendId);
    setStatusMessage(null);
    try {
      await removeFriend(friendId);
      setStatusMessage({ type: "success", text: "Friend removed." });
      await refreshAllSocial(searchValue);
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "Could not remove that friend." });
    } finally {
      setRemovingFriendId(null);
    }
  };

  const handleAcceptEventInvite = async (inviteId: string) => {
    setActingEventInviteId(inviteId);
    setStatusMessage(null);
    try {
      await acceptEventInvite(inviteId);
      await refreshSessionState();
      await refreshAllSocial(searchValue);
      setStatusMessage({ type: "success", text: "Invite accepted. You are now marked as going." });
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "Could not accept the invite." });
    } finally {
      setActingEventInviteId(null);
    }
  };

  const handleDeclineEventInvite = async (inviteId: string) => {
    setActingEventInviteId(inviteId);
    setStatusMessage(null);
    try {
      await declineEventInvite(inviteId);
      await refreshAllSocial(searchValue);
      setStatusMessage({ type: "success", text: "Invite declined." });
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "Could not decline the invite." });
    } finally {
      setActingEventInviteId(null);
    }
  };

  const handleMessageFriend = async (friendId: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const conversation = await createConversation(friendId);
      navigate(`/messages/${encodeURIComponent(conversation.id)}`);
    } catch (error: any) {
      setStatusMessage({ type: "error", text: error?.response?.data?.error ?? "Could not open a conversation." });
    }
  };

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 className="pageTitle">Friends</h1>
          <div className="pageSubtitle">Find students, manage requests, and track which friends are heading to events.</div>
        </div>
        {isAuthenticated ? (
          <button type="button" className="headerActionBtn headerSecondaryBtn" onClick={() => navigate("/messages")}>
            Messages
          </button>
        ) : null}
      </div>

      {statusMessage ? <div className={`statusBanner ${statusMessage.type}`}>{statusMessage.text}</div> : null}

      {!isAuthenticated ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Sign in for social features</div>
          <div className="mutedText">Log in to search students, send friend requests, and see a personalized friends-going feed.</div>
          <button type="button" className="primaryBtn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      ) : (
        <>
          <div className="sectionBlock">
            <div className="sectionTitle">Find Friends</div>
            <input
              type="search"
              className="formInput"
              placeholder="Search by student name or Carleton email"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <div className="socialSectionLabel">{searchValue.trim() ? "Search results" : "Suggested students"}</div>
            <FriendSearchResults
              results={searchResults}
              loading={searchLoading}
              actionUserId={actingUserId}
              onPrimaryAction={handlePrimarySearchAction}
            />
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Requests</div>
            {requestsLoading ? (
              <div className="placeholderCard">Loading friend requests...</div>
            ) : (
              <FriendRequestsPanel
                incoming={incomingRequests}
                outgoing={outgoingRequests}
                actingRequestId={actingRequestId}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Event Invites & Plans</div>
            {eventInvitesLoading ? (
              <div className="placeholderCard">Loading event invites...</div>
            ) : (
              <EventInvitesPanel
                incoming={eventInvites.incoming}
                outgoing={eventInvites.outgoing}
                history={eventInvites.history}
                busyInviteId={actingEventInviteId}
                onAccept={handleAcceptEventInvite}
                onDecline={handleDeclineEventInvite}
                onOpenEvent={(eventId) => navigate(`/event/${encodeURIComponent(eventId)}`)}
              />
            )}
          </div>

          <div className="sectionBlock">
            <div className="sectionTitle">Friends at Upcoming Events</div>
            <FriendsEventsFeed
              items={friendsEvents}
              loading={friendsEventsLoading}
              onOpenEvent={(eventId) => navigate(`/event/${encodeURIComponent(eventId)}`)}
            />
          </div>
        </>
      )}

      <div className="sectionBlock">
        <div className="sectionTitle">{isAuthenticated ? "Your Friends" : "Campus Preview"}</div>
        {loading ? (
          <div className="placeholderCard">Loading friends...</div>
        ) : (
          <FriendList
            friends={friends}
            events={events}
            onOpenEvent={(eventId) => navigate(`/event/${encodeURIComponent(eventId)}`)}
            onMessageFriend={isAuthenticated ? handleMessageFriend : undefined}
            onRemoveFriend={isAuthenticated ? handleRemoveFriend : undefined}
            removingFriendId={removingFriendId}
            emptyMessage={isAuthenticated ? "No friends yet. Search above to start connecting." : "No friends available in the preview."}
          />
        )}
      </div>
    </div>
  );
};
