import React from "react";
import { Link } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { useAppState } from "../state/appState";

type TabKey = "home" | "explore" | "clubs" | "schedule" | "friends" | "profile";

const tabs: Array<{ key: TabKey; label: string; to: string; icon: string }> = [
  { key: "home", label: "Home", to: "/", icon: "🏫" },
  { key: "explore", label: "Explore", to: "/explore", icon: "🧭" },
  { key: "clubs", label: "Clubs", to: "/clubs", icon: "⭐" },
  { key: "schedule", label: "Schedule", to: "/schedule", icon: "🗓️" },
  { key: "friends", label: "Friends", to: "/friends", icon: "👥" },
  { key: "profile", label: "Profile", to: "/profile", icon: "⚙️" },
];

export const BottomTabBar: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { unreadNotificationCount, isAuthenticated } = useAppState();

  return (
    <nav className="bottomTabBar" aria-label="Bottom navigation">
      {tabs.map((t) => {
        const isActive = t.key === activeTab;
        return (
          <Link key={t.key} to={t.to} className={`tabItem ${isActive ? "active" : ""}`}>
            <div className="tabIcon" aria-hidden>
              {t.icon}
            </div>
            <div className="tabLabel">{t.label}</div>
          </Link>
        );
      })}
      <NotificationBell unreadCount={isAuthenticated ? unreadNotificationCount : 0} />
    </nav>
  );
};

