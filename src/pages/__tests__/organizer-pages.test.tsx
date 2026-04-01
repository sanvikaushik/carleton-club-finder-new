import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClubDetail } from "../ClubDetail";
import { CreateEvent } from "../CreateEvent";

const mockAppState = {
  authUser: { id: "user-1" },
  favoriteClubIds: new Set<string>(),
  isEventGoing: vi.fn(() => false),
  toggleFavoriteClub: vi.fn(),
  toggleGoingEvent: vi.fn(),
};

const api = vi.hoisted(() => ({
  getClubDetail: vi.fn(),
  getBuildings: vi.fn(),
  createClubEvent: vi.fn(),
}));

vi.mock("../../state/appState", () => ({
  useAppState: () => mockAppState,
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual("../../api/client");
  return {
    ...actual,
    getClubDetail: api.getClubDetail,
    getBuildings: api.getBuildings,
    createClubEvent: api.createClubEvent,
  };
});

describe("Organizer UI", () => {
  it("hides organizer controls for unauthorized users on club detail", async () => {
    api.getClubDetail.mockResolvedValueOnce({
      club: {
        id: "club-1",
        name: "AI Club",
        category: "Technology",
        description: "desc",
        canManageEvents: false,
        canEditClub: false,
      },
      upcomingEvents: [],
      tags: [],
      relatedClubs: [],
      friendFollowerCount: 0,
      memberships: [],
    });

    render(
      <MemoryRouter initialEntries={["/clubs/club-1"]}>
        <Routes>
          <Route path="/clubs/:id" element={<ClubDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("AI Club")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Create Event" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Club" })).not.toBeInTheDocument();
  });

  it("renders create event form and validates required fields", async () => {
    const user = userEvent.setup();
    api.getClubDetail.mockResolvedValueOnce({
      club: {
        id: "club-1",
        name: "AI Club",
        category: "Technology",
        description: "desc",
        canManageEvents: true,
      },
    });
    api.getBuildings.mockResolvedValueOnce([{ id: "nicol", name: "Nicol Building", floors: [1, 2, 3, 4] }]);

    render(
      <MemoryRouter initialEntries={["/clubs/club-1/events/create"]}>
        <Routes>
          <Route path="/clubs/:clubId/events/create" element={<CreateEvent />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Create Event")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Create Event" }));

    expect(screen.getByText("Event title must be at least 3 characters.")).toBeInTheDocument();
    expect(screen.getByText("Description must be at least 10 characters.")).toBeInTheDocument();
  });
});
