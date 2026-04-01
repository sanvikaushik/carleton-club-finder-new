import React from "react";
import { Building } from "../api/client";

export type EventFormValues = {
  title: string;
  description: string;
  building: string;
  floor: string;
  room: string;
  startTime: string;
  endTime: string;
  capacity: string;
  foodAvailable: boolean;
  foodType: string;
  tagsText: string;
  imageUrl: string;
};

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

function FormField(props: {
  name: keyof EventFormValues;
  label: string;
  value: string;
  error?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  rows?: number;
  type?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="formField">
      <span className="formLabel">{props.label}</span>
      {props.children ? (
        props.children
      ) : props.rows ? (
        <textarea
          name={props.name}
          rows={props.rows}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          className={`formInput formTextArea ${props.error ? "isError" : ""}`}
        />
      ) : (
        <input
          name={props.name}
          type={props.type ?? "text"}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          className={`formInput ${props.error ? "isError" : ""}`}
        />
      )}
      {props.error ? <span className="fieldError">{props.error}</span> : null}
    </label>
  );
}

export const EventForm: React.FC<{
  title: string;
  subtitle: string;
  values: EventFormValues;
  errors: EventFormErrors;
  buildings: Building[];
  submitLabel: string;
  submitState: "idle" | "loading" | "success" | "error";
  submitError: string;
  successMessage?: string;
  imageUploadSlot?: React.ReactNode;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onToggleFood: () => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}> = ({ title, subtitle, values, errors, buildings, submitLabel, submitState, submitError, successMessage, imageUploadSlot, onChange, onToggleFood, onCancel, onSubmit }) => {
  return (
    <>
      <div className="pageHeaderRow">
        <div>
          <h1 className="pageTitle">{title}</h1>
          <div className="pageSubtitle">{subtitle}</div>
        </div>
      </div>

      <form className="createClubForm" onSubmit={onSubmit} noValidate>
        <FormField name="title" label="Event Title" value={values.title} error={errors.title} onChange={onChange} placeholder="AI Mixer" />
        <FormField
          name="description"
          label="Description"
          value={values.description}
          error={errors.description}
          onChange={onChange}
          placeholder="Tell students what to expect."
          rows={5}
        />

        <FormField name="building" label="Building" value={values.building} error={errors.building} onChange={onChange}>
          <select name="building" value={values.building} onChange={onChange} className={`formInput ${errors.building ? "isError" : ""}`}>
            <option value="">Select a building</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="formTwoCol">
          <FormField name="floor" label="Floor" value={values.floor} error={errors.floor} onChange={onChange} placeholder="4" type="number" />
          <FormField name="room" label="Room" value={values.room} error={errors.room} onChange={onChange} placeholder="4020" />
        </div>

        <div className="formTwoCol">
          <FormField
            name="startTime"
            label="Start Time"
            value={values.startTime}
            error={errors.startTime}
            onChange={onChange}
            type="datetime-local"
          />
          <FormField
            name="endTime"
            label="End Time"
            value={values.endTime}
            error={errors.endTime}
            onChange={onChange}
            type="datetime-local"
          />
        </div>

        <div className="formTwoCol">
          <FormField
            name="capacity"
            label="Capacity"
            value={values.capacity}
            error={errors.capacity}
            onChange={onChange}
            placeholder="100"
            type="number"
          />
          <label className="formField">
            <span className="formLabel">Food Available</span>
            <button type="button" className={`togglePill ${values.foodAvailable ? "active" : ""}`} onClick={onToggleFood}>
              {values.foodAvailable ? "Yes" : "No"}
            </button>
          </label>
        </div>

        <FormField
          name="foodType"
          label="Food Type"
          value={values.foodType}
          error={errors.foodType}
          onChange={onChange}
          placeholder="Pizza, snacks, drinks"
        />
        <FormField
          name="tagsText"
          label="Tags"
          value={values.tagsText}
          error={errors.tagsText}
          onChange={onChange}
          placeholder="AI, Networking, Social"
        />
        <FormField
          name="imageUrl"
          label="Banner Image URL"
          value={values.imageUrl}
          error={errors.imageUrl}
          onChange={onChange}
          placeholder="https://example.com/event-banner.png"
          type="url"
        />
        {imageUploadSlot}

        <div className="formHint">Tags should be comma-separated. The event image is optional and safe to leave blank.</div>

        {successMessage && submitState === "success" ? <div className="statusBanner success">{successMessage}</div> : null}
        {submitError ? <div className="statusBanner error">{submitError}</div> : null}

        <div className="formActionRow">
          <button type="button" className="secondaryBtn" onClick={onCancel} disabled={submitState === "loading"}>
            Cancel
          </button>
          <button type="submit" className="primaryBtn createClubSubmitBtn" disabled={submitState === "loading"}>
            {submitState === "loading" ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </>
  );
};
