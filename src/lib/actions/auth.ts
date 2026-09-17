"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirect } from "@/lib/utils";

export type SignInState = { error?: string; email?: string } | null;

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const banned = error?.message?.toLowerCase().includes("banned");
    return {
      error: banned
        ? "This account is disabled. Contact your administrator."
        : "Email or password is incorrect.",
      email,
    };
  }

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is disabled. Contact your administrator.", email };
  }

  await supabase.rpc("log_app_event", { p_action: "auth.sign_in", p_entity: "profiles", p_entity_id: data.user.id, p_label: parsed.data.email });

  redirect(isSafeRedirect(parsed.data.next) ? parsed.data.next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.rpc("log_app_event", { p_action: "auth.sign_out", p_entity: "profiles", p_entity_id: user.id, p_label: user.email ?? null });
  }
  await supabase.auth.signOut();
  redirect("/login");
}
