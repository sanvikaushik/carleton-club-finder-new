import axios from "axios";

export type Building = {
  id: string;
  name: string;
  mapPosition?: { x: number; y: number };
  floors: number[];
};

export type Club = {
  id: string;
  name: string;
  category: string;
  description: string;
  favorite: boolean;
  meetingLocation?: string;
  contactEmail?: string;
  socialLink?: string;
  imageUrl?: string;
  followerCount?: number;
};

export type CreateClubPayload = {
  name: string;
  category: string;
  description: string;
  meetingLocation: string;
  contactEmail: string;
  socialLink: string;
  imageUrl: string;
};

export type ApiErrorPayload = {
  error?: string;
  details?: string;
  fieldErrors?: Partial<Record<keyof CreateClubPayload, string>>;
};

export type AuthFieldErrors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword" | "program" | "year", string>>;

export type AuthUser = {
  id: string;
  name: string;
  email?: string | null;
  program?: string | null;
  year?: string | null;
  favoriteClubIds: string[];
  attendingEventIds: string[];
};

export type SignUpPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  program: string;
  year: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type Friend = {
  id: string;
  name: string;
  email?: string | null;
  program?: string | null;
  year?: string | null;
  avatarColor?: string;
  attendingEventIds: string[];
  sharedClubCount: number;
  mutualFriendsCount: number;
};

export type FriendSearchResult = Friend & {
  status: "none" | "friends" | "requested" | "incoming_request";
  requestId?: string | null;
};

export type FriendRequest = {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  direction: "incoming" | "outgoing";
  user: Friend | null;
};

export type FriendsEventsFeedItem = {
  eventId: string;
  title: string;
  clubId: string;
  clubName: string;
  building: string;
  floor: number;
  room: string;
  startTime: string;
  endTime: string;
  friendCount: number;
  friends: Friend[];
};

export type EventFriendsGoingResponse = {
  eventId: string;
  count: number;
  currentUserGoing: boolean;
  friends: Friend[];
};

export type EventModel = {
  id: string;
  title: string;
  clubId: string;
  building: string;
  floor: number;
  room: string;
  startTime: string; // ISO
  endTime: string; // ISO
  attendanceCount: number;
  capacity: number;
  foodAvailable: boolean;
  foodType?: string | null;
  description: string;
  tags: string[];
  friendsGoing: string[];
  friendCount?: number;
  happeningNow?: boolean;
};

export type ActivityFeedItem = {
  id: string;
  kind: "event_join" | "club_follow";
  actorName: string;
  text: string;
  time: string;
  payload: Record<string, string>;
};

export type NotificationItem = {
  id: string;
  kind: "event_recommendation" | "friend_activity";
  title: string;
  subtitle: string;
  time: string;
};

export type DiscoveryPayload = {
  forYouEvents: EventModel[];
  trendingEvents: EventModel[];
  recommendedClubs: Club[];
  suggestedFriends: FriendSearchResult[];
  activityFeed: ActivityFeedItem[];
  notifications: NotificationItem[];
  interests: string[];
};

export type ClubDetailPayload = {
  club: Club;
  upcomingEvents: EventModel[];
  tags: string[];
  relatedClubs: Club[];
  friendFollowerCount: number;
};

export type ScheduleClass = {
  id: string;
  title: string;
  dayOfWeek: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  location: string;
};

export type ScheduleResponse = {
  weekStart: string; // YYYY-MM-DD
  classes: ScheduleClass[];
};

export type UserResponse = {
  id: string;
  name: string;
  program: string;
  email?: string | null;
  year?: string | null;
  favoriteClubIds: string[];
  attendingEventIds: string[];
};

const api = axios.create({
  baseURL: "/api",
  timeout: 8000,
});

export async function getEvents(): Promise<EventModel[]> {
  const res = await api.get("/events");
  return res.data;
}

export async function getFilteredEvents(params: {
  filter?: "now" | "upcoming" | "today" | "myclubs";
  userId?: string;
  scheduleConflicts?: boolean;
  buildingId?: string;
  clubId?: string;
}): Promise<EventModel[]> {
  const res = await api.get("/events", {
    params: {
      filter: params.filter,
      user_id: params.userId,
      schedule_conflicts: params.scheduleConflicts ? "true" : undefined,
      building_id: params.buildingId,
      club_id: params.clubId,
    },
  });
  return res.data;
}

export async function getEvent(id: string): Promise<EventModel> {
  const res = await api.get(`/events/${encodeURIComponent(id)}`);
  return res.data;
}

