import React from "react";
import { Link } from "react-router-dom";

export const NotificationBell: React.FC<{
  unreadCount: number;
  active?: boolean;
}> = ({ unreadCount, active = false }) => {
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Link to="/notifications" className={`tabItem notificationBell ${active ? "active" : ""}`} aria-label="Notifications">
      <div className="tabIcon notificationBellIcon" aria-hidden>
        Bell
      </div>
      {unreadCount > 0 ? <span className="notificationBellBadge">{displayCount}</span> : null}
      <div className="tabLabel">Alerts</div>
    </Link>
  );
};
