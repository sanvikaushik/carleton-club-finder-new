import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { LoginPayload } from "../api/client";
import { useAppState } from "../state/appState";
import { validateLoginForm } from "../utils/authValidation";

const INITIAL_FORM: LoginPayload = {
  email: "",
  password: "",
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { logInUser } = useAppState();
  const [form, setForm] = useState<LoginPayload>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginPayload, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading">("idle");

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLoginForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError("");
    setSubmitState("loading");
    try {
      await logInUser(form);
      navigate("/profile");
    } catch (error) {
      if (axios.isAxiosError<{ error?: string; fieldErrors?: Partial<Record<keyof LoginPayload, string>> }>(error)) {
        setFieldErrors(error.response?.data?.fieldErrors ?? {});
        setSubmitError(error.response?.data?.error ?? "Login failed.");
      } else {
        setSubmitError("Login failed.");
      }
    } finally {
      setSubmitState("idle");
    }
  };

  return (
    <div className="page authPage">
      <div className="authCard">
        <h1 className="pageTitle">Login</h1>
        <div className="pageSubtitle">Sign in to keep your followed clubs and profile attached to your account.</div>

        <form className="createClubForm" onSubmit={onSubmit} noValidate>
          <label className="formField">
            <span className="formLabel">Email</span>
            <input className={`formInput ${fieldErrors.email ? "isError" : ""}`} name="email" type="email" value={form.email} onChange={onChange} placeholder="you@cmail.carleton.ca" />
            {fieldErrors.email ? <span className="fieldError">{fieldErrors.email}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Password</span>
            <input className={`formInput ${fieldErrors.password ? "isError" : ""}`} name="password" type="password" value={form.password} onChange={onChange} placeholder="Enter your password" />
            {fieldErrors.password ? <span className="fieldError">{fieldErrors.password}</span> : null}
          </label>

          {submitError ? <div className="statusBanner error">{submitError}</div> : null}

          <button type="submit" className="primaryBtn authSubmitBtn" disabled={submitState === "loading"}>
            {submitState === "loading" ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="authSwitchRow">
          Need an account?
          <button type="button" className="textActionBtn" onClick={() => navigate("/signup")}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};
