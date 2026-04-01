import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Login } from "../Login";
import { SignUp } from "../SignUp";

const mockAppState = {
  logInUser: vi.fn(),
  signUpUser: vi.fn(),
};

vi.mock("../../state/appState", () => ({
  useAppState: () => mockAppState,
}));

function renderWithRoutes(element: React.ReactElement, path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={element} />
        <Route path="/signup" element={element} />
        <Route path="/profile" element={<div>Profile Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("auth pages", () => {
  beforeEach(() => {
    mockAppState.logInUser.mockReset();
    mockAppState.signUpUser.mockReset();
  });

  it("shows login validation errors and submits successfully", async () => {
    const user = userEvent.setup();
    mockAppState.logInUser.mockResolvedValue({ onboardingCompleted: true });

    render(renderWithRoutes(<Login />, "/login"));

    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("you@cmail.carleton.ca"), "login@cmail.carleton.ca");
    await user.type(screen.getByPlaceholderText("Enter your password"), "CampusPass123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(screen.getByText("Profile Page")).toBeInTheDocument());
  });

  it("submits sign up and routes new users into onboarding", async () => {
    const user = userEvent.setup();
    mockAppState.signUpUser.mockResolvedValue({ onboardingCompleted: false });

    render(renderWithRoutes(<SignUp />, "/signup"));

    await user.type(screen.getByPlaceholderText("Full name"), "Student Tester");
    await user.type(screen.getByPlaceholderText("you@cmail.carleton.ca"), "student@cmail.carleton.ca");
    await user.type(screen.getByPlaceholderText("Computer Science"), "Computer Science");
    await user.type(screen.getByPlaceholderText("2nd Year"), "2nd Year");
    await user.type(screen.getByPlaceholderText("Create a password"), "CampusPass123");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "CampusPass123");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => expect(screen.getByText("Onboarding Page")).toBeInTheDocument());
  });
});
