import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Notifications } from "../Notifications";

const mockAppState = {
  isAuthenticated: true,
  setUnreadNotificationCount: vi.fn(),
};

const api = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  dismissNotification: vi.fn(),
}));

vi.mock("../../state/appState", () => ({
  useAppState: () => mockAppState,
}));

vi.mock("../../api/client", () => ({
  getNotifications: api.getNotifications,
  markNotificationRead: api.markNotificationRead,
  markAllNotificationsRead: api.markAllNotificationsRead,
  dismissNotification: api.dismissNotification,
}));

describe("Notifications page", () => {
  beforeEach(() => {
    mockAppState.setUnreadNotificationCount.mockReset();
  });

  it("renders loading then empty state", async () => {
    api.getNotifications.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading notifications...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("No notifications yet.")).toBeInTheDocument());
  });

  it("renders notifications list and actions", async () => {
    const user = userEvent.setup();
    api.getNotifications.mockResolvedValueOnce([
      {
        id: "notif-1",
        type: "club_event",
        title: "New club event",
        message: "Something happened",
        isRead: false,
        isDismissed: false,
        createdAt: "2026-04-01T12:00:00Z",
      },
    ]);
    api.markNotificationRead.mockResolvedValueOnce({
      notification: {
        id: "notif-1",
        type: "club_event",
        title: "New club event",
        message: "Something happened",
        isRead: true,
        isDismissed: false,
        createdAt: "2026-04-01T12:00:00Z",
      },
      unreadCount: 0,
    });

    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("New club event")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Mark Read" }));
    expect(api.markNotificationRead).toHaveBeenCalledWith("notif-1");
  });
});
