import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminRole = "owner" | "editor";

export type ActiveAdmin = {
  userId: string;
  email: string | null;
  role: AdminRole;
};

export type AdminContext = {
  supabase: SupabaseClient;
  admin: ActiveAdmin;
};

export type AdminAccess =
  | { status: "configuration_required" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | ({ status: "authorized" } & AdminContext);

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const INITIAL_ACTION_STATE: ActionState = {
  status: "idle",
  message: ""
};
