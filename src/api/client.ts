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
};

export type Friend = {
  id: string;
  name: string;
  avatarColor?: string;
  attendingEventIds: string[];
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

export async function setClubFavorite(clubId: string, favorite: boolean, userId = "u1"): Promise<{
  clubId: string;
  favorite: boolean;
  favoriteClubIds: string[];
}> {
  const res = await api.put(`/clubs/${encodeURIComponent(clubId)}/favorite`, { userId, favorite });
  return res.data;
}

export async function getFriends(): Promise<Friend[]> {
  const res = await api.get("/friends");
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

