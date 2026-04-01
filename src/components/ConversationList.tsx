import React from "react";
import { ConversationSummary } from "../api/client";

function formatConversationTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type Props = {
  conversations: ConversationSummary[];
  loading: boolean;
  onOpenConversation: (conversationId: string) => void;
};

export const ConversationList: React.FC<Props> = ({ conversations, loading, onOpenConversation }) => {
  if (loading) {
    return <div className="placeholderCard">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return <div className="placeholderCard">No conversations yet. Message a friend to start chatting.</div>;
  }

  return (
    <div className="conversationList">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          className={`conversationRow ${conversation.unreadCount > 0 ? "unread" : ""}`}
          onClick={() => onOpenConversation(conversation.id)}
        >
          <div className="conversationMain">
            <div className="conversationTop">
              <div className="conversationName">{conversation.otherParticipant?.name ?? "Conversation"}</div>
              <div className="conversationTime">{formatConversationTime(conversation.lastMessageTime)}</div>
            </div>
            <div className="conversationPreview">{conversation.lastMessagePreview || "Start making a plan."}</div>
            {conversation.canSendMessages === false && conversation.messageRestriction ? (
              <div className="socialSubMeta">{conversation.messageRestriction}</div>
            ) : null}
          </div>
          {conversation.unreadCount > 0 ? <div className="conversationUnread">{conversation.unreadCount}</div> : null}
        </button>
      ))}
    </div>
  );
};
