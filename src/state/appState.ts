import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUser, setClubFavorite, setEventAttendance, UserResponse } from "../api/client";

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
      const u = await getUser();
      if (cancelled) return;

      setUser(u);
      setFavoriteClubIds(new Set(u.favoriteClubIds));
      setGoingEventIds(new Set(u.attendingEventIds));

      setUserLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const currentlyFavorite = favoriteClubIds.has(clubId);
        setFavoriteClubIds((prev) => {
          const next = new Set(prev);
          if (next.has(clubId)) next.delete(clubId);
          else next.add(clubId);
          return next;
        });
        if (!user) return;
        void setClubFavorite(clubId, !currentlyFavorite, user.id)
          .then((response) => {
            setFavoriteClubIds(new Set(response.favoriteClubIds));
          })
          .catch(() => {
            setFavoriteClubIds((prev) => {
              const next = new Set(prev);
              if (currentlyFavorite) next.add(clubId);
              else next.delete(clubId);
              return next;
            });
          });
      },

      goingEventIds,
      toggleGoingEvent: (eventId) => {
        const currentlyGoing = goingEventIds.has(eventId);
        setGoingEventIds((prev) => {
          const next = new Set(prev);
          if (next.has(eventId)) next.delete(eventId);
          else next.add(eventId);
          return next;
        });
        if (!user) return;
        void setEventAttendance(eventId, !currentlyGoing, user.id)
          .then((response) => {
            setGoingEventIds(new Set(response.attendingEventIds));
          })
          .catch(() => {
            setGoingEventIds((prev) => {
              const next = new Set(prev);
              if (currentlyGoing) next.add(eventId);
              else next.delete(eventId);
              return next;
            });
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

