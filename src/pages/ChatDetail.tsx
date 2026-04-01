import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChatMessage,
  ConversationSummary,
  getConversation,
  getConversationMessages,
  markConversationRead,
  sendConversationMessage,
} from "../api/client";
import { useAppState } from "../state/appState";

function formatMessageTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const ChatDetail: React.FC = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { authUser, isAuthenticated, refreshUnreadNotificationCount } = useAppState();

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pageError, setPageError] = useState("");

  const normalizedConversationId = conversationId ? decodeURIComponent(conversationId) : null;

  const loadConversation = async () => {
    if (!normalizedConversationId) return;
    const [conversationRow, messageRows] = await Promise.all([
      getConversation(normalizedConversationId),
      getConversationMessages(normalizedConversationId),
    ]);
    setConversation(conversationRow);
    setMessages(messageRows);
    await markConversationRead(normalizedConversationId);
    await refreshUnreadNotificationCount();
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isAuthenticated || !normalizedConversationId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setPageError("");
      try {
        const [conversationRow, messageRows] = await Promise.all([
          getConversation(normalizedConversationId),
          getConversationMessages(normalizedConversationId),
        ]);
        if (cancelled) return;
        setConversation(conversationRow);
        setMessages(messageRows);
        await markConversationRead(normalizedConversationId);
        await refreshUnreadNotificationCount();
      } catch (error: any) {
        if (!cancelled) {
          setPageError(error?.response?.data?.error ?? "Could not load this conversation.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, normalizedConversationId, refreshUnreadNotificationCount]);

  const handleSend = async () => {
    if (!normalizedConversationId || !messageBody.trim()) return;
    setSending(true);
    setPageError("");
    try {
      await sendConversationMessage(normalizedConversationId, messageBody);
      setMessageBody("");
      await loadConversation();
    } catch (error: any) {
      setPageError(error?.response?.data?.error ?? "Could not send that message.");
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => conversation?.otherParticipant?.name ?? "Conversation", [conversation]);

  return (
    <div className="page detailPage chatPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">{title}</div>
        <div />
      </div>

      {!isAuthenticated ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Sign in to open messages</div>
          <button type="button" className="primaryBtn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      ) : loading ? (
        <div className="placeholderCard">Loading conversation...</div>
      ) : pageError ? (
        <div className="statusBanner error">{pageError}</div>
      ) : (
        <>
          {conversation?.canSendMessages === false && conversation.messageRestriction ? (
            <div className="statusBanner error">{conversation.messageRestriction}</div>
          ) : null}
          <div className="chatThread">
            {messages.length === 0 ? (
              <div className="placeholderCard">No messages yet. Start making a plan.</div>
            ) : (
              messages.map((message) => {
                const mine = message.senderUserId === authUser?.id;
                return (
                  <div key={message.id} className={`chatBubble ${mine ? "mine" : "theirs"}`}>
                    <div className="chatBubbleBody">{message.body}</div>
                    <div className="chatBubbleMeta">{mine ? "You" : message.sender?.name ?? "Friend"} · {formatMessageTime(message.createdAt)}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="chatComposer">
            <textarea
              className="formInput chatComposerInput"
              placeholder={conversation?.canSendMessages === false ? "Messaging unavailable" : "Send a message"}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              maxLength={1000}
              disabled={conversation?.canSendMessages === false}
            />
            <button
              type="button"
              className="primaryBtn chatSendBtn"
              onClick={() => void handleSend()}
              disabled={sending || !messageBody.trim() || conversation?.canSendMessages === false}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
