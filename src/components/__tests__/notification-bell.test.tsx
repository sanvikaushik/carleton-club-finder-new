import React from "react";
import { screen } from "@testing-library/react";
import { NotificationBell } from "../NotificationBell";
import { renderRoute } from "../../test/test-utils";

describe("NotificationBell", () => {
  it("renders an unread badge when count is non-zero", () => {
    renderRoute(<NotificationBell unreadCount={12} />, "/");

    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("hides the badge when unread count is zero", () => {
    renderRoute(<NotificationBell unreadCount={0} />, "/");

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
