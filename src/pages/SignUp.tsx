import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { SignUpPayload } from "../api/client";
import { useAppState } from "../state/appState";
import { validateSignUpForm } from "../utils/authValidation";

const INITIAL_FORM: SignUpPayload = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  program: "",
  year: "",
};

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUpUser } = useAppState();
  const [form, setForm] = useState<SignUpPayload>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignUpPayload, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading">("idle");

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateSignUpForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError("");
    setSubmitState("loading");
    try {
      const user = await signUpUser(form);
      navigate(user.onboardingCompleted ? "/profile" : "/onboarding");
    } catch (error) {
      if (axios.isAxiosError<{ error?: string; fieldErrors?: Partial<Record<keyof SignUpPayload, string>> }>(error)) {
        setFieldErrors(error.response?.data?.fieldErrors ?? {});
        setSubmitError(error.response?.data?.error ?? "Sign up failed.");
      } else {
        setSubmitError("Sign up failed.");
      }
    } finally {
      setSubmitState("idle");
    }
  };

  return (
    <div className="page authPage">
      <div className="authCard">
        <h1 className="pageTitle">Sign Up</h1>
        <div className="pageSubtitle">Create a student account to follow clubs and keep your data tied to you.</div>

        <form className="createClubForm" onSubmit={onSubmit} noValidate>
          <label className="formField">
            <span className="formLabel">Full Name</span>
            <input className={`formInput ${fieldErrors.fullName ? "isError" : ""}`} name="fullName" value={form.fullName} onChange={onChange} placeholder="Full name" />
            {fieldErrors.fullName ? <span className="fieldError">{fieldErrors.fullName}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Carleton Email</span>
            <input className={`formInput ${fieldErrors.email ? "isError" : ""}`} name="email" type="email" value={form.email} onChange={onChange} placeholder="you@cmail.carleton.ca" />
            {fieldErrors.email ? <span className="fieldError">{fieldErrors.email}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Program</span>
            <input className={`formInput ${fieldErrors.program ? "isError" : ""}`} name="program" value={form.program} onChange={onChange} placeholder="Computer Science" />
            {fieldErrors.program ? <span className="fieldError">{fieldErrors.program}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Year</span>
            <input className={`formInput ${fieldErrors.year ? "isError" : ""}`} name="year" value={form.year} onChange={onChange} placeholder="2nd Year" />
            {fieldErrors.year ? <span className="fieldError">{fieldErrors.year}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Password</span>
            <input className={`formInput ${fieldErrors.password ? "isError" : ""}`} name="password" type="password" value={form.password} onChange={onChange} placeholder="Create a password" />
            {fieldErrors.password ? <span className="fieldError">{fieldErrors.password}</span> : null}
          </label>
          <label className="formField">
            <span className="formLabel">Confirm Password</span>
            <input className={`formInput ${fieldErrors.confirmPassword ? "isError" : ""}`} name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} placeholder="Repeat your password" />
            {fieldErrors.confirmPassword ? <span className="fieldError">{fieldErrors.confirmPassword}</span> : null}
          </label>

          {submitError ? <div className="statusBanner error">{submitError}</div> : null}

          <button type="submit" className="primaryBtn authSubmitBtn" disabled={submitState === "loading"}>
            {submitState === "loading" ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="authSwitchRow">
          Already have an account?
          <button type="button" className="textActionBtn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};
