import type { z } from "zod";
import type { ActionState } from "./types";

export function actionError(message: string, fieldErrors?: Record<string, string[]>): ActionState {
  return fieldErrors
    ? { status: "error", message, fieldErrors }
    : { status: "error", message };
}

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}

export function zodActionError(error: z.ZodError): ActionState {
  const flattened = error.flatten();
  return actionError("입력 내용을 확인해 주세요.", flattened.fieldErrors as Record<string, string[]>);
}

export function optionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function requiredString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function optionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function seoulDateTimeToIso(value: FormDataEntryValue | null): string | null {
  const local = optionalString(value);

  if (!local) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
    return `${local}:00+09:00`;
  }

  return local;
}

export function parsePositiveId(value: FormDataEntryValue | null): number | null {
  const id = optionalNumber(value);
  return id !== null && Number.isInteger(id) && id > 0 ? id : null;
}
