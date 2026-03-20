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

export async function getEvent(id: string): Promise<EventModel> {
  const res = await api.get(`/events/${encodeURIComponent(id)}`);
  return res.data;
}

export async function getClubs(): Promise<Club[]> {
  const res = await api.get("/clubs");
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
  const res = await api.get("/user");
  return res.data;
}

export async function getBuildings(): Promise<Building[]> {
  const res = await api.get("/buildings");
  return res.data;
}

