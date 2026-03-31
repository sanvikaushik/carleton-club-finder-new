import type { CreateClubPayload } from "../api/client";

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCreateClubForm(values: CreateClubPayload): Partial<Record<keyof CreateClubPayload, string>> {
  const errors: Partial<Record<keyof CreateClubPayload, string>> = {};
  const name = values.name.trim();
  const category = values.category.trim();
  const description = values.description.trim();
  const meetingLocation = values.meetingLocation.trim();
  const contactEmail = values.contactEmail.trim();
  const socialLink = values.socialLink.trim();
  const imageUrl = values.imageUrl.trim();

  if (name.length < 3) errors.name = "Club name must be at least 3 characters.";
  else if (name.length > 100) errors.name = "Club name must be 100 characters or fewer.";

  if (category.length < 2) errors.category = "Category must be at least 2 characters.";
  else if (category.length > 60) errors.category = "Category must be 60 characters or fewer.";

  if (description.length < 10) errors.description = "Description must be at least 10 characters.";
  else if (description.length > 1200) errors.description = "Description must be 1200 characters or fewer.";

  if (meetingLocation.length < 2) errors.meetingLocation = "Meeting location is required.";
  else if (meetingLocation.length > 200) errors.meetingLocation = "Meeting location must be 200 characters or fewer.";

  if (!contactEmail) errors.contactEmail = "Contact email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) errors.contactEmail = "Enter a valid contact email.";

  if (socialLink && !isValidUrl(socialLink)) errors.socialLink = "Social link must be a valid http or https URL.";
  if (imageUrl && !isValidUrl(imageUrl)) errors.imageUrl = "Image URL must be a valid http or https URL.";

  return errors;
}
