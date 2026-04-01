import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ApiErrorPayload, Building, ClubDetailPayload, createClubEvent, EventPayload, getBuildings, getClubDetail } from "../api/client";
import { EventForm, EventFormValues } from "../components/EventForm";
import { validateEventForm } from "../utils/eventValidation";

const INITIAL_FORM: EventFormValues = {
  title: "",
  description: "",
  building: "",
  floor: "",
  room: "",
  startTime: "",
  endTime: "",
  capacity: "100",
  foodAvailable: false,
  foodType: "",
  tagsText: "",
  imageUrl: "",
};

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

export const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { clubId: rawClubId } = useParams();
  const clubId = rawClubId ? decodeURIComponent(rawClubId) : null;

  const [loading, setLoading] = useState(true);
  const [clubPayload, setClubPayload] = useState<ClubDetailPayload | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [form, setForm] = useState<EventFormValues>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clubId) return;
      setLoading(true);
      try {
        const [clubDetail, buildingRows] = await Promise.all([getClubDetail(clubId), getBuildings()]);
        if (cancelled) return;
        setClubPayload(clubDetail);
        setBuildings(buildingRows);
        if (buildingRows.length > 0) {
          const firstBuilding = buildingRows[0];
          setForm((current) => ({
            ...current,
            building: current.building || firstBuilding.id,
            floor: current.floor || String(firstBuilding.floors[0] ?? 1),
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const canManage = clubPayload?.club.canManageEvents;
  const subtitle = useMemo(() => {
    if (!clubPayload) return "Set up a new event for your club.";
    return `Create a new event for ${clubPayload.club.name}.`;
  }, [clubPayload]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "building") {
        const building = buildings.find((item) => item.id === value);
        next.floor = building ? String(building.floors[0] ?? 1) : "";
      }
      return next;
    });
    setSubmitError("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clubId) return;
    const payload = toPayload(form);
    const errors = validateEventForm(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors as Partial<Record<keyof EventFormValues, string>>);
      setSubmitState("error");
      return;
    }

    setFieldErrors({});
    setSubmitError("");
    setSubmitState("loading");
    try {
      const created = await createClubEvent(clubId, payload);
      setSubmitState("success");
      navigate(`/event/${encodeURIComponent(created.id)}`, { replace: true });
    } catch (error) {
      if (axios.isAxiosError<ApiErrorPayload>(error)) {
        const rawErrors = error.response?.data?.fieldErrors ?? {};
        setFieldErrors({
          ...(rawErrors as Partial<Record<keyof EventFormValues, string>>),
          ...(rawErrors.tags ? { tagsText: rawErrors.tags } : {}),
        });
        setSubmitError(error.response?.data?.error ?? "Could not create the event.");
      } else {
        setSubmitError("Could not create the event.");
      }
      setSubmitState("error");
    }
  };

  if (!clubId) return null;

  return (
    <div className="page detailPage">
      <div className="detailTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="detailTopTitle">Create Event</div>
        <div />
      </div>

      {loading ? (
        <div className="placeholderCard">Loading organizer tools...</div>
      ) : !clubPayload ? (
        <div className="statusBanner error">Could not load this club.</div>
      ) : !canManage ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Organizer access required</div>
          <div className="mutedText">Only club owners and admins can create events for this club.</div>
        </div>
      ) : (
        <EventForm
          title="Create Event"
          subtitle={subtitle}
          values={form}
          errors={fieldErrors}
          buildings={buildings}
          submitLabel="Create Event"
          submitState={submitState}
          submitError={submitError}
          successMessage="Event created successfully."
          onChange={onChange}
          onToggleFood={() => setForm((current) => ({ ...current, foodAvailable: !current.foodAvailable }))}
          onCancel={() => navigate(-1)}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
};
