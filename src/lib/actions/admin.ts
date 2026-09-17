"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createUserSchema,
  passwordSchema,
  rolePermissionSchema,
  updateUserSchema,
  userPermissionSchema,
} from "@/lib/validations";
import { toActionError, type ActionResult } from "@/lib/action-utils";

const BAN_FOREVER = "876000h"; // ~100 years

export async function createUser(input: z.input<typeof createUserSchema>): Promise<ActionResult> {
  try {
    await authorizeSuperAdmin();
    const v = createUserSchema.parse(input);
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: v.email,
      password: v.password,
      email_confirm: true,
      user_metadata: { full_name: v.fullName },
    });
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { ok: false, error: "A user with this email already exists." };
      }
      throw error;
    }
    // Role change goes through the audited, permission-checked RPC as the Super Admin.
    const supabase = await createClient();
    const { error: roleError } = await supabase.rpc("admin_update_user", {
      p_user_id: data.user.id,
      p_full_name: v.fullName,
      p_role: v.role,
      p_is_active: true,
    });
    if (roleError) throw roleError;
    await supabase.rpc("log_app_event", {
      p_action: "admin.user_created",
      p_entity: "profiles",
      p_entity_id: data.user.id,
      p_label: v.email,
      p_metadata: { role: v.role },
    });
    revalidatePath("/admin");
    return { ok: true, message: `${v.email} can now sign in` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateUser(input: z.input<typeof updateUserSchema>): Promise<ActionResult> {
  try {
    const me = await authorizeSuperAdmin();
    const v = updateUserSchema.parse(input);
    if (v.id === me.id) return { ok: false, error: "Use Settings to change your own profile." };
    const supabase = await createClient();

    const { data: before } = await supabase.from("profiles").select("is_active, email").eq("id", v.id).single();

    const { error } = await supabase.rpc("admin_update_user", {
      p_user_id: v.id,
      p_full_name: v.fullName,
      p_role: v.role,
      p_is_active: v.isActive,
    });
    if (error) throw error;

    if (before && before.is_active !== v.isActive) {
      // Block/unblock at the Auth level too, so existing refresh tokens stop working.
      const admin = createAdminClient();
      const { error: banError } = await admin.auth.admin.updateUserById(v.id, {
        ban_duration: v.isActive ? "none" : BAN_FOREVER,
      });
      if (banError) throw banError;
      await supabase.rpc("log_app_event", {
        p_action: v.isActive ? "admin.user_enabled" : "admin.user_disabled",
        p_entity: "profiles",
        p_entity_id: v.id,
        p_label: before.email,
      });
    }
    revalidatePath("/admin");
    return { ok: true, message: "User updated" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetUserPassword(userId: string, password: string): Promise<ActionResult> {
  try {
    const me = await authorizeSuperAdmin();
    const id = z.string().uuid().parse(userId);
    const pw = passwordSchema.parse(password);
    if (id === me.id) return { ok: false, error: "Use Settings to change your own password." };
    const supabase = await createClient();
    const { data: target } = await supabase.from("profiles").select("email").eq("id", id).single();
    if (!target) return { ok: false, error: "User not found." };
    const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: pw });
    if (error) throw error;
    await supabase.rpc("log_app_event", {
      p_action: "admin.password_reset",
      p_entity: "profiles",
      p_entity_id: id,
      p_label: target.email,
    });
    return { ok: true, message: "Password reset" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUserPermission(input: z.input<typeof userPermissionSchema>): Promise<ActionResult> {
  try {
    await authorizeSuperAdmin();
    const v = userPermissionSchema.parse(input);
    const { error } = await (await createClient()).rpc("admin_set_user_permission", {
      p_user_id: v.userId,
      p_permission: v.permission,
      p_state: v.state,
    });
    if (error) throw error;
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function setRolePermission(input: z.input<typeof rolePermissionSchema>): Promise<ActionResult> {
  try {
    await authorizeSuperAdmin();
    const v = rolePermissionSchema.parse(input);
    const { error } = await (await createClient()).rpc("admin_set_role_permission", {
      p_role: v.role,
      p_permission: v.permission,
      p_enabled: v.enabled,
    });
    if (error) throw error;
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}
