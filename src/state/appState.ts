import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AuthUser,
  followClub,
  getAuthMe,
  getUser,
  logIn,
  logOut,
  LoginPayload,
  setClubFavorite,
  setEventAttendance,
  signUp,
  SignUpPayload,
  unfollowClub,
  UserResponse,
} from "../api/client";

export type TabKey = "home" | "explore" | "clubs" | "schedule" | "friends" | "profile";
export type HomeTimeFilter = "now" | "next2h" | "today";
export type ExploreFilter = "now" | "upcoming" | "myclubs";

type AppStateContextValue = {
  user: UserResponse | null;
  userLoaded: boolean;
  authUser: AuthUser | null;
  authLoaded: boolean;
  isAuthenticated: boolean;
  refreshSessionState: () => Promise<void>;
  signUpUser: (payload: SignUpPayload) => Promise<AuthUser>;
  logInUser: (payload: LoginPayload) => Promise<AuthUser>;
  logOutUser: () => Promise<void>;

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
  const [authLoaded, setAuthLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [selectedTab, setSelectedTab] = useState<TabKey>("home");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [homeTimeFilter, setHomeTimeFilter] = useState<HomeTimeFilter>("now");
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>("now");
  const [scheduleConflictEnabled, setScheduleConflictEnabled] = useState<boolean>(false);

  const [favoriteClubIds, setFavoriteClubIds] = useState<Set<string>>(new Set());
  const [goingEventIds, setGoingEventIds] = useState<Set<string>>(new Set());

  const refreshSessionState = async () => {
    const [sessionUser, profileUser] = await Promise.all([getAuthMe(), getUser()]);
    setAuthUser(sessionUser);
    setAuthLoaded(true);
    setUser(profileUser);
    setFavoriteClubIds(new Set(profileUser.favoriteClubIds));
    setGoingEventIds(new Set(profileUser.attendingEventIds));
    setUserLoaded(true);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sessionUser, profileUser] = await Promise.all([getAuthMe(), getUser()]);
        if (cancelled) return;
        setAuthUser(sessionUser);
        setAuthLoaded(true);
        setUser(profileUser);
        setFavoriteClubIds(new Set(profileUser.favoriteClubIds));
        setGoingEventIds(new Set(profileUser.attendingEventIds));
        setUserLoaded(true);
      } catch {
        if (cancelled) return;
        setAuthUser(null);
        setAuthLoaded(true);
        setUserLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      user,
      userLoaded,
      authUser,
      authLoaded,
      isAuthenticated: Boolean(authUser),
      refreshSessionState,
      signUpUser: async (payload) => {
        const signedUpUser = await signUp(payload);
        await refreshSessionState();
        return signedUpUser;
      },
      logInUser: async (payload) => {
        const loggedInUser = await logIn(payload);
        await refreshSessionState();
        return loggedInUser;
      },
      logOutUser: async () => {
        await logOut();
        await refreshSessionState();
      },

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

        const mutation = authUser
          ? currentlyFavorite
            ? unfollowClub(clubId)
            : followClub(clubId)
          : user
            ? setClubFavorite(clubId, !currentlyFavorite, user.id)
            : null;

        if (!mutation) return;

        void mutation
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
      authUser,
      authLoaded,
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
