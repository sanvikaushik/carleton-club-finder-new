import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUser, UserResponse } from "../api/client";

export type TabKey = "home" | "explore" | "clubs" | "schedule" | "friends" | "profile";
export type HomeTimeFilter = "now" | "next2h" | "today";
export type ExploreFilter = "now" | "upcoming" | "myclubs";

type AppStateContextValue = {
  user: UserResponse | null;
  userLoaded: boolean;

  selectedTab: TabKey;
  setSelectedTab: (tab: TabKey) => void;

  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;

  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;

  homeTimeFilter: HomeTimeFilter;
  setHomeTimeFilter: (f: HomeTimeFilter) => void;

  exploreFilter: ExploreFilter;
  setExploreFilter: (f: ExploreFilter) => void;

  scheduleConflictEnabled: boolean;
  setScheduleConflictEnabled: (v: boolean) => void;

  favoriteClubIds: Set<string>;
  toggleFavoriteClub: (clubId: string) => void;

  goingEventIds: Set<string>;
  toggleGoingEvent: (eventId: string) => void;

  isClubFavorite: (clubId: string) => boolean;
  isEventGoing: (eventId: string) => boolean;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

const LS_FAVORITES = "clubfinder:favorites";
const LS_GOING = "clubfinder:going";

function safeParseStringArray(v: string | null): string[] | null {
  if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export const AppStateProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);

  const [selectedTab, setSelectedTab] = useState<TabKey>("home");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [homeTimeFilter, setHomeTimeFilter] = useState<HomeTimeFilter>("now");
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>("now");
  const [scheduleConflictEnabled, setScheduleConflictEnabled] = useState<boolean>(false);

  const [favoriteClubIds, setFavoriteClubIds] = useState<Set<string>>(new Set());
  const [goingEventIds, setGoingEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const storedFavorites = safeParseStringArray(localStorage.getItem(LS_FAVORITES));
      const storedGoing = safeParseStringArray(localStorage.getItem(LS_GOING));

      const u = await getUser();
      if (cancelled) return;

      setUser(u);

      // Prefer local UI overrides if present; otherwise seed from backend user.
      const favs = storedFavorites ?? u.favoriteClubIds;
      const going = storedGoing ?? u.attendingEventIds;
      setFavoriteClubIds(new Set(favs));
      setGoingEventIds(new Set(going));

      setUserLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(favoriteClubIds)));
  }, [favoriteClubIds]);

  useEffect(() => {
    localStorage.setItem(LS_GOING, JSON.stringify(Array.from(goingEventIds)));
  }, [goingEventIds]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      user,
      userLoaded,

      selectedTab,
      setSelectedTab,

      selectedBuildingId,
      setSelectedBuildingId,

      selectedEventId,
      setSelectedEventId,

      homeTimeFilter,
      setHomeTimeFilter,

      exploreFilter,
      setExploreFilter,

      scheduleConflictEnabled,
      setScheduleConflictEnabled,

      favoriteClubIds,
      toggleFavoriteClub: (clubId) => {
        setFavoriteClubIds((prev) => {
          const next = new Set(prev);
          if (next.has(clubId)) next.delete(clubId);
          else next.add(clubId);
          return next;
        });
      },

      goingEventIds,
      toggleGoingEvent: (eventId) => {
        setGoingEventIds((prev) => {
          const next = new Set(prev);
          if (next.has(eventId)) next.delete(eventId);
          else next.add(eventId);
          return next;
        });
      },

      isClubFavorite: (clubId) => favoriteClubIds.has(clubId),
      isEventGoing: (eventId) => goingEventIds.has(eventId),
    }),
    [
      user,
      userLoaded,
      selectedTab,
      selectedBuildingId,
      selectedEventId,
      homeTimeFilter,
      exploreFilter,
      scheduleConflictEnabled,
      favoriteClubIds,
      goingEventIds,
    ],
  );

  return React.createElement(AppStateContext.Provider, { value }, children);
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

