import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import { fieldErrors } from "@/lib/validation";

export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });

export function invalid(error: ZodError): ActionResult<never> {
  return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(error) };
}

/** Translate database errors into messages people can act on. Never leaks SQL details. */
export function dbError(error: PostgrestError, fallback = "Something went wrong. Please try again."): ActionResult<never> {
  console.error("[savora] database error", error.code, error.message);
  switch (error.code) {
    case "23505":
      return { ok: false, error: "That item is already there." };
    case "23514":
    case "22P02":
      return { ok: false, error: "Some values are out of range. Check the form and try again." };
    case "22023":
      return { ok: false, error: error.message };
    case "P0002":
    case "PGRST116":
      return { ok: false, error: "That item no longer exists. It may have been removed on another device." };
    case "42501":
      return { ok: false, error: "You don't have access to that item." };
    default:
      return { ok: false, error: fallback };
  }
}

export const notSignedIn: ActionResult<never> = { ok: false, error: "Your session has ended. Please sign in again." };
