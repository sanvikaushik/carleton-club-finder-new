import type { EventPayload } from "../api/client";

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateEventForm(values: EventPayload): Partial<Record<keyof EventPayload, string>> {
  const errors: Partial<Record<keyof EventPayload, string>> = {};

  if (values.title.trim().length < 3) errors.title = "Event title must be at least 3 characters.";
  else if (values.title.trim().length > 120) errors.title = "Event title must be 120 characters or fewer.";

  if (values.description.trim().length < 10) errors.description = "Description must be at least 10 characters.";
  else if (values.description.trim().length > 2000) errors.description = "Description must be 2000 characters or fewer.";

  if (!values.building) errors.building = "Choose a building.";
  if (!values.room.trim()) errors.room = "Room is required.";

  if (values.floor === "") errors.floor = "Floor is required.";
  else if (Number.isNaN(Number(values.floor))) errors.floor = "Floor must be a number.";

  if (!values.startTime) errors.startTime = "Start time is required.";
  if (!values.endTime) errors.endTime = "End time is required.";
  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errors.endTime = "End time must be after start time.";
  }

  if (values.capacity === "") errors.capacity = "Capacity is required.";
  else if (Number.isNaN(Number(values.capacity))) errors.capacity = "Capacity must be a number.";
  else if (Number(values.capacity) < 1 || Number(values.capacity) > 5000) errors.capacity = "Capacity must be between 1 and 5000.";

  if (values.foodAvailable && values.foodType.trim().length > 80) errors.foodType = "Food type must be 80 characters or fewer.";
  if (values.imageUrl.trim() && !isValidUrl(values.imageUrl.trim())) errors.imageUrl = "Image URL must be a valid http or https URL.";

  return errors;
}
