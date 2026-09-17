"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { componentSchema, moveSchema, registerFileSchema, type MoveInput } from "@/lib/validations";
import { formToObject, toActionError, type ActionResult } from "@/lib/action-utils";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = ActionResult<{ id: string }> | null;

export async function createComponent(_prev: FormState, formData: FormData): Promise<FormState> {
  let newId: string;
  try {
    await authorize("inventory.create");
    const values = componentSchema.parse(formToObject(formData));
    const supabase = await createClient();
    const { data, error } = await supabase.from("components").insert(values).select("id, hw_id").single();
    if (error) throw error;
    newId = data.id as string;
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(`/inventory/${newId}?created=1`);
}

export async function updateComponent(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await authorize("inventory.edit");
    z.string().uuid().parse(id);
    const values = componentSchema.parse(formToObject(formData));
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("components")
      .update(values, { count: "exact" })
      .eq("id", id)
      .is("archived_at", null);
    if (error) throw error;
    if (!count) return { ok: false, error: "Component not found, archived, or you don't have access." };
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/dashboard");
  redirect(`/inventory/${id}?updated=1`);
}

export async function moveComponent(input: MoveInput): Promise<ActionResult> {
  try {
    await authorize("inventory.assign");
    const v = moveSchema.parse(input);
    const supabase = await createClient();
    const statusDefault =
      v.type === "assigned" ? "in_use" : v.type === "returned" ? "available" : null;
    const { error } = await supabase.rpc("move_component", {
      p_component_id: v.componentId,
      p_type: v.type,
      p_owner: v.type === "transferred" ? v.owner : null,
      p_holder: v.type === "assigned" || v.type === "transferred" ? v.holder : null,
      p_clear_holder: v.type === "returned",
      p_location_id: v.locationId,
      p_project_id: v.type === "assigned" || v.type === "transferred" ? v.projectId : null,
      p_status: v.status ?? statusDefault,
      p_notes: v.notes,
    });
    if (error) throw error;
    revalidatePath(`/inventory/${v.componentId}`);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, message: "Movement recorded" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function setComponentArchived(id: string, archived: boolean, reason?: string): Promise<ActionResult> {
  try {
    await authorize("inventory.archive");
    z.string().uuid().parse(id);
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_component_archived", {
      p_component_id: id,
      p_archived: archived,
      p_reason: reason?.slice(0, 500) || null,
    });
    if (error) throw error;
    revalidatePath(`/inventory/${id}`);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, message: archived ? "Component archived" : "Component restored" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function registerFile(input: z.input<typeof registerFileSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    await authorize("files.upload");
    const v = registerFileSchema.parse(input);
    if (!v.path.startsWith(`components/${v.componentId}/`) || v.path.includes("..")) {
      return { ok: false, error: "Invalid file path." };
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("component_files")
      .insert({
        component_id: v.componentId,
        kind: v.kind,
        storage_path: v.path,
        file_name: v.fileName,
        mime_type: v.mimeType,
        size_bytes: v.size,
      })
      .select("id")
      .single();
    if (error) {
      // Roll back the orphaned upload. The uploader may lack files.delete, so use the
      // service client; the path was validated above to belong to this component.
      await createAdminClient().storage.from(env.bucket()).remove([v.path]).catch(() => undefined);
      throw error;
    }
    revalidatePath(`/inventory/${v.componentId}`);
    return { ok: true, data: { id: data.id as string }, message: "File uploaded" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteFile(fileId: string): Promise<ActionResult> {
  try {
    await authorize("files.delete");
    z.string().uuid().parse(fileId);
    const supabase = await createClient();
    const { data: file, error: readError } = await supabase
      .from("component_files")
      .select("id, component_id, storage_path")
      .eq("id", fileId)
      .single();
    if (readError) throw readError;
    const { error } = await supabase.from("component_files").delete().eq("id", fileId);
    if (error) throw error;
    await supabase.storage.from(env.bucket()).remove([file.storage_path as string]);
    revalidatePath(`/inventory/${file.component_id}`);
    return { ok: true, message: "File deleted" };
  } catch (e) {
    return toActionError(e);
  }
}
