import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

export function renderRoute(element: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
        <Route path="/profile" element={<div>Profile Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route path="/friends" element={<div>Friends Page</div>} />
        <Route path="/event/:id" element={<div>Event Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
