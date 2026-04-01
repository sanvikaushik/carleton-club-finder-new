import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Search } from "../Search";

const api = vi.hoisted(() => ({
  globalSearch: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  globalSearch: api.globalSearch,
}));

describe("Search page", () => {
  it("shows grouped results after searching", async () => {
    api.globalSearch.mockResolvedValueOnce({
      clubs: [{ id: "club-1", name: "AI Club", category: "Tech", followerCount: 10 }],
      events: [{ id: "event-1", title: "AI Meetup", startTime: "2026-04-01T18:00:00Z", buildingName: "Nicol", room: "4020", clubName: "AI Club" }],
      users: [{ id: "user-1", name: "Alex", status: "none" }],
      buildings: [{ id: "nicol", name: "Nicol Building", floors: [1, 2], todayEventsCount: 2 }],
    });

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Search clubs, events, people, buildings"), {
      target: { value: "ai" },
    });
    await waitFor(() => expect(api.globalSearch).toHaveBeenCalledWith("ai"), { timeout: 1500 });

    await waitFor(() => expect(screen.getAllByText("AI Club").length).toBeGreaterThan(0));
    expect(screen.getByText("AI Meetup")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Nicol Building")).toBeInTheDocument();
  });
});