export async function getClubs(): Promise<Club[]> {
  const res = await api.get("/clubs");
  return res.data;
}

export async function getClubDetail(clubId: string): Promise<ClubDetailPayload> {
  const res = await api.get(`/clubs/${encodeURIComponent(clubId)}/detail`);
  return res.data;
}

export async function createClub(payload: CreateClubPayload): Promise<Club> {
  const res = await api.post("/clubs", payload);
  return res.data;
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
  const res = await api.post("/auth/signup", payload);
  return res.data;
}

export async function logIn(payload: LoginPayload): Promise<AuthUser> {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function logOut(): Promise<{ ok: boolean }> {
  const res = await api.post("/auth/logout");
  return res.data;
}

export async function getAuthMe(): Promise<AuthUser | null> {
  const res = await api.get("/auth/me");
  return res.data.user;
}

export async function setClubFavorite(clubId: string, favorite: boolean, userId = "u1"): Promise<{
  clubId: string;
  favorite: boolean;
  favoriteClubIds: string[];
}> {
  const res = await api.put(`/clubs/${encodeURIComponent(clubId)}/favorite`, { userId, favorite });
  return res.data;
}

export async function followClub(clubId: string): Promise<{
  clubId: string;
  following: boolean;
  favoriteClubIds: string[];
}> {
  const res = await api.post(`/clubs/${encodeURIComponent(clubId)}/follow`);
  return res.data;
}

export async function unfollowClub(clubId: string): Promise<{
  clubId: string;
  following: boolean;
  favoriteClubIds: string[];
}> {
  const res = await api.delete(`/clubs/${encodeURIComponent(clubId)}/follow`);
  return res.data;
}

export async function getMyFollowedClubs(): Promise<Club[]> {
  const res = await api.get("/users/me/followed-clubs");
  return res.data;
}

export async function getFriends(): Promise<Friend[]> {
  const res = await api.get("/friends");
  return res.data;
}

export async function searchUsers(query: string): Promise<FriendSearchResult[]> {
  const res = await api.get("/users/search", { params: { q: query } });
  return res.data;
}

export async function getFriendRequests(): Promise<{
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  const res = await api.get("/friends/requests");
  return res.data;
}

export async function sendFriendRequest(receiverUserId: string): Promise<FriendRequest> {
  const res = await api.post("/friends/request", { receiverUserId });
  return {
    ...res.data,
    createdAt: res.data.createdAt ?? new Date().toISOString(),
    direction: "outgoing",
  };
}

export async function acceptFriendRequest(requestId: string): Promise<{
  id: string;
  status: "accepted";
  user: Friend | null;
}> {
  const res = await api.post(`/friends/request/${encodeURIComponent(requestId)}/accept`);
  return res.data;
}

export async function declineFriendRequest(requestId: string): Promise<{
  id: string;
  status: "declined";
}> {
  const res = await api.post(`/friends/request/${encodeURIComponent(requestId)}/decline`);
  return res.data;
}

export async function removeFriend(friendId: string): Promise<{
  friendId: string;
  removed: boolean;
}> {
  const res = await api.delete(`/friends/${encodeURIComponent(friendId)}`);
  return res.data;
}

export async function getEventFriendsGoing(eventId: string): Promise<EventFriendsGoingResponse> {
  const res = await api.get(`/events/${encodeURIComponent(eventId)}/friends-going`);
  return res.data;
}

export async function getMyFriendsEvents(): Promise<FriendsEventsFeedItem[]> {
  const res = await api.get("/users/me/friends-events");
  return res.data;
}

export async function getDiscovery(): Promise<DiscoveryPayload> {
  const res = await api.get("/discover");
  return res.data;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const res = await api.get("/notifications");
  return res.data;
}

export async function getSchedule(): Promise<ScheduleResponse> {
  const res = await api.get("/schedule");
  return res.data;
}

export async function getUser(): Promise<UserResponse> {
  const res = await api.get("/profile");
  return res.data;
}

export async function getBuildings(): Promise<Building[]> {
  const res = await api.get("/buildings");
  return res.data;
}

export async function setEventAttendance(eventId: string, attending: boolean, userId = "u1"): Promise<{
  eventId: string;
  attending: boolean;
  attendanceCount: number;
  attendingEventIds: string[];
}> {
  const res = await api.put(`/events/${encodeURIComponent(eventId)}/attendance`, { userId, attending });
  return res.data;
}

