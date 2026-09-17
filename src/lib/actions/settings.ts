"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, orgSettingsSchema } from "@/lib/validations";
import { toActionError, type ActionResult } from "@/lib/action-utils";

export async function updateMyProfile(fullName: string): Promise<ActionResult> {
  try {
    await authorize();
    const name = z.string().trim().min(1, "Name is required").max(200).parse(fullName);
    const { error } = await (await createClient()).rpc("update_my_profile", { p_full_name: name });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile saved" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function changeMyPassword(input: z.input<typeof changePasswordSchema>): Promise<ActionResult> {
  try {
    const me = await authorize();
    const v = changePasswordSchema.parse(input);
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: me.email,
      password: v.currentPassword,
    });
    if (verifyError) return { ok: false, error: "Your current password is incorrect." };
    const { error } = await supabase.auth.updateUser({ password: v.newPassword });
    if (error) throw error;
    return { ok: true, message: "Password changed" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateOrgSettings(input: z.input<typeof orgSettingsSchema>): Promise<ActionResult> {
  try {
    await authorize("settings.manage");
    const v = orgSettingsSchema.parse(input);
    const { error } = await (await createClient()).from("app_settings").update(v).eq("id", 1);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Organization settings saved" };
  } catch (e) {
    return toActionError(e);
  }
}
