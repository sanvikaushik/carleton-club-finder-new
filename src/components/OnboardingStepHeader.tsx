import React from "react";

export const OnboardingStepHeader: React.FC<{
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  eyebrow: string;
}> = ({ step, totalSteps, title, subtitle, eyebrow }) => {
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="onboardingStepHeader">
      <div className="onboardingStepMetaRow">
        <div className="onboardingEyebrow">{eyebrow}</div>
        <div className="onboardingProgressLabel">
          Step {step} of {totalSteps}
        </div>
      </div>
      <div className="onboardingProgressTrack" aria-hidden="true">
        <div className="onboardingProgressFill" style={{ width: `${progress}%` }} />
      </div>
      <h1 className="pageTitle">{title}</h1>
      <div className="pageSubtitle">{subtitle}</div>
    </div>
  );
};
