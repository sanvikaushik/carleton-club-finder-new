import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ApiErrorPayload, createClub, CreateClubPayload, uploadClubImage } from "../api/client";
import { ImageUploadField } from "../components/ImageUploadField";
import { validateCreateClubForm } from "../utils/createClubValidation";

const INITIAL_FORM: CreateClubPayload = {
  name: "",
  category: "",
  description: "",
  meetingLocation: "",
  contactEmail: "",
  socialLink: "",
  imageUrl: "",
};

const CATEGORY_OPTIONS = ["Technology", "Arts", "Community", "Engineering", "Leisure", "Business", "Culture"];

function ClubPreview(props: { name: string; imageUrl: string }) {
  const initials = useMemo(() => {
    const compactName = props.name.trim();
    if (!compactName) return "CC";
    return compactName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [props.name]);

  return (
    <div className="createClubPreview">
      {props.imageUrl ? <img className="createClubPreviewImage" src={props.imageUrl} alt="" /> : <span>{initials}</span>}
    </div>
  );
}

function FormField(props: {
  name: keyof CreateClubPayload;
  label: string;
  value: string;
  error?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder: string;
  rows?: number;
  type?: string;
  list?: string;
}) {
  const describedBy = props.error ? `${props.name}-error` : undefined;

  return (
    <label className="formField" htmlFor={props.name}>
      <span className="formLabel">{props.label}</span>
      {props.rows ? (
        <textarea
          id={props.name}
          name={props.name}
          rows={props.rows}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          className={`formInput formTextArea ${props.error ? "isError" : ""}`}
          aria-invalid={props.error ? "true" : "false"}
          aria-describedby={describedBy}
        />
      ) : (
        <input
          id={props.name}
          name={props.name}
          type={props.type ?? "text"}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          list={props.list}
          className={`formInput ${props.error ? "isError" : ""}`}
          aria-invalid={props.error ? "true" : "false"}
          aria-describedby={describedBy}
        />
      )}
      {props.error ? (
        <span className="fieldError" id={`${props.name}-error`}>
          {props.error}
        </span>
      ) : null}
    </label>
  );
}

export const CreateClub: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateClubPayload>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateClubPayload, string>>>({});
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name as keyof CreateClubPayload]) return prev;
      const next = { ...prev };
      delete next[name as keyof CreateClubPayload];
      return next;
    });
    setSubmitError("");
    if (submitState !== "idle") setSubmitState("idle");
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

    const errors = validateCreateClubForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitState("error");
      return;
    }

    setFieldErrors({});
    setSubmitError("");
    setSubmitState("loading");

    try {
      const created = await createClub({
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        meetingLocation: form.meetingLocation.trim(),
        contactEmail: form.contactEmail.trim(),
        socialLink: form.socialLink.trim(),
        imageUrl: form.imageUrl.trim(),
      });
      if (imageFile) {
        await uploadClubImage(created.id, imageFile);
      }
      setSubmitState("success");
      navigate("/clubs", { state: { createdClubName: created.name } });
    } catch (error) {
      if (axios.isAxiosError<ApiErrorPayload>(error)) {
        setFieldErrors(error.response?.data?.fieldErrors ?? {});
        const message = error.response?.data?.error ?? "Club creation failed.";
        const details = error.response?.data?.details;
        setSubmitError(details ? `${message} ${details}` : message);
      } else {
        setSubmitError("Club creation failed.");
      }
      setSubmitState("error");
    }
  };

  return (
    <div className="page">
      <div className="detailTopRow createClubTopRow">
        <button type="button" className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
          {"<"}
        </button>
        <div className="createClubTopText">
          <div className="detailTopTitle">Create Club</div>
          <div className="pageSubtitle">Add a new club profile to the shared clubs directory.</div>
        </div>
      </div>

      <div className="createClubHero">
        <div>
          <div className="createClubHeroTitle">Club profile preview</div>
          <div className="createClubHeroSub">Use an image URL or leave it blank for a generated placeholder.</div>
        </div>
        <ClubPreview name={form.name} imageUrl={imagePreviewUrl || form.imageUrl} />
      </div>

      <form className="createClubForm" onSubmit={onSubmit} noValidate>
        <FormField name="name" label="Club Name" value={form.name} error={fieldErrors.name} onChange={onChange} placeholder="Carleton Makers Guild" />
        <FormField
          name="category"
          label="Category"
          value={form.category}
          error={fieldErrors.category}
          onChange={onChange}
          placeholder="Technology"
          list="create-club-categories"
        />
        <datalist id="create-club-categories">
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <FormField
          name="description"
          label="Description"
          value={form.description}
          error={fieldErrors.description}
          onChange={onChange}
          placeholder="Describe what your club does and who it is for."
          rows={5}
        />
        <FormField
          name="meetingLocation"
          label="Meeting Location"
          value={form.meetingLocation}
          error={fieldErrors.meetingLocation}
          onChange={onChange}
          placeholder="Nicol Building, Room 4020"
        />
        <FormField
          name="contactEmail"
          label="Contact Email"
          value={form.contactEmail}
          error={fieldErrors.contactEmail}
          onChange={onChange}
          placeholder="club@cmail.carleton.ca"
          type="email"
        />
        <FormField
          name="socialLink"
          label="Instagram / Social Link"
          value={form.socialLink}
          error={fieldErrors.socialLink}
          onChange={onChange}
          placeholder="https://instagram.com/yourclub"
          type="url"
        />
        <FormField
          name="imageUrl"
          label="Club Image / Logo URL"
          value={form.imageUrl}
          error={fieldErrors.imageUrl}
          onChange={onChange}
          placeholder="https://example.com/logo.png"
          type="url"
        />
        <ImageUploadField
          title="Upload club logo"
          helperText="JPG, PNG, WEBP, or GIF up to 5 MB. If you choose a file, it will be uploaded after the club is created."
          currentImageUrl={form.imageUrl}
          previewUrl={imagePreviewUrl}
          fallbackLabel={form.name || "Club"}
          inputId="create-club-image-upload"
          busy={submitState === "loading"}
          onFileChange={onImageFileChange}
        />

        <div className="formHint">The image field is optional. If you leave it blank, the app uses a placeholder with the club initials.</div>

        {submitState === "success" ? <div className="statusBanner success">Club created successfully. Redirecting...</div> : null}
        {submitError ? <div className="statusBanner error">{submitError}</div> : null}

        <div className="formActionRow">
          <button type="button" className="secondaryBtn" onClick={() => navigate(-1)} disabled={submitState === "loading"}>
            Cancel
          </button>
          <button type="submit" className="primaryBtn createClubSubmitBtn" disabled={submitState === "loading"}>
            {submitState === "loading" ? "Creating..." : "Create Club"}
          </button>
        </div>
      </form>
    </div>
  );
};
