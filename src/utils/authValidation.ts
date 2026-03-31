import type { LoginPayload, SignUpPayload } from "../api/client";

export function validateLoginForm(values: LoginPayload): Partial<Record<keyof LoginPayload, string>> {
  const errors: Partial<Record<keyof LoginPayload, string>> = {};
  const email = values.email.trim();

  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  if (!values.password) errors.password = "Password is required.";

  return errors;
}

export function validateSignUpForm(values: SignUpPayload): Partial<Record<keyof SignUpPayload, string>> {
  const errors: Partial<Record<keyof SignUpPayload, string>> = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim().toLowerCase();

  if (fullName.length < 2) errors.fullName = "Full name is required.";

  if (!email) errors.email = "Carleton email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  else if (!email.endsWith("@cmail.carleton.ca") && !email.endsWith("@carleton.ca")) errors.email = "Use your Carleton email address.";

  if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";

  return errors;
}
