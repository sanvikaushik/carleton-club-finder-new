import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventCard } from "../EventCard";
import { renderRoute } from "../../test/test-utils";

describe("EventCard", () => {
  it("renders going state and calls toggle handler", async () => {
    const user = userEvent.setup();
    const onToggleGoing = vi.fn();

    renderRoute(
      <EventCard
        event={{
          id: "event-1",
          title: "Campus Mixer",
          clubId: "club-1",
          building: "Nicol",
          floor: 4,
          room: "4020",
          startTime: "2026-04-10T18:00:00-04:00",
          endTime: "2026-04-10T20:00:00-04:00",
          attendanceCount: 12,
          capacity: 50,
          foodAvailable: true,
          foodType: "Pizza",
          description: "Event",
          tags: ["Social"],
          friendsGoing: [],
          happeningNow: false,
        }}
        clubName="Campus Club"
        friends={[]}
        isGoing={false}
        onToggleGoing={onToggleGoing}
      />,
      "/",
    );

    await user.click(screen.getByRole("button", { name: "I'm Going" }));
    expect(onToggleGoing).toHaveBeenCalledTimes(1);
  });
});
