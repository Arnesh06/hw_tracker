"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MASTER_ENTITIES, masterSchemas, type MasterEntity } from "@/lib/validations";
import { toActionError, type ActionResult } from "@/lib/action-utils";

const entitySchema = z.enum(MASTER_ENTITIES);

const PATHS: Record<MasterEntity, string> = {
  categories: "/settings",
  projects: "/projects",
  providers: "/providers",
  vendors: "/vendors",
  locations: "/locations",
};

export async function saveMaster(
  entity: MasterEntity,
  id: string | null,
  values: Record<string, unknown>,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await authorize("masters.manage");
    const e = entitySchema.parse(entity);
    const parsed = masterSchemas[e].parse(values);
    const supabase = await createClient();
    const { data, error } = id
      ? await supabase.from(e).update(parsed).eq("id", z.string().uuid().parse(id)).select("id, name").single()
      : await supabase.from(e).insert(parsed).select("id, name").single();
    if (error) throw error;
    revalidatePath(PATHS[e]);
    revalidatePath("/inventory");
    return { ok: true, data: { id: data.id as string, name: data.name as string }, message: id ? "Changes saved" : "Created" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setMasterActive(entity: MasterEntity, id: string, active: boolean): Promise<ActionResult> {
  try {
    await authorize("masters.manage");
    const e = entitySchema.parse(entity);
    const { error } = await (await createClient())
      .from(e)
      .update({ is_active: active })
      .eq("id", z.string().uuid().parse(id));
    if (error) throw error;
    revalidatePath(PATHS[e]);
    return { ok: true, message: active ? "Reactivated" : "Deactivated" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteMaster(entity: MasterEntity, id: string): Promise<ActionResult> {
  try {
    await authorize("masters.manage");
    const e = entitySchema.parse(entity);
    const { error } = await (await createClient()).from(e).delete().eq("id", z.string().uuid().parse(id));
    if (error) {
      if (error.code === "23503") {
        return { ok: false, error: "This is used by components, so it can't be deleted. Deactivate it instead." };
      }
      throw error;
    }
    revalidatePath(PATHS[e]);
    return { ok: true, message: "Deleted" };
  } catch (err) {
    return toActionError(err);
  }
}
