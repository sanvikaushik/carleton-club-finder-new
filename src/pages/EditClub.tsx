import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ApiErrorPayload, ClubDetailPayload, CreateClubPayload, getClubDetail, updateClubDetails, uploadClubImage } from "../api/client";
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

export const EditClub: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const clubId = id ? decodeURIComponent(id) : null;

  const [loading, setLoading] = useState(true);
  const [clubPayload, setClubPayload] = useState<ClubDetailPayload | null>(null);
  const [form, setForm] = useState<CreateClubPayload>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateClubPayload, string>>>({});
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clubId) return;
      setLoading(true);
      try {
        const payload = await getClubDetail(clubId);
        if (cancelled) return;
        setClubPayload(payload);
        setForm({
          name: payload.club.name,
          category: payload.club.category,
          description: payload.club.description,
          meetingLocation: payload.club.meetingLocation ?? "",
          contactEmail: payload.club.contactEmail ?? "",
          socialLink: payload.club.socialLink ?? "",
          imageUrl: payload.club.imageUrl ?? "",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (!clubId) return;
    const errors = validateCreateClubForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitState("error");
      return;
    }

    setFieldErrors({});
    setSubmitState("loading");
    setSubmitError("");
    try {
      await updateClubDetails(clubId, form);
      if (imageFile) {
        await uploadClubImage(clubId, imageFile);
      }
      setSubmitState("success");
      navigate(`/clubs/${encodeURIComponent(clubId)}`, { replace: true });
    } catch (error) {
      if (axios.isAxiosError<ApiErrorPayload>(error)) {
        setFieldErrors((error.response?.data?.fieldErrors ?? {}) as Partial<Record<keyof CreateClubPayload, string>>);
        setSubmitError(error.response?.data?.error ?? "Could not update the club.");
      } else {
        setSubmitError("Could not update the club.");
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
        <div className="detailTopTitle">Edit Club</div>
        <div />
      </div>

      {loading ? (
        <div className="placeholderCard">Loading club...</div>
      ) : !clubPayload?.club.canEditClub ? (
        <div className="sectionBlock">
          <div className="sectionTitle">Owner access required</div>
          <div className="mutedText">Only the club owner can edit club details.</div>
        </div>
      ) : (
        <form className="createClubForm" onSubmit={onSubmit} noValidate>
          <div className="pageHeaderRow">
            <div>
              <h1 className="pageTitle">Edit Club</h1>
              <div className="pageSubtitle">Update the club profile and contact information.</div>
            </div>
          </div>

          <label className="formField">
            <span className="formLabel">Club Name</span>
            <input className={`formInput ${fieldErrors.name ? "isError" : ""}`} name="name" value={form.name} onChange={onChange} />
            {fieldErrors.name ? <span className="fieldError">{fieldErrors.name}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Category</span>
            <input className={`formInput ${fieldErrors.category ? "isError" : ""}`} name="category" value={form.category} onChange={onChange} />
            {fieldErrors.category ? <span className="fieldError">{fieldErrors.category}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Description</span>
            <textarea className={`formInput formTextArea ${fieldErrors.description ? "isError" : ""}`} name="description" rows={5} value={form.description} onChange={onChange} />
            {fieldErrors.description ? <span className="fieldError">{fieldErrors.description}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Meeting Location</span>
            <input className={`formInput ${fieldErrors.meetingLocation ? "isError" : ""}`} name="meetingLocation" value={form.meetingLocation} onChange={onChange} />
            {fieldErrors.meetingLocation ? <span className="fieldError">{fieldErrors.meetingLocation}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Contact Email</span>
            <input className={`formInput ${fieldErrors.contactEmail ? "isError" : ""}`} name="contactEmail" type="email" value={form.contactEmail} onChange={onChange} />
            {fieldErrors.contactEmail ? <span className="fieldError">{fieldErrors.contactEmail}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Social Link</span>
            <input className={`formInput ${fieldErrors.socialLink ? "isError" : ""}`} name="socialLink" type="url" value={form.socialLink} onChange={onChange} />
            {fieldErrors.socialLink ? <span className="fieldError">{fieldErrors.socialLink}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Image URL</span>
            <input className={`formInput ${fieldErrors.imageUrl ? "isError" : ""}`} name="imageUrl" type="url" value={form.imageUrl} onChange={onChange} />
            {fieldErrors.imageUrl ? <span className="fieldError">{fieldErrors.imageUrl}</span> : null}
          </label>
          <ImageUploadField
            title="Upload club logo"
            helperText="Upload a file to replace the current club image. Existing external image URLs continue to work."
            currentImageUrl={form.imageUrl}
            previewUrl={imagePreviewUrl}
            fallbackLabel={form.name || "Club"}
            inputId="edit-club-image-upload"
            busy={submitState === "loading"}
            onFileChange={onImageFileChange}
          />

          {submitState === "success" ? <div className="statusBanner success">Club updated successfully.</div> : null}
          {submitError ? <div className="statusBanner error">{submitError}</div> : null}

          <div className="formActionRow">
            <button type="button" className="secondaryBtn" onClick={() => navigate(-1)} disabled={submitState === "loading"}>
              Cancel
            </button>
            <button type="submit" className="primaryBtn createClubSubmitBtn" disabled={submitState === "loading"}>
              {submitState === "loading" ? "Saving..." : "Save Club"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
