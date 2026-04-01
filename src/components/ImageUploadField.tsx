import React from "react";

function initials(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CF";
}

export const ImageUploadField: React.FC<{
  title: string;
  helperText: string;
  currentImageUrl?: string | null;
  previewUrl?: string | null;
  fallbackLabel: string;
  inputId: string;
  busy?: boolean;
  onFileChange: (file: File | null) => void;
}> = ({ title, helperText, currentImageUrl, previewUrl, fallbackLabel, inputId, busy = false, onFileChange }) => {
  const imageUrl = previewUrl || currentImageUrl || "";

  return (
    <div className="imageUploadCard">
      <div className="imageUploadPreviewWrap">
        {imageUrl ? (
          <img className="imageUploadPreview" src={imageUrl} alt="" />
        ) : (
          <div className="imageUploadFallback">{initials(fallbackLabel)}</div>
        )}
      </div>
      <div className="imageUploadContent">
        <div className="imageUploadTitle">{title}</div>
        <div className="imageUploadHelp">{helperText}</div>
        <label className="secondaryBtn imageUploadButton" htmlFor={inputId}>
          {busy ? "Uploading..." : "Choose Image"}
        </label>
        <input
          id={inputId}
          className="imageUploadInput"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
          disabled={busy}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
};
