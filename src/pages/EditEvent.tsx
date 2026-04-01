import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ApiErrorPayload, Building, EventPayload, getBuildings, getEvent, updateClubEvent, uploadEventImage } from "../api/client";
import { EventForm, EventFormValues } from "../components/EventForm";
import { ImageUploadField } from "../components/ImageUploadField";
import { validateEventForm } from "../utils/eventValidation";

const INITIAL_FORM: EventFormValues = {
  title: "",
  description: "",
  building: "",
  floor: "",
  room: "",
  startTime: "",
  endTime: "",
  capacity: "",
  foodAvailable: false,
  foodType: "",
  tagsText: "",
  imageUrl: "",
};

function toInputDateTime(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toPayload(values: EventFormValues): EventPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    building: values.building,
    floor: values.floor === "" ? "" : Number(values.floor),
    room: values.room.trim(),
    startTime: values.startTime,
    endTime: values.endTime,
    capacity: values.capacity === "" ? "" : Number(values.capacity),
    foodAvailable: values.foodAvailable,
    foodType: values.foodType.trim(),
    tags: values.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
    imageUrl: values.imageUrl.trim(),
  };
}

export const EditEvent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const eventId = id ? decodeURIComponent(id) : null;

  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [form, setForm] = useState<EventFormValues>(INITIAL_FORM);
  const [canManage, setCanManage] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!eventId) return;
      setLoading(true);
      try {
        const [eventRow, buildingRows] = await Promise.all([getEvent(eventId), getBuildings()]);
        if (cancelled) return;
        setBuildings(buildingRows);
        setCanManage(Boolean(eventRow.canManage));
        setForm({
          title: eventRow.title,
          description: eventRow.description,
          building: eventRow.building,
          floor: String(eventRow.floor),
          room: eventRow.room,
          startTime: toInputDateTime(eventRow.startTime),
          endTime: toInputDateTime(eventRow.endTime),
          capacity: String(eventRow.capacity),
          foodAvailable: Boolean(eventRow.foodAvailable),
          foodType: eventRow.foodType ?? "",
          tagsText: eventRow.tags.join(", "),
          imageUrl: eventRow.imageUrl ?? "",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSubmitError("");
  };

  const onImageFileChange = (file: File | null) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId) return;
    const payload = toPayload(form);
    const errors = validateEventForm(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors as Partial<Record<keyof EventFormValues, string>>);
      setSubmitState("error");
      return;
    }

    setFieldErrors({});
    setSubmitState("loading");
    setSubmitError("");
    try {
      const updated = await updateClubEvent(eventId, payload);
      if (imageFile) {
        await uploadEventImage(eventId, imageFile);
      }
      setSubmitState("success");
      navigate(`/event/${encodeURIComponent(updated.id)}`, { replace: true });
    } catch (error) {
      if (axios.isAxiosError<ApiErrorPayload>(error)) {
        const rawErrors = error.response?.data?.fieldErrors ?? {};
        setFieldErrors({
          ...(rawErrors as Partial<Record<keyof EventFormValues, string>>),
          ...(rawErrors.tags ? { tagsText: rawErrors.tags } : {}),
        });
        setSubmitError(error.response?.data?.error ?? "Could not update the event.");
      } else {
        setSubmitError("Could not update the event.");
      }
      setSubmitState("error");
    }
  };

  if (!eventId) return null;

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Edit Event</div>
        <div />
      </div>

      {loading ? (
        <div className="placeholderCard">Loading event...</div>
      ) : !canManage ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Organizer access required</div>
          <div className="mutedText">Only club owners and admins can edit this event.</div>
        </div>
      ) : (
        <EventForm
          title="Edit Event"
          subtitle="Update event details, timing, and attendance settings."
          values={form}
          errors={fieldErrors}
          buildings={buildings}
          submitLabel="Save Changes"
          submitState={submitState}
          submitError={submitError}
          successMessage="Event updated successfully."
          imageUploadSlot={
            <ImageUploadField
              title="Upload event banner"
              helperText="Uploading a file will replace the current event image after you save."
              currentImageUrl={form.imageUrl}
              previewUrl={imagePreviewUrl}
              fallbackLabel={form.title || "Event"}
              inputId="edit-event-image-upload"
              busy={submitState === "loading"}
              onFileChange={onImageFileChange}
            />
          }
          onChange={onChange}
          onToggleFood={() => setForm((current) => ({ ...current, foodAvailable: !current.foodAvailable }))}
          onCancel={() => navigate(-1)}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
};
