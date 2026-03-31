import React from "react";

export const DiscoveryPanel: React.FC<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, actionLabel, onAction, children }) => {
  return (
    <section className="discoveryPanel">
      <div className="discoveryPanelHeader">
        <div>
          <div className="sectionTitle">{title}</div>
          {subtitle ? <div className="panelSubtitle">{subtitle}</div> : null}
        </div>
        {actionLabel && onAction ? (
          <button type="button" className="textActionBtn" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
};
