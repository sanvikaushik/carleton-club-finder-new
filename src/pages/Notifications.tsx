import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, NotificationItem } from "../api/client";

function formatWhen(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const payload = await getNotifications();
        if (!cancelled) {
          setItems(payload);
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
  }, []);

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Notifications</div>
        <div />
      </div>

      {loading ? (
        <div className="placeholderCard">Loading notifications...</div>
      ) : items.length === 0 ? (
        <div className="placeholderCard">Nothing new right now. As friends join events and clubs, updates will show up here.</div>
      ) : (
        <div className="socialStack">
          {items.map((item) => (
            <div key={item.id} className="socialCard">
              <div className="socialCardTop">
                <div>
                  <div className="socialCardTitle">{item.title}</div>
                  <div className="socialCardMeta">{item.subtitle}</div>
                </div>
                <div className="socialBadge">{item.kind === "friend_activity" ? "Friends" : "For You"}</div>
              </div>
              <div className="socialSubMeta">{formatWhen(item.time)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
