import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BottomTabBar } from "./components/BottomTabBar";
import { Home } from "./pages/Home";
import { Explore } from "./pages/Explore";
import { Clubs } from "./pages/Clubs";
import { ClubDetail } from "./pages/ClubDetail";
import { CreateClub } from "./pages/CreateClub";
import { Login } from "./pages/Login";
import { Schedule } from "./pages/Schedule";
import { SignUp } from "./pages/SignUp";
import { Friends } from "./pages/Friends";
import { Profile } from "./pages/Profile";
import { Notifications } from "./pages/Notifications";
import { EventDetails } from "./pages/EventDetails";
import { BuildingFloorView } from "./pages/BuildingFloorView";

const AppShell: React.FC = () => {
  const location = useLocation();

  const tabPaths: Array<{ path: string; key: string }> = [
    { path: "/", key: "home" },
    { path: "/explore", key: "explore" },
    { path: "/clubs", key: "clubs" },
    { path: "/schedule", key: "schedule" },
    { path: "/friends", key: "friends" },
    { path: "/profile", key: "profile" },
  ];

  const activeTab =
    tabPaths.find((t) => (t.path === "/" ? location.pathname === "/" : location.pathname.startsWith(t.path)))?.key ??
    "home";

  const showTabBar =
    (
      !location.pathname.startsWith("/event/") &&
      !location.pathname.startsWith("/clubs/") &&
      !location.pathname.startsWith("/notifications") &&
      !location.pathname.startsWith("/building/") &&
      !location.pathname.startsWith("/login") &&
      !location.pathname.startsWith("/signup")
    ) ||
    location.pathname === "/clubs" ||
    location.pathname.startsWith("/clubs/create");

  return (
    <div className="appShell">
      <div className="appContent">{showTabBar ? null : null}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/create" element={<CreateClub />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/building/:buildingId" element={<BuildingFloorView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showTabBar ? <BottomTabBar activeTab={activeTab} /> : null}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
};

