import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Onboarding } from "../Onboarding";

const mockAppState = {
  authLoaded: true,
  authUser: {
    name: "Taylor Student",
    onboardingCompleted: false,
    favoriteClubIds: [],
  },
  refreshSessionState: vi.fn(),
};

const api = vi.hoisted(() => ({
  getInterests: vi.fn(),
  getMyInterests: vi.fn(),
  getDiscovery: vi.fn(),
  completeOnboarding: vi.fn(),
}));

vi.mock("../../state/appState", () => ({
  useAppState: () => mockAppState,
}));

vi.mock("../../api/client", () => ({
  getInterests: api.getInterests,
  getMyInterests: api.getMyInterests,
  getDiscovery: api.getDiscovery,
  completeOnboarding: api.completeOnboarding,
}));

describe("Onboarding page", () => {
  it("loads interests and saves selected onboarding choices", async () => {
    const user = userEvent.setup();
    api.getInterests.mockResolvedValueOnce(["Tech", "Music"]);
    api.getMyInterests.mockResolvedValueOnce([]);
    api.getDiscovery.mockResolvedValueOnce({
      recommendedClubs: [{ id: "club-1", name: "AI Club", category: "Technology", description: "desc" }],
      suggestedFriends: [],
      selectedInterests: [],
    });
    api.completeOnboarding.mockResolvedValueOnce({ ok: true });

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<div>Profile Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Get Started")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Get Started" }));
    await user.click(screen.getByRole("button", { name: "Tech" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /AI Club/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() =>
      expect(api.completeOnboarding).toHaveBeenCalledWith({
        interests: ["Tech"],
        starterClubIds: ["club-1"],
        starterFriendIds: [],
      }),
    );
  });
});
