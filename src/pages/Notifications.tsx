import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dismissNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem as NotificationItemModel,
} from "../api/client";
import { NotificationItem } from "../components/NotificationItem";
import { useAppState } from "../state/appState";

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setUnreadNotificationCount } = useAppState();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItemModel[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const payload = await getNotifications();
      setItems(payload);
    } catch (error: any) {
      setPageError(error?.response?.data?.error ?? "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setItems([]);
      return;
    }
    void loadNotifications();
  }, [isAuthenticated]);

  const handleMarkRead = async (item: NotificationItemModel) => {
    if (item.isRead) return;
    setBusyAction(`read:${item.id}`);
    try {
      const response = await markNotificationRead(item.id);
      setItems((prev) => prev.map((current) => (current.id === item.id ? response.notification : current)));
      setUnreadNotificationCount(response.unreadCount);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDismiss = async (item: NotificationItemModel) => {
    setBusyAction(`dismiss:${item.id}`);
    try {
      const response = await dismissNotification(item.id);
      setItems((prev) => prev.filter((current) => current.id !== item.id));
      setUnreadNotificationCount(response.unreadCount);
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpen = async (item: NotificationItemModel) => {
    if (!item.isRead) {
      await handleMarkRead(item);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleReadAll = async () => {
    setBusyAction("read-all");
    try {
      const response = await markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadNotificationCount(response.unreadCount);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Notifications</div>
        <div />
      </div>

      {!isAuthenticated ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Sign in to see notifications</div>
          <div className="mutedText">Notifications are tied to your account. Log in to view unread alerts and friend activity.</div>
          <button type="button" className="primaryBtn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      ) : loading ? (
        <div className="placeholderCard">Loading notifications...</div>
      ) : pageError ? (
        <div className="statusBanner error">{pageError}</div>
      ) : items.length === 0 ? (
        <div className="placeholderCard">No notifications yet.</div>
      ) : (
        <>
          <div className="notificationToolbar">
            <div className="pageSubtitle">Newest first. Read items fade back, dismissed items disappear.</div>
            <button
              type="button"
              className="secondaryBtn notificationToolbarBtn"
              onClick={() => void handleReadAll()}
              disabled={busyAction === "read-all"}
            >
              {busyAction === "read-all" ? "Saving..." : "Mark All Read"}
            </button>
          </div>
          <div className="notificationList">
            {items.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                busyAction={busyAction}
                onOpen={(current) => void handleOpen(current)}
                onMarkRead={(current) => void handleMarkRead(current)}
                onDismiss={(current) => void handleDismiss(current)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
