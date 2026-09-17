import "server-only";
import { ZodError } from "zod";
import { AuthzError } from "@/lib/auth";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

type PgLikeError = { code?: string; message?: string; details?: string | null; hint?: string | null };

function isPgError(e: unknown): e is PgLikeError {
  return typeof e === "object" && e !== null && ("code" in e || "message" in e);
}

/** Turns any thrown value into a user-facing message. */
export function toActionError(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> } {
  if (e instanceof AuthzError) return { ok: false, error: e.message };
  if (e instanceof ZodError) {
    const flat = e.flatten();
    const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
    const hasFields = Object.values(fieldErrors).some((v) => v?.length);
    return {
      ok: false,
      // Schemas on plain values (e.g. a password string) only produce form-level errors.
      error: hasFields ? "Check the highlighted fields." : (flat.formErrors[0] ?? "Check the values you entered."),
      fieldErrors,
    };
  }
  if (isPgError(e)) {
    switch (e.code) {
      case "23505":
        return { ok: false, error: "A record with that name or value already exists." };
      case "23503":
        return {
          ok: false,
          error: e.message?.includes("delete")
            ? "This record is still used by components. Deactivate it instead."
            : "A selected reference no longer exists. Refresh and try again.",
        };
      case "23514":
        return { ok: false, error: "One of the values is out of the allowed range." };
      case "42501":
        return { ok: false, error: e.message || "You do not have permission to perform this action." };
      case "PGRST116":
        return { ok: false, error: "Record not found." };
      default:
        if (e.message) return { ok: false, error: e.message };
    }
  }
  console.error(e);
  return { ok: false, error: "Something went wrong. Try again." };
}

/** Reads a FormData into a plain object of strings (files ignored). */
export function formToObject(fd: FormData) {
  const out: Record<string, string> = {};
  fd.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  });
  return out;
}
