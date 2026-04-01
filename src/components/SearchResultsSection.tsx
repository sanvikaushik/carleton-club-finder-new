import React from "react";

export const SearchResultsSection: React.FC<{
  title: string;
  count: number;
  children: React.ReactNode;
}> = ({ title, count, children }) => {
  if (count === 0) {
    return null;
  }

  return (
    <section className="searchSection">
      <div className="searchSectionHeader">
        <div className="sectionTitle">{title}</div>
        <div className="searchSectionCount">{count}</div>
      </div>
      <div className="searchSectionBody">{children}</div>
    </section>
  );
};
