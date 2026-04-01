import React from "react";
import { NotificationItem as NotificationItemModel } from "../api/client";

function formatWhen(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function labelForType(type: string) {
  if (type === "friend_request") return "Friend Request";
  if (type === "friend_accept") return "Friend Update";
  if (type === "club_event") return "Club Event";
  if (type === "friend_activity") return "Friend Activity";
  return "Notification";
}

export const NotificationItem: React.FC<{
  item: NotificationItemModel;
  busyAction: string | null;
  onOpen: (item: NotificationItemModel) => void;
  onMarkRead: (item: NotificationItemModel) => void;
  onDismiss: (item: NotificationItemModel) => void;
}> = ({ item, busyAction, onOpen, onMarkRead, onDismiss }) => {
  return (
    <div className={`notificationCard ${item.isRead ? "read" : "unread"}`}>
      <button type="button" className="notificationMain" onClick={() => onOpen(item)}>
        <div className="notificationTop">
          <div className="notificationType">{labelForType(item.type)}</div>
          {!item.isRead ? <div className="notificationUnreadDot" aria-hidden /> : null}
        </div>
        <div className="notificationTitle">{item.title}</div>
        <div className="notificationMessage">{item.message}</div>
        <div className="notificationMeta">{formatWhen(item.createdAt)}</div>
      </button>

      <div className="notificationActions">
        {!item.isRead ? (
          <button
            type="button"
            className="secondaryBtn notificationActionBtn"
            onClick={() => onMarkRead(item)}
            disabled={busyAction === `read:${item.id}`}
          >
            {busyAction === `read:${item.id}` ? "Saving..." : "Mark Read"}
          </button>
        ) : null}
        <button
          type="button"
          className="secondaryBtn notificationActionBtn"
          onClick={() => onDismiss(item)}
          disabled={busyAction === `dismiss:${item.id}`}
        >
          {busyAction === `dismiss:${item.id}` ? "Saving..." : "Dismiss"}
        </button>
      </div>
    </div>
  );
};
